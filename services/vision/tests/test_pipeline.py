from pathlib import Path
import threading
import time
import wave

import cv2
import pytest
from fastapi.testclient import TestClient

from touchline_vision.narration import Narrator
from touchline_vision.perception import CausalTracker, Detector
from touchline_vision.service import ROOT, create_app


def observation(pts=0, scene="wide", ball=None):
    return {"sourcePtsMs": pts, "observedThroughPtsMs": pts, "scene": scene,
        "players": [{"box": [.1, .1, .2, .5], "confidence": .9} for _ in range(6)], "ball": ball}


def test_unknown_actor_and_outcome_are_not_promoted():
    narrator = Narrator("en")
    event = narrator.consider(observation())
    assert event["actorId"] is None and event["team"] is None
    assert event["type"] == "wide_play"
    assert all(word not in event["text"].lower() for word in ("goal", "scores", "penalty"))
    assert narrator.consider(observation(1000)) is None
    assert narrator.consider({**observation(20000), "players": []}) is None


def test_camera_cut_does_not_create_ball_motion_from_unrelated_views():
    narrator = Narrator("en")
    narrator.consider(observation(ball={"box": [.1, .3, .2, .4], "confidence": .8}))
    event = narrator.consider(observation(10000, "cut", {"box": [.8, .3, .9, .4], "confidence": .8}))
    # No left/right action inferred across a new shot; repeated ball-visible text
    # can be suppressed by the novelty gate.
    assert event is None or event["type"] != "ball_movement"


def test_track_identity_cannot_cross_camera_reset_or_duplicate_within_frame():
    tracker = CausalTracker()
    detection = {"box": [.1, .1, .2, .5], "confidence": .9}
    first = tracker.update([detection], 1)[0]["trackId"]
    same = tracker.update([detection], 2)[0]["trackId"]
    assert first == same
    tracker.reset()
    after = tracker.update([detection, {**detection, "box": [.12, .1, .22, .5]}], 3)
    assert len({item["trackId"] for item in after}) == 2
    assert first not in {item["trackId"] for item in after}


class FakeDetector:
    def __init__(self, *_args, **_kwargs):
        pass

    def detect(self, image):
        return [{"box": [.1, .1, .2, .5], "confidence": .9} for _ in range(6)], None, 1.


class FakeSpeech:
    def voices(self):
        return [{"id": "en-gb", "language": "en"}]

    def synthesize(self, text, language, voice, output_path):
        with wave.open(str(output_path), "wb") as stream:
            stream.setparams((1, 2, 22050, 0, "NONE", "not compressed"))
            stream.writeframes(b"\0"*4410)
        return {"voice": voice or "en-gb", "language": language, "durationMs": 100}


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.delenv("TOUCHLINE_SERVICE_TOKEN", raising=False)
    monkeypatch.setattr("touchline_vision.service.Detector", FakeDetector)
    model = tmp_path / "test-detector.onnx"
    model.touch()
    instance = create_app(tmp_path / "data", model)
    instance.state.manager.speech = FakeSpeech()
    yield instance
    for cancel in instance.state.manager.cancellations.values():
        cancel.set()
    instance.state.manager.pool.shutdown(wait=True)


def wait_for_finish(client, session_id, headers=None):
    deadline = time.monotonic()+10
    while time.monotonic() < deadline:
        snapshot = client.get(f"/sessions/{session_id}", headers=headers).json()
        if snapshot["status"] in ("completed", "cancelled", "failed"):
            return snapshot
        time.sleep(.02)
    raise AssertionError("Analysis did not settle in ten seconds")


def test_raw_video_contract_exports_and_cross_owner_boundaries(app):
    client = TestClient(app)
    source = client.get("/sources").json()["sources"][0]
    owner = {"X-Touchline-Owner": "operator-a"}
    created = client.post("/sessions", headers=owner, json={"sourceId": source["id"], "maxSeconds": 2, "pace": False})
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]
    assert client.get(f"/sessions/{session_id}", headers={"X-Touchline-Owner": "operator-b"}).status_code == 404
    assert client.delete(f"/sessions/{session_id}", headers={"X-Touchline-Owner": "operator-b"}).status_code == 404
    result = wait_for_finish(client, session_id, owner)
    assert result["status"] == "completed", result
    assert result["progress"]["frames"] == 2
    assert len(result["events"]) == 1
    assert all(o["sourcePtsMs"] == o["observedThroughPtsMs"] for o in result["observations"])
    assert result["utterances"][0]["sourcePtsMs"] >= result["events"][0]["observedThroughPtsMs"]
    captions = client.get(f"/sessions/{session_id}/captions.vtt", headers=owner)
    assert captions.status_code == 200 and captions.text.startswith("WEBVTT")
    audio = client.get(f"/sessions/{session_id}/commentary.wav", headers=owner)
    assert audio.status_code == 200 and audio.content.startswith(b"RIFF")
    assert client.get(f"/sessions/{session_id}/audio/../../sessions.sqlite3", headers=owner).status_code == 404
    media = client.get(f"/sessions/{session_id}/media", headers={**owner, "Range": "bytes=0-15"})
    assert media.status_code == 206 and len(media.content) == 16


def test_validation_and_cross_origin_writes(app):
    client = TestClient(app)
    assert client.post("/sources", files={"file": ("payload.py", b"not video", "text/plain")}).status_code == 415
    assert client.post("/sources", files={"file": ("payload.mp4", b"not video", "video/mp4")}).status_code == 422
    assert client.post("/sessions", json={"sourceId": "unknown", "sampleFps": 1000}).status_code == 422
    assert client.post("/sessions", json={"sourceId": "unknown", "url": "http://169.254.169.254"}).status_code == 422
    assert client.get("/health", headers={"Origin": "https://attacker.example"}).status_code == 403


def test_uploaded_source_is_not_visible_to_another_owner(app):
    client = TestClient(app)
    sample = ROOT / "apps/touchline/public/demo/football.mp4"
    with sample.open("rb") as stream:
        uploaded = client.post("/sources", headers={"X-Touchline-Owner": "a"}, files={"file": ("my-match.mp4", stream, "video/mp4")})
    assert uploaded.status_code == 201
    source_id = uploaded.json()["source"]["id"]
    others = client.get("/sources", headers={"X-Touchline-Owner": "b"}).json()["sources"]
    assert source_id not in [source["id"] for source in others]
    denied = client.post("/sessions", headers={"X-Touchline-Owner": "b"}, json={"sourceId": source_id})
    assert denied.status_code == 404


def test_service_token_is_required_when_configured(app, monkeypatch):
    monkeypatch.setenv("TOUCHLINE_SERVICE_TOKEN", "test-only-token")
    client = TestClient(app)
    assert client.get("/health").status_code == 401
    assert client.get("/health", headers={"Authorization": "Bearer test-only-token"}).status_code == 200


def test_missing_weights_do_not_create_a_successful_fake_session(tmp_path):
    instance = create_app(tmp_path, tmp_path / "missing.onnx")
    with TestClient(instance) as client:
        source_id = client.get("/sources").json()["sources"][0]["id"]
        assert client.get("/health").json()["model"]["ready"] is False
        assert client.post("/sessions", json={"sourceId": source_id}).status_code == 503
    instance.state.manager.pool.shutdown(wait=True)


def test_real_pinned_model_on_real_licensed_football():
    path = ROOT / "artifacts/models/rfdetr-nano-int8.onnx"
    if not path.exists():
        pytest.skip("Run the setup command to download the pinned model for this integration check.")
    cap = cv2.VideoCapture(str(ROOT / "apps/touchline/public/demo/football.mp4"))
    ok, image = cap.read()
    cap.release()
    assert ok
    players, ball, elapsed = Detector(path).detect(image)
    assert len(players) >= 1
    assert elapsed > 0
    assert all(0 <= value <= 1 for item in players for value in item["box"])
    assert ball is None or 0 <= ball["confidence"] <= 1
