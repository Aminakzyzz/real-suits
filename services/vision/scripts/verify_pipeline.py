"""Run actual inference and speech through the local API; never inject labels.

Requires the service to be running and the pinned model/voice installed. A short
sample proves integration only; it is not an event-accuracy benchmark.
"""
from __future__ import annotations
import argparse
import io
import json
import os
from pathlib import Path
import time
from urllib.parse import urlparse
import wave

import httpx


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8788")
    parser.add_argument("--app-proxy", action="store_true", help="Use the local dev app's authenticated /api/vision proxy")
    parser.add_argument("--source", default="inter-ajax-u19-2012")
    parser.add_argument("--voice", default="piper-en")
    parser.add_argument("--output", type=Path, default=Path(".runtime/verification"))
    args = parser.parse_args()
    address = urlparse(args.base_url)
    if args.app_proxy and address.hostname not in ("localhost", "127.0.0.1", "::1"):
        parser.error("The simulated sign-in check is limited to a local development app.")
    prefix = "/api/vision" if args.app_proxy else ""
    headers = {}
    if not args.app_proxy and os.environ.get("TOUCHLINE_SERVICE_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['TOUCHLINE_SERVICE_TOKEN']}"
    with httpx.Client(base_url=args.base_url, timeout=30, headers=headers) as client:
        if args.app_proxy:
            client.get("/signin-with-chatgpt?return_to=/", follow_redirects=True).raise_for_status()
        def get(path):
            response = client.get(prefix+path)
            response.raise_for_status()
            return response
        health = get("/health").json()
        if not health["model"]["ready"]:
            raise RuntimeError("Install the pinned detector before running verification.")
        source = next(item for item in get("/sources").json()["sources"] if item["id"] == args.source)
        response = client.post(prefix+"/sessions", json={"sourceId": source["id"], "language": "en", "voice": args.voice,
            "sampleFps": 1, "pace": True, "maxSeconds": 30})
        response.raise_for_status()
        snapshot = response.json()
        started = time.monotonic()
        while snapshot["status"] not in ("completed", "cancelled", "failed"):
            if time.monotonic()-started > 90:
                client.delete(prefix+f"/sessions/{snapshot['id']}")
                raise TimeoutError("Analysis did not finish within the short-clip verification budget.")
            time.sleep(.5)
            snapshot = get(f"/sessions/{snapshot['id']}").json()
        assert snapshot["status"] == "completed", snapshot.get("error")
        assert snapshot["progress"]["frames"] > 0 and snapshot["events"] and snapshot["utterances"]
        assert all(o["sourcePtsMs"] == o["observedThroughPtsMs"] for o in snapshot["observations"])
        assert all(u["voice"] == args.voice for u in snapshot["utterances"])
        audio = get(f"/sessions/{snapshot['id']}/commentary.wav").content
        captions = get(f"/sessions/{snapshot['id']}/captions.vtt").text
        assert captions.startswith("WEBVTT") and "-->" in captions
        with wave.open(io.BytesIO(audio)) as stream:
            rate = stream.getframerate()
            duration = stream.getnframes()/rate
            assert stream.getnchannels() == 1 and stream.getsampwidth() == 2
        assert abs(duration-snapshot["progress"]["durationMs"]/1000) <= 1/rate
        args.output.mkdir(parents=True, exist_ok=True)
        # Do not store request headers, credentials or the owner identifier.
        snapshot.pop("ownerId", None)
        evidence = {"checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "scope": "Actual paced short-clip inference/speech/export integration; no football accuracy claim.",
            "session": snapshot, "audioSeconds": duration, "sampleRate": rate, "captionBytes": len(captions.encode()), "wallSeconds": round(time.monotonic()-started, 2)}
        (args.output/"full-pipeline.json").write_text(json.dumps(evidence, indent=2)+"\n")
        (args.output/"full-pipeline.wav").write_bytes(audio)
        (args.output/"full-pipeline.vtt").write_text(captions)
        print(json.dumps({"status": snapshot["status"], "frames": snapshot["progress"]["frames"], "ballFrames": sum(o["ball"] is not None for o in snapshot["observations"]),
            "utterances": len(snapshot["utterances"]), "audioSeconds": duration, "metrics": snapshot["metrics"], "evidence": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
