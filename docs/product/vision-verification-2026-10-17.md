# Vision studio: earlier production verification and deployment

**Later release:** see [roster integration, actual hosted QA and current publication](roster-integration-verification-2026-10-17.md). The IDs and pending hosted-check statements below describe the earlier baseline.

Updated 17 October 2026, Europe/Berlin. This records progress **after** the full
Claude handoff checkpoint. The new studio is now deployed, and the previously
pending production inference and local neural-audio integration checks passed.

## Published application

**https://touchline-matchday-desk.socialpony16.chatgpt.site**

Access remains owner-private. The native Sites deployment returned `succeeded`;
sharing permissions were not broadened. The hosted studio's **This browser** mode
uses actual on-device inference. The optional Python service is a separate local
process and was not deployed into the Worker.

- Platform source: `dacbc6c5e2332c5a297825ea86bc15fa8cf4c791`.
- Version: `appgprj_6ad2c952011881918cf3fe71b87fdfab~appgver_a021e83e2a4081918c046b28386ae6d9`.
- Deployment: `appgdep_6ad365f643bc8191993ccf8da1cc82ea`.
- Returned deployment timestamp: `2026-10-17T12:11:58.185903+00:00`.

Exact evidence, including archive hash, is in
[the verification record](vision-validation-evidence-2026-10-17.json).
Native deployment success verifies publication; the functional browser checks
below ran against the matching local production Worker. The authenticated hosted
page itself was not separately exercised in a browser in this continuation.

## Actual production Worker browser check

The final app was rebuilt, served using Wrangler at port 5174 and tested in
headless Chrome with the real licensed default clip and pinned ONNX model.

The check verified that the page and video loaded, real detection rectangles
appeared, an observation produced narration dispatch, captions downloaded as
nonempty WebVTT, and the producer desk still accepted a confirmed goal. Anonymous
match and vision APIs returned 401. The successful run captured nine detection
boxes and reported no page errors. Speech dispatch was instrumented; this does
not measure audible device-voice quality.

Reproduce after starting the production Worker:

```sh
# From apps/touchline; run the build first if source changed.
npm run start -- --port 5174
# In another terminal:
node tests/production-smoke.mjs
```

The script now tests the new studio as well as `/desk`; the older manual-only
production smoke was replaced. A different base URL can be set through
`TOUCHLINE_TEST_URL`.

## Real video → inference → neural speech → exports

The complete 16.25-second Inter–Ajax U19 sample was processed at paced 1× through
the authenticated local app proxy. The run used the actual RF-DETR CPU model and
the optional `piper-en` voice, rather than a detector fixture or prewritten log.

The repeatable verifier completed with:

- 17 sampled frames and ball candidates in four frames.
- One generated observation and one actual neural speech segment.
- Inference p50 241.7 ms, p95 328.9 ms on this machine in this run.
- Exported 22,050 Hz mono PCM WAV and nonempty WebVTT.
- Audio duration 16.249977 seconds, within one PCM sample of the 16.25-second
  source; exact floating-point duration equality is inappropriate here.
- Equal source/evidence PTS for every sampled observation.

The reported real-time factor includes the intentional paced wait. These are
short-clip integration measurements, not sustained-match throughput, identity
precision, action recall or commentary quality benchmarks.

Reproduce with the web app and Python service running:

```sh
# From services/vision, after detector and optional neural voice setup:
.venv/bin/python scripts/verify_pipeline.py \
  --app-proxy --base-url http://127.0.0.1:5173
```

Without `--app-proxy`, the verifier defaults to the local service at port 8788.
It writes its evidence/audio/captions under ignored `.runtime/verification` by
default. Request headers and credentials are excluded from the evidence file.

## Remaining product requirements

The integration run exposed the central remaining limitation: **one generic line
was produced despite several ball detections**. The model and transport work;
the present narration policy is insufficient for useful football play-by-play.
Its conservative cooldown suppresses short-lived changes, and it lacks a trained
football action/identity layer. Keep that quality issue visible rather than
treating deployment as completion of the product.

Next work remains causal football action recognition, justified player identity,
evidence-grounded narrative scheduling, real screen-picker/lifecycle verification,
full-match reliability and customer trials. The earlier research/handoff provide
the broader architecture and scope. No real-customer readiness, revenue, complete
autonomy or broadcast-quality reliability is claimed by this verification.
