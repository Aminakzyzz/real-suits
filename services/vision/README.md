# Touchline local vision service

This optional CPU service decodes authorized footage in order, runs a pinned
RF-DETR detector, maintains simple IoU track associations, generates conservative
visual descriptions and produces local WAV narration. It does not identify
players or confirm goals, passes, referee decisions or scores.

The browser studio also has a standalone on-device mode; it does not need this
service. The service adds durable sessions, uploads and downloadable voice audio.

## Setup

Requirements: Python 3.11 or 3.12, FFmpeg/FFprobe, and `espeak-ng` for the baseline
EN/ES/FR voices. From this directory:

```sh
uv venv --python 3.11
uv pip install --python .venv/bin/python -e '.[test]'
.venv/bin/python -m touchline_vision.cli setup
.venv/bin/python -m touchline_vision.cli serve --port 8788
```

For the optional free neural English voice:

```sh
uv pip install --python .venv/bin/python -e '.[neural]'
.venv/bin/python -m touchline_vision.neural_speech setup
```

Select **English · LJ Speech neural** in the studio's local-service voice list.
Default English, Spanish and French still use eSpeak unless a specific neural
voice is selected. See `../../docs/product/free-speech.md` for exact provenance.

Start the web app separately with `npm run dev` from `apps/touchline`. Choose
**Local service**, use the local sign-in link if needed, check the connection and
start a bundled sample or upload permitted footage. The default API is loopback
only at port 8788. Source videos and generated audio remain local in this mode.

## API

- `GET /health`, `GET /sources`, multipart `POST /sources` (`file`).
- `POST /sessions` with `sourceId`, `language`, optional `voice`, `sampleFps`,
  `pace` and `maxSeconds`; GET/DELETE `/sessions/{id}`.
- GET `/sessions/{id}/media`, `/audio/{utteranceId}`, `/captions.vtt`,
  `/commentary.wav`.

The web app proxies these under `/api/vision/` after sign-in. It supplies the owner
ID; clients cannot choose an upstream URL. Do not expose the service directly as
a production multi-user API without deploying and reviewing its authentication,
resource limits, retention and lifecycle behavior.

Optional environment variables: `TOUCHLINE_MODEL`, `TOUCHLINE_DATA_DIR`, and
`TOUCHLINE_SERVICE_TOKEN`. For a separately hosted service configure the web
Worker's `TOUCHLINE_VISION_URL` and matching `TOUCHLINE_SERVICE_TOKEN` using the
hosting secret mechanism. Never put tokens in source files or browser settings.

Models and runtime data are ignored. No paid inference endpoint is used.
The base model is approximately 28 MB; the optional voice is approximately 63.5 MB.
The CLI downloads pinned model revisions. There is no automatic training step.

## Verification

```sh
PYTHONPATH=. .venv/bin/python -m pytest -q
```

Tests cover narration boundaries, track reset, media validation, ownership,
authorization, exports, real speech and optional real inference/voice integration.
Tests that need absent model files skip with an explanation. Passing protocol
tests does not establish football-event accuracy or full-match reliability.
