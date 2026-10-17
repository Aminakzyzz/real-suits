from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from copy import deepcopy
from pathlib import Path
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import threading
import time
import uuid
import wave

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

from . import __version__
from .narration import Narrator
from .perception import Detector, MODEL_REVISION, Perception
from .speech import SpeechEngine, SpeechError
from .neural_speech import NeuralSpeechEngine
from .identity import IdentityResolver, MatchRoster

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DATA = Path(__file__).resolve().parents[1] / ".runtime"


def probe(path: Path) -> dict:
    try:
        result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", str(path)], capture_output=True, text=True, timeout=20, check=True)
        data = json.loads(result.stdout)
        video = next(s for s in data["streams"] if s.get("codec_type") == "video")
        duration = float(data["format"]["duration"])
        if not 0 < duration <= 4*3600 or not 0 < video["width"] <= 7680 or not 0 < video["height"] <= 4320:
            raise ValueError("Unsupported duration or frame size")
        return {"durationMs": round(duration*1000), "width": video["width"], "height": video["height"]}
    except (OSError, ValueError, KeyError, StopIteration, subprocess.SubprocessError) as error:
        raise ValueError("Choose a valid video up to four hours and 8K resolution.") from error


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sourceId: str = Field(min_length=1, max_length=100)
    language: str = Field(default="en", pattern="^(en|es|fr)$")
    voice: str | None = Field(default=None, max_length=40)
    sampleFps: float = Field(default=1, ge=.25, le=5)
    pace: bool = True
    maxSeconds: int = Field(default=60, ge=1, le=7200)
    roster: MatchRoster | None = None


class SessionManager:
    def __init__(self, directory: Path, model_path: Path):
        self.directory, self.model_path = directory.resolve(), model_path.resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.database = self.directory / "sessions.sqlite3"
        with self.connect() as db:
            db.execute("CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, payload TEXT NOT NULL, path TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
            # A process restart must never report a crashed worker as still running.
            for row in db.execute("SELECT id,payload FROM sessions").fetchall():
                snapshot = json.loads(row[1])
                if snapshot["status"] in ("running", "queued"):
                    snapshot.update(status="failed", error="The inference process restarted. Start a new session to resume analysis.")
                    db.execute("UPDATE sessions SET payload=? WHERE id=?", (json.dumps(snapshot), row[0]))
        self.lock = threading.RLock()
        self.pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="touchline")
        self.cancellations: dict[str, threading.Event] = {}
        self.speech = NeuralSpeechEngine()
        self.detector: Detector | None = None
        self.import_samples()

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.database, timeout=10)
        try:
            db.execute("PRAGMA journal_mode=WAL")
            with db:
                yield db
        finally:
            db.close()

    def import_samples(self):
        directory = ROOT / "apps/touchline/public/demo"
        # Reconcile every bundled manifest on restart. In particular, replacing
        # the default clip must not leave an old source ID pointing at its bytes.
        manifests = sorted(directory.glob("*source.json"))
        for manifest in manifests:
            source = json.loads(manifest.read_text())
            media_url = source.get("mediaUrl", "")
            if not media_url.startswith("/demo/"):
                continue
            sample = (directory / media_url.removeprefix("/demo/")).resolve()
            if sample.is_relative_to(directory.resolve()) and sample.is_file():
                self.add_source(sample, source)

    def add_source(self, path: Path, source: dict) -> dict:
        source = {**source, **probe(path)}
        with path.open("rb") as media:
            source["sha256"] = hashlib.file_digest(media, "sha256").hexdigest()
        with self.lock if hasattr(self, "lock") else threading.RLock():
            with self.connect() as db:
                db.execute("INSERT OR REPLACE INTO sources VALUES(?,?,?)", (source["id"], json.dumps(source), str(path.resolve())))
        return source

    def source(self, source_id: str) -> tuple[dict, Path]:
        with self.connect() as db:
            row = db.execute("SELECT payload,path FROM sources WHERE id=?", (source_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Source not found.")
        return json.loads(row[0]), Path(row[1])

    def sources(self) -> list[dict]:
        with self.connect() as db:
            return [json.loads(row[0]) for row in db.execute("SELECT payload FROM sources ORDER BY id")]

    def save(self, snapshot: dict):
        with self.lock, self.connect() as db:
            db.execute("INSERT OR REPLACE INTO sessions VALUES(?,?)", (snapshot["id"], json.dumps(snapshot)))

    def get(self, session_id: str) -> dict:
        with self.lock, self.connect() as db:
            row = db.execute("SELECT payload FROM sessions WHERE id=?", (session_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Analysis session not found.")
        return json.loads(row[0])

    def create(self, settings: Settings, owner_id: str = "local") -> dict:
        if not self.model_path.is_file():
            raise HTTPException(503, "Download the detector first: python -m touchline_vision.cli setup")
        source, path = self.source(settings.sourceId)
        if source.get("kind") == "upload" and source.get("ownerId", "local") != owner_id:
            raise HTTPException(404, "Source not found.")
        if settings.voice is not None and not any(v["id"] == settings.voice and v["language"] == settings.language for v in self.speech.voices()):
            raise HTTPException(422, "Select a voice matching the commentary language.")
        with self.lock:
            # One active job bounds memory, CPU usage and audio queues.
            if any(not event.is_set() for event in self.cancellations.values()):
                raise HTTPException(409, "An analysis is already running. Stop it before starting another.")
            session_id = uuid.uuid4().hex
            snapshot = {
                "id": session_id, "ownerId": owner_id, "status": "queued", "source": source,
                "settings": settings.model_dump(exclude={"sourceId"}),
                "progress": {"processedMs": 0, "durationMs": min(source["durationMs"], settings.maxSeconds*1000), "frames": 0},
                "observations": [], "events": [], "utterances": [],
                "metrics": {"inferenceP50Ms": 0, "inferenceP95Ms": 0, "realTimeFactor": 0, "frames": 0, "events": 0}, "error": None,
            }
            self.save(snapshot)
            cancel = threading.Event()
            self.cancellations[session_id] = cancel
            self.pool.submit(self.run, deepcopy(snapshot), path, cancel)
            return snapshot

    def cancel(self, session_id: str):
        snapshot = self.get(session_id)
        cancel = self.cancellations.get(session_id)
        if cancel:
            cancel.set()
        return snapshot

    def run(self, snapshot: dict, path: Path, cancel: threading.Event):
        cap = cv2.VideoCapture(str(path))
        work = self.directory / snapshot["id"]
        work.mkdir(exist_ok=True)
        inference_times: list[float] = []
        try:
            if not cap.isOpened():
                raise ValueError("The video could not be decoded.")
            if self.detector is None:
                self.detector = Detector(self.model_path)
            perception, narrator = Perception(self.detector), Narrator(snapshot["settings"]["language"])
            roster = snapshot["settings"].get("roster")
            identities = IdentityResolver(MatchRoster.model_validate(roster)) if roster else None
            fps = cap.get(cv2.CAP_PROP_FPS)
            if not 0 < fps <= 240:
                raise ValueError("The video has an unsupported frame rate.")
            snapshot["status"] = "running"
            self.save(snapshot)
            started = time.monotonic()
            next_sample = 0.
            frame_index = 0
            limit = snapshot["progress"]["durationMs"]
            with (work / "observations.jsonl").open("w") as log:
                while not cancel.is_set():
                    ok, image = cap.read()
                    if not ok:
                        break
                    # Decode in order; no seeking ahead or whole-video interpolation.
                    actual_pts = cap.get(cv2.CAP_PROP_POS_MSEC)
                    pts = round(actual_pts) if np.isfinite(actual_pts) and (actual_pts > 0 or frame_index == 0) else round(frame_index*1000/fps)
                    frame_index += 1
                    if pts >= limit:
                        break
                    if pts+1 < next_sample:
                        continue
                    next_sample = pts + 1000/snapshot["settings"]["sampleFps"]
                    if snapshot["settings"]["pace"]:
                        wait = started + pts/1000-time.monotonic()
                        if wait > 0 and cancel.wait(wait):
                            break
                    sequence = snapshot["progress"]["frames"]+1
                    observation = perception.observe(image, sequence, pts)
                    if identities:
                        identity_started = time.perf_counter()
                        observation = identities.observe(image, observation)
                        observation["identityMs"] = round((time.perf_counter()-identity_started)*1000, 2)
                    observation["modelRevision"] = MODEL_REVISION
                    log.write(json.dumps(observation)+"\n")
                    log.flush()
                    inference_times.append(observation["inferenceMs"])
                    snapshot["observations"] = (snapshot["observations"]+[observation])[-120:]
                    snapshot["progress"].update(processedMs=pts, frames=sequence)
                    event = narrator.consider(observation)
                    if event is not None and not cancel.is_set():
                        snapshot["events"].append(event)
                        utterance_id = uuid.uuid4().hex
                        try:
                            metadata = self.speech.synthesize(event["text"], snapshot["settings"]["language"], snapshot["settings"]["voice"], work / f"{utterance_id}.wav")
                            snapshot["utterances"].append({"id": utterance_id, "eventId": event["id"], "sourcePtsMs": pts,
                                "text": event["text"], "language": metadata["language"], "voice": metadata["voice"], "durationMs": metadata["durationMs"],
                                "audioUrl": f"/api/vision/sessions/{snapshot['id']}/audio/{utterance_id}"})
                        except SpeechError as error:
                            snapshot["speechWarning"] = str(error)
                    elapsed = max(.001, time.monotonic()-started)
                    snapshot["metrics"] = {"inferenceP50Ms": round(float(np.percentile(inference_times, 50)), 1), "inferenceP95Ms": round(float(np.percentile(inference_times, 95)), 1),
                        "realTimeFactor": round(elapsed/max(.001, (pts+1000/snapshot["settings"]["sampleFps"])/1000), 3), "frames": sequence, "events": len(snapshot["events"])}
                    self.save(snapshot)
            snapshot["status"] = "cancelled" if cancel.is_set() else "completed"
            if snapshot["status"] == "completed":
                snapshot["progress"]["processedMs"] = limit
        except Exception as error:
            snapshot.update(status="failed", error=f"{type(error).__name__}: {error}")
        finally:
            cap.release()
            self.save(snapshot)
            cancel.set()

    def caption(self, snapshot: dict) -> str:
        def stamp(ms):
            seconds, millis = divmod(max(0, int(ms)), 1000)
            minutes, seconds = divmod(seconds, 60)
            hours, minutes = divmod(minutes, 60)
            return f"{hours:02}:{minutes:02}:{seconds:02}.{millis:03}"
        captions = ["WEBVTT", ""]
        for u in snapshot["utterances"]:
            captions.extend([f"{stamp(u['sourcePtsMs'])} --> {stamp(u['sourcePtsMs']+u['durationMs'])}", u["text"].replace("-->", "→"), ""])
        return "\n".join(captions)

    def audio_export(self, snapshot: dict) -> Path:
        work = self.directory / snapshot["id"]
        output = work / "commentary.wav"
        # Export only settled jobs; otherwise repeated reads could race synthesis.
        if snapshot["status"] not in ("completed", "cancelled", "failed"):
            raise HTTPException(409, "Stop or finish analysis before exporting narration.")
        sample_rate = 22050
        duration_ms = min(snapshot["progress"]["durationMs"], snapshot["settings"]["maxSeconds"]*1000)
        with wave.open(str(output), "wb") as destination:
            destination.setparams((1, 2, sample_rate, 0, "NONE", "not compressed"))
            written = 0
            total = round(duration_ms*sample_rate/1000)
            def silence(frames):
                nonlocal written
                while frames > 0:
                    chunk = min(frames, sample_rate)
                    destination.writeframes(b"\0"*(chunk*2))
                    frames -= chunk
                    written += chunk
            for utterance in sorted(snapshot["utterances"], key=lambda u: u["sourcePtsMs"]):
                start = round(utterance["sourcePtsMs"]*sample_rate/1000)
                if start >= total:
                    break
                silence(max(0, start-written))
                with wave.open(str(work / f"{utterance['id']}.wav"), "rb") as source:
                    if source.getframerate() != sample_rate or source.getsampwidth() != 2 or source.getnchannels() != 1:
                        raise HTTPException(500, "Unexpected speech audio format.")
                    # A rare overlap drops the superseded prefix instead of mixing voices.
                    source.setpos(min(source.getnframes(), max(0, written-start)))
                    while written < total:
                        chunk = source.readframes(min(sample_rate, total-written))
                        if not chunk:
                            break
                        destination.writeframes(chunk)
                        written += len(chunk)//2
            silence(max(0, total-written))
        return output


def create_app(directory: Path | None = None, model_path: Path | None = None) -> FastAPI:
    manager = SessionManager(directory or Path(os.environ.get("TOUCHLINE_DATA_DIR", str(DEFAULT_DATA))), model_path or Path(os.environ.get("TOUCHLINE_MODEL", str(ROOT / "artifacts/models/rfdetr-nano-int8.onnx"))))
    app = FastAPI(title="Touchline local vision service", version=__version__)
    app.state.manager = manager

    def owner(request: Request) -> str:
        return request.headers.get("x-touchline-owner", "local")[:200]

    def owned(session_id: str, request: Request) -> dict:
        snapshot = manager.get(session_id)
        if snapshot.get("ownerId", "local") != owner(request):
            raise HTTPException(404, "Analysis session not found.")
        return snapshot

    @app.middleware("http")
    async def private_service(request: Request, call_next):
        token = os.environ.get("TOUCHLINE_SERVICE_TOKEN")
        if token:
            import secrets
            if not secrets.compare_digest(request.headers.get("authorization", ""), f"Bearer {token}"):
                return PlainTextResponse("Service authorization required.", status_code=401)
        elif request.client and request.client.host not in ("127.0.0.1", "::1", "testclient"):
            return PlainTextResponse("Configure a service token before exposing this service.", status_code=403)
        origin = request.headers.get("origin")
        if origin:
            return PlainTextResponse("Use the application proxy to access the local service.", status_code=403)
        return await call_next(request)

    @app.get("/health")
    def health():
        return {"status": "ok", "version": __version__, "model": {"ready": manager.model_path.is_file(), "name": "RF-DETR Nano · COCO · int8", "revision": MODEL_REVISION},
            "speech": {"ready": bool(shutil.which("espeak-ng")) or any(v["provider"] == "piper" for v in manager.speech.voices()), "voices": manager.speech.voices(), "engine": "eSpeak NG + optional Piper"},
            "capabilities": ["generic-person-detection", "sports-ball-detection", "causal-observation-narration", "wav-export"],
            "identity": {"available": bool(shutil.which("tesseract")), "experimental": True, "requiresRoster": True,
                "method": "configured kit colour and at least three agreeing jersey OCR readings"},
            "limitations": ["Roster identity is experimental and has no validated football accuracy; no rule-event recognition or automatic scoring.", "Simple IoU association; camera motion and occlusion can change tracks."]}

    @app.get("/sources")
    def sources(request: Request):
        return {"sources": [s for s in manager.sources() if s.get("kind") != "upload" or s.get("ownerId", "local") == owner(request)]}

    @app.post("/sources", status_code=201)
    async def upload(request: Request, file: UploadFile = File()):
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in (".mp4", ".webm", ".mov", ".mkv"):
            raise HTTPException(415, "Choose MP4, WebM, MOV or MKV footage.")
        source_id = uuid.uuid4().hex
        uploads = manager.directory / "uploads"
        uploads.mkdir(exist_ok=True)
        target = uploads / f"{source_id}{suffix}"
        try:
            size = 0
            with target.open("wb") as destination:
                while chunk := await file.read(1024*1024):
                    size += len(chunk)
                    if size > 256*1024*1024:
                        raise HTTPException(413, "Local upload limit is 256 MB. Use a shorter clip.")
                    destination.write(chunk)
            source = manager.add_source(target, {"id": source_id, "ownerId": owner(request), "name": Path(file.filename or "Uploaded footage").name[:150], "kind": "upload", "provenance": {"license": "User-provided footage", "attribution": "Uploaded by this local operator; use within your permission."}})
        except Exception as error:
            target.unlink(missing_ok=True)
            if isinstance(error, ValueError):
                raise HTTPException(422, str(error)) from error
            raise
        finally:
            await file.close()
        return {"source": source}

    @app.post("/sessions", status_code=201)
    def start(settings: Settings, request: Request):
        return manager.create(settings, owner(request))

    @app.get("/sessions/{session_id}")
    def get_session(session_id: str, request: Request):
        return owned(session_id, request)

    @app.delete("/sessions/{session_id}")
    def stop_session(session_id: str, request: Request):
        owned(session_id, request)
        return manager.cancel(session_id)

    @app.get("/sessions/{session_id}/media")
    def media(session_id: str, request: Request):
        snapshot = owned(session_id, request)
        _, path = manager.source(snapshot["source"]["id"])
        return FileResponse(path)

    @app.get("/sessions/{session_id}/audio/{utterance_id}")
    def audio(session_id: str, utterance_id: str, request: Request):
        snapshot = owned(session_id, request)
        if not any(u["id"] == utterance_id for u in snapshot["utterances"]):
            raise HTTPException(404, "Narration segment not found.")
        return FileResponse(manager.directory / session_id / f"{utterance_id}.wav", media_type="audio/wav")

    @app.get("/sessions/{session_id}/captions.vtt")
    def captions(session_id: str, request: Request):
        return PlainTextResponse(manager.caption(owned(session_id, request)), media_type="text/vtt", headers={"Content-Disposition": 'attachment; filename="touchline-captions.vtt"'})

    @app.get("/sessions/{session_id}/commentary.wav")
    def commentary_audio(session_id: str, request: Request):
        return FileResponse(manager.audio_export(owned(session_id, request)), media_type="audio/wav", filename="touchline-commentary.wav")

    return app
