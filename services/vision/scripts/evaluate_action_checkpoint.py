"""Run actual pinned action inference; keep research predictions out of scoring.

Uses sequential decoding. Rolling mode calls the model only with frames already
observed; batch mode is explicitly an offline diagnostic. No match title, source
audio, manual events, final score or player names are inputs to the predictor.
"""
from __future__ import annotations

import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
import resource
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/vision"))

import cv2
import numpy as np

from research.osl_action_model import OSLActionModel, MODEL_REPO, MODEL_REVISION, MODEL_SHA256, SOURCE_REVISION, GSM_SHA256
from touchline_vision.actions import BufferedActionProposer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "apps/touchline/public/demo/football.mp4")
    parser.add_argument("--model", type=Path, default=ROOT / "artifacts/models/osl-snbas2025-e2e.pt")
    parser.add_argument("--source-checkout", type=Path, default=ROOT / "artifacts/research/opensportslib")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/research/action-rolling.json")
    parser.add_argument("--mode", choices=["rolling", "batch-diagnostic"], default="rolling")
    parser.add_argument("--sample-fps", type=float, default=2.)
    parser.add_argument("--max-seconds", type=int, default=30)
    parser.add_argument("--min-frames", type=int, default=20)
    parser.add_argument("--update-ms", type=int, default=4000)
    parser.add_argument("--confirmation-ms", type=int, default=2000)
    parser.add_argument("--threshold", type=float, default=.6)
    parser.add_argument("--pace", action="store_true")
    args = parser.parse_args()
    if not 0 < args.sample_fps <= 25 or not 1 <= args.max_seconds <= 120:
        parser.error("Use 0–25 sample FPS and 1–120 seconds for this bounded experiment.")
    if args.pace and args.mode != "rolling":
        parser.error("Pacing is supported only in rolling mode.")
    with args.source.open("rb") as stream:
        source_hash = hashlib.file_digest(stream, "sha256").hexdigest()
    model = OSLActionModel(args.model, args.source_checkout)

    class Recorder:
        labels, revision = model.labels, model.revision

        def predict(self, frames):
            self.scores = model.predict(frames)
            return self.scores

    recorder = Recorder()
    proposer = BufferedActionProposer(recorder, min_frames=args.min_frames,
        sample_period_ms=round(1000/args.sample_fps), update_period_ms=args.update_ms,
        confirmation_ms=args.confirmation_ms, nms_ms=min(1000, args.confirmation_ms), threshold=args.threshold)
    report = {
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scope": "Research inference only; no held-out accuracy, commercial clearance or live throughput claim.",
        "mode": args.mode, "paced": args.pace, "sourceSha256": source_hash,
        "model": {"repo": MODEL_REPO, "revision": MODEL_REVISION, "sha256": MODEL_SHA256,
                  "sourceRevision": SOURCE_REVISION, "gsmSha256": GSM_SHA256, "device": "cpu", "threads": 2,
                  "architecture": "reconstructed regnety_008 + external GSM + bidirectional GRU",
                  "shortWindowPadding": "normalized zeros to 100; truncate features before GRU"},
        "settings": {"sampleFps": args.sample_fps, "windowFrames": 100, "minFrames": args.min_frames,
                     "updateMs": args.update_ms, "confirmationMs": args.confirmation_ms, "threshold": args.threshold},
        "windows": [], "proposals": [], "completed": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)

    def save():
        temporary = args.output.with_suffix(".partial.json")
        temporary.write_text(json.dumps(report, indent=2)+"\n")
        temporary.replace(args.output)

    def record_window(times, scores, elapsed):
        rows = [{"sourcePtsMs": t, "label": model.labels[int(row.argmax())],
                 "score": float(row.max()), "probabilities": [float(p) for p in row]} for t, row in zip(times, scores)]
        report["windows"].append({"observedThroughPtsMs": times[-1], "receptiveStartPtsMs": times[0],
                                  "inferenceMs": round(elapsed, 2), "rows": rows})
        save()

    capture = cv2.VideoCapture(str(args.source))
    frames: deque = deque(maxlen=100)
    next_batch_pts = 0
    started = time.monotonic()
    decoded, last_pts = 0, 0
    try:
        if not capture.isOpened():
            raise RuntimeError("The source could not be decoded.")
        source_fps = capture.get(cv2.CAP_PROP_FPS)
        if not 0 < source_fps <= 240:
            raise RuntimeError("Invalid source frame rate.")
        while True:
            ok, image = capture.read()
            if not ok:
                break
            actual = capture.get(cv2.CAP_PROP_POS_MSEC)
            pts = round(actual) if actual > 0 or decoded == 0 else round(decoded*1000/source_fps)
            decoded += 1
            if pts >= args.max_seconds*1000:
                break
            last_pts = pts
            if args.pace:
                remaining = started+pts/1000-time.monotonic()
                if remaining > 0:
                    time.sleep(remaining)
            if args.mode == "rolling":
                previous_count = proposer.inference_count
                proposals = proposer.observe(model.preprocess(image), pts)
                report["proposals"].extend(p.to_dict() for p in proposals)
                if proposer.inference_count != previous_count:
                    record_window([t for t, _ in proposer.frames], recorder.scores, proposer.last_inference_ms)
            elif pts >= next_batch_pts:
                frames.append((pts, model.preprocess(image)))
                period = round(1000/args.sample_fps)
                next_batch_pts += max(1, (pts-next_batch_pts)//period+1)*period
        if args.mode == "batch-diagnostic" and frames:
            before = time.monotonic()
            scores = model.predict(np.stack([frame for _, frame in frames]))
            record_window([t for t, _ in frames], scores, (time.monotonic()-before)*1000)
        report.update(completed=True, decodedFrames=decoded, observedThroughPtsMs=last_pts,
                      wallSeconds=round(time.monotonic()-started, 3), maxRssKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
        save()
    finally:
        capture.release()
    print(json.dumps({key: report[key] for key in ("completed", "mode", "wallSeconds", "maxRssKiB")}
        | {"windows": len(report["windows"]), "proposals": report["proposals"], "evidence": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
