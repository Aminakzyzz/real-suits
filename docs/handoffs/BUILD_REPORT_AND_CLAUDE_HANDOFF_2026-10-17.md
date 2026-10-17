# Touchline: implementation report and Claude Code handoff

Prepared: **17 October 2026, Europe/Berlin**. This is the latest checkpoint, written at the user's request to hand the project to Claude before the usage limit. It supersedes earlier handoffs where they describe implementation as entirely unstarted.

## 1. Executive assessment

We have progressed from an operator-assisted commentary desk to a **working computer-vision prototype with a Premier League-inspired studio**. The new browser path runs an actual downloaded object detector, draws tracked boxes, generates conservative visual descriptions and can speak those descriptions. It accepts bundled footage, local uploads and a user-selected live window/screen input. An optional local Python service adds persistent sessions, CPU inference, offline voice generation and audio/caption exports.

**This is not yet the reliable autonomous football commentator the user ultimately wants.** Detection and visual description work. Reliable player identity, ball possession, passes, shots, goals, referee decisions, match-state understanding and natural professional play-by-play remain unfinished. The present text comes from deterministic rules over visual observations, not a trained football action model or a language model with deep match understanding. No foundation model was trained.

The user wants an eventual real-customer product and revenue potential. Neither production reliability nor willingness to pay has been established. Do not mark that objective complete because the UI is polished or a short demo runs.

**The newest studio is not deployed at the existing public-looking URL.** That URL still serves the earlier private operator-assisted release. Current source changes are the local/Git checkpoint; deployment must follow final production verification.

## 2. User requirements and authorization

The user explicitly requested:

- Video-first autonomous commentary, including games played live, rather than entering every event manually.
- Pretrained or trained computer vision, football statistics/context, language selection and voices.
- Free authorized voices for this build. Own-voice and licensed commentator voices are future extensions.
- Premier League design inspiration and the supplied league logos, with a personalized product identity.
- Latest official league information.
- Parallel implementation/research and a full report for Claude Code to continue.

The user reported permission from a colleague because they are participating in a Premier League hackathon, and authorized using YouTube/openly available licensed games. Proceed on that basis for the hackathon rather than repeatedly asking the same question. Actual organizer feed/account credentials or archive media inputs were not supplied. Keep source, dataset, voice and later customer distribution scopes separate. No Premier League protected video was downloaded or integrated.

Claude Code's `claude` CLI was **not installed** in this environment. Parallel workers were Codex sub-agents, not Claude. They delivered UI, speech/browser inference and media/data research. Their usage limits were reached near the handoff; no ongoing review result should be assumed to exist. Root integration work, the source checkpoint and this report are the continuation authority.

## 3. Repository and application map

Repository: **https://github.com/Aminakzyzz/real-suits**, branch **main**.

| Location | Responsibility |
|---|---|
| `apps/touchline` | React/TypeScript/Vinext application, Cloudflare Worker and D1. |
| `apps/touchline/app/page.tsx` | New vision studio at `/`. |
| `apps/touchline/components/vision-studio.tsx` | Video input, live sharing, engine/language/voice settings, inference state, boxes, commentary, exports and league panels. |
| `apps/touchline/app/desk/page.tsx` | Preserved manual producer desk at `/desk`. |
| `apps/touchline/lib/match.ts` | Existing confirmed-event commands, score/stat derivation, deterministic EN/ES/FR commentary and exports. |
| `apps/touchline/lib/vision.ts` | Shared frontend transport types and same-origin API helper. |
| `apps/touchline/lib/browser-vision.ts` | Browser sampling, worker RPC, IoU associations, observation narration, seek/cancel handling. |
| `apps/touchline/lib/browser-detector.worker.ts` | Actual RF-DETR ONNX inference in a dedicated worker. |
| `apps/touchline/app/api/vision/[...path]/route.ts` | Authenticated, allowlisted proxy to the optional service; injects owner identity. |
| `apps/touchline/lib/league.ts` | Current-season discovery and official data normalization. |
| `apps/touchline/app/api/league/route.ts` | Official refresh, caching, source provenance and explicit stale fallback. |
| `apps/touchline/lib/data/league-snapshot.json` | Dated official fixtures/table/news fallback. |
| `apps/touchline/public/branding` | Official league SVG assets requested by user. |
| `apps/touchline/public/demo` | Small licensed match clips, poster images and source/license manifests. |
| `services/vision/touchline_vision/perception.py` | Native ONNX inference, simple causal IoU association, histogram-based cut reset. |
| `services/vision/touchline_vision/narration.py` | Conservative EN/ES/FR observation descriptions with cooldown/novelty rules. |
| `services/vision/touchline_vision/service.py` | FastAPI, SQLite session records, paced decoding, uploads, ownership, audio/caption delivery. |
| `services/vision/touchline_vision/speech.py` | Atomic, offline eSpeak WAV generation. |
| `services/vision/touchline_vision/neural_speech.py` | Optional pinned Piper LJ Speech English neural voice. |
| `services/vision/touchline_vision/cli.py` | Explicit detector download and loopback server commands. |
| `services/vision/tests` | Protocol, ownership, validation, tracking, speech and real-model integration checks. |
| `CLAUDE.md` | Concise continuation entry point. |

The original user file `universal_digital_card_studio_plan.md` remains untracked context. Do not change or commit it inadvertently. Keep existing ignore rules. Model weights, Python virtual environments, SQLite/media uploads, local voices and research scratch files are ignored.

Earlier source checkpoints: `5c237f6` delivered the manual product; `3d948a4` delivered the vision research. The build checkpoint containing this report follows those commits. Use the actual Git HEAD and normal pull/merge; do not reset to the older source.

## 4. What is implemented

### Browser mode

The default mode is **This browser**. It does not require a GPU service, paid model API or private inference credentials. A dedicated worker uses ONNX Runtime Web 1.30.0 and the pinned approximately 28 MB RF-DETR Nano int8 model:

```text
Publisher: onnx-community/rfdetr_nano-ONNX
Revision: eae21cee0687a91bcf9fa071605c48d7705d2d91
File: onnx/model_quantized.onnx
License metadata: Apache-2.0
```

Frames are sampled from the video playhead, resized to 384×384, converted to RGB CHW floats in 0–1 and passed to real inference. Outputs are 300 normalized boxes and 91-class logits; COCO person and sports-ball classes are selected. Boxes are drawn in the video's displayed coordinates. Simple IoU associations provide temporary IDs; they are not footballer identities.

The browser generates cautious descriptions such as a visible ball's screen location or the number of people visible. EN/ES/FR wording exists. It does not invent player names, scores or rule events. Device speech uses available installed browser/system voices, so exact voice availability and audible quality vary.

Local video uploads remain in the browser in this mode. A **Share a match window** control uses `getDisplayMedia({video:true,audio:false})` and a MediaStream; this adds a real live input path. The source's original commentary is excluded from inference. Native browser permission is still required for screen/window sharing. The final actual OS screen-picker path was not fully verified before the handoff; see verification boundaries below.

Controls include start/stop, language/voice selection, detection overlay, narration mute, timeline navigation and VTT download. Audio is scheduled against the video playhead, old speech is cancelled on seek/pause and stale lines are dropped instead of reading an expanding backlog. This implementation needs longer playback tests before claiming tight synchronization under all conditions.

### Local service mode

The optional service runs on loopback port **8788**, independently from the web Worker. It uses Python 3.11, OpenCV, ONNX Runtime CPU, FastAPI, SQLite and a single inference executor. It imports bundled source manifests, accepts bounded video uploads, decodes in order, samples frames and stores session/observation state.

Implemented API endpoints:

```text
GET    /health
GET    /sources
POST   /sources                         multipart field: file
POST   /sessions
GET    /sessions/{id}
DELETE /sessions/{id}
GET    /sessions/{id}/media
GET    /sessions/{id}/audio/{utteranceId}
GET    /sessions/{id}/captions.vtt
GET    /sessions/{id}/commentary.wav
```

The application exposes these under `/api/vision/`. Its proxy requires sign-in, validates endpoint paths, forwards only selected headers, supplies an owner ID and supports a server-configured service token. Upload/session data are owner checked. An unconfigured remote service is not silently substituted for localhost on the deployed Worker. Service CORS/direct-origin restrictions encourage use through the app proxy.

Session configuration includes `sourceId`, `language`, optional `voice`, `sampleFps`, `pace` and `maxSeconds`. Observations include source PTS, latest evidence PTS, boxes, confidence, scene and inference time. Events/utterances refer to the same media timeline. The current service narrator describes observations; it does not add its uncertain candidates to the manual desk's confirmed scoreboard.

The app delays service playback until some analysis is available. Completed/cancelled sessions can export a generated mono WAV track and WebVTT. Speech failure preserves text and records a warning. Process restarts mark previously running jobs failed, rather than leaving them permanently labelled running. Recent frontend observations are bounded; the local JSONL log preserves the full sampled sequence.

The final source-manifest reconciliation fix imports every bundled manifest on restart, so replacing the default clip cannot leave the old Ajax–Utrecht ID pointing at new Inter–Ajax bytes. Restart the service after pulling this checkpoint; do not rely on the pre-fix running process.

### Interface and league information

The studio is redesigned around Premier League purple, green, white/pale surfaces, a lion emblem, editorial heading, broad navigation, video workspace, setup controls, commentary and league panels. It retains **Touchline** as the product identity and labels the hackathon context. It does not claim to be the official Premier League product. The manual producer desk remains available.

The official homepage is used to discover the active season and matchweek, rather than permanently hard-coding Matchweek 7. The official site's public implementation endpoints provide fixtures and standings. The route normalizes teams, crests, score/status and kickoff timestamps, caches modestly and keeps source links. The UI refreshes while visible and identifies saved/stale snapshots with timestamps. Standings matchweek and fixture matchweek are separate.

An integration bug was fixed: Cloudflare's Fetch rejects `redirect:'error'`. The proxy now uses `manual` and rejects unexpected redirects. League refresh initially failed at the root homepage path; `/en` plus the transparent app User-Agent returned a fresh response. These are **undocumented website endpoints**, not an established supported commercial data agreement. Retain validation and fallback behavior.

## 5. Footage, models and voices

The final bundled default is **Inter–Ajax U19, 26 March 2012**, filmed by zilupe. It is a complete 16.250-second contiguous clip, 1280×720, H.264, muted. The [original Flickr page](https://www.flickr.com/photos/zilupe/7018838149/) explicitly links CC BY 2.0 in its JSON-LD; the [Commons file](https://commons.wikimedia.org/wiki/File:Next_Generation._U19._Inter_vs_Ajax._Ajax_goal..webm) carries the source. Preserve `public/demo/source.json` and attribution. The original title mentions a goal; this label is metadata and must not become hidden input to goal recognition.

Additional bundled clips: Ajax–Utrecht 2024, 30 seconds, CC BY 3.0; and Latvia–Gibraltar 2026, approximately 17 seconds, CC0. The former has difficult spectator/net/crowd occlusion; the latter mainly shows a goalkeeper and smoke. They are useful robustness cases, not representative full-match benchmarks.

The following ball detectors were evaluated separately but **not integrated**: `acatorcini/yolov9-soccer-ball` and `Dura-S/reco-yolo26s-football`. They are AGPL-labelled research alternatives; ONNX Runtime's license does not change weight conditions. Do not switch the shipped model solely because a confidence number is larger.

On 17 integer-second frames of the Inter–Ajax clip, RF-DETR and both alternatives each produced ball candidates in **4 frames** at their tested thresholds. This is **candidate coverage, not precision or recall**. There is no full manual ground truth. Mean native CPU inference during the comparison was approximately **283 ms RF-DETR, 1,015 ms YOLOv9, 2,124 ms YOLO26**. Some specialized-model boxes at seconds 1 and 5 were visually inspected. Results are saved in `docs/research/initial-detector-comparison-2026-10-17.json`. Camera quality changed the result much more than simply selecting a larger model.

Free speech paths:

| Engine | Status | Boundary |
|---|---|---|
| Browser/system voices | Integrated in browser mode. | Device-dependent availability; no downloadable audio capture implemented. |
| eSpeak NG | Real EN/ES/FR WAV generation verified. | Clearly synthetic; installed system executable; GPL conditions apply when redistributing it. |
| Piper LJ Speech | Optional English neural voice implemented and installed locally. | Select `piper-en`; approximately 63.5 MB pinned model; English only; Piper runtime GPL, model metadata MIT, LJ Speech data identified as public domain by publishers. |

The Lessac voice was excluded after its individual dataset terms were found to restrict commercial speech-product development. No celebrity/commentator clone was made. No paid API key is needed for the implemented demo. See `docs/product/free-speech.md` for exact voice sources, hashes and commands.

## 6. Verification: passed versus pending

**Passed at this checkpoint:**

- **20 Python tests**, including **23 subtests**, in the latest run. Includes actual multilingual eSpeak, optional real Piper synthesis, concurrent/atomic outputs, model integration, API contracts, media validation, track reset and ownership boundaries.
- **TypeScript type checking and 16 domain tests passed in the final checkpoint check**: 13 existing match tests plus three league-discovery/normalization tests. The worker format literal needed an `as const` fix after its first final check; the corrected configuration passed.
- **Six existing Chrome end-to-end workflows** passed after moving the manual desk tests to `/desk`: editing/export, persistence, cloud conflict handling, owner isolation, overlays/revocation, mobile navigation and speech/video dispatch.
- Actual Chrome **browser inference through the real Vinext app** produced people detections, overlay rectangles, a vision-derived line and a downloadable VTT, with no page errors in the successful stable run. A representative run reported nine people and approximately 1,364 ms WASM inference; a previous run reported eleven. These are small smoke results, not a quality benchmark.
- Desktop and 390-pixel mobile layouts were inspected; no horizontal overflow in the checked views. Screenshots are under ignored `artifacts/studio-*.png`.
- A production Worker **build succeeded** during integration. Build success is distinct from production-browser inference success.
- A fresh official league API response was observed after fixing the upstream homepage request.

**Pending / do not claim passed:**

1. **Freeze and rebuild the exact final source**, including static ESM worker import, `worker.format='es'`, and the last default-video/source-manifest changes. Test the actual production Worker in Chrome, not just the dev server or a standalone Vite harness.
2. Repeat a complete **real-CV → Piper → API export → browser playback** run after the final freeze. A previous real API attempt created a session successfully, but a Vite configuration restart interrupted polling with an HTML response. It did not establish a saved complete integrated success record. API/export tests use a deterministic detector fixture; real perception and speech have also been verified separately.
3. Exercise the **actual OS screen/window picker**, track-ended event, permission denial and repeated share/stop. The UI implementation exists; a permission-picker stub is not proof of native capture.
4. Verify audible speech/pronunciation and seeking under sustained playback. Headless dispatch tests cannot establish human voice quality.
5. Finish cancellation/restart/retention/concurrency review and long-match soak. Optional in-process Piper inference has no hard interrupt; request cancellation is not guaranteed to interrupt native inference instantly.
6. Confirm identity, ball/action precision/recall and consequential-error behavior on held-out labelled football. None of those product-quality gates is passed by the short samples.
7. Publish the new app only after the production check. No new Site version/deployment has been saved for this build.

### Worker integration trap: preserve the working combination

Vinext's development transforms exposed bugs that a standalone Vite test missed:

- `new Worker(new URL(..., import.meta.url))` became a `file:///...` URL through the app transform. The code now uses the Vite `?worker` constructor import.
- Bundling ORT or certain variable dynamic imports caused Vite's `window`-based development/HMR code to enter a worker. The final source uses a **static external ESM import of the pinned ORT runtime**.
- Production worker output must stay ESM: `worker: {format:'es' as const}` in `vite.config.ts`.

Do not replace these based only on a standalone harness passing. If changing them, repeat real-app dev and production browser checks. The model comes from pinned Hugging Face and the runtime/WASM from pinned jsDelivr; first use requires internet. Offline packaging and integrity enforcement beyond the existing pins are future hardening tasks.

## 7. How Claude can run the project

Requirements: Node 22.13+, npm, Python 3.11/3.12 for the optional service, FFmpeg/FFprobe and eSpeak NG. This machine has no established usable CUDA GPU. Existing system Python is 3.14, so use `uv` to select 3.11 rather than accidentally installing incompatible wheels.

### Web application

```sh
cd /home/aminakziz/projects/real-suits/apps/touchline
npm ci
npm run dev
```

Open the printed local URL, normally `http://127.0.0.1:5173`. The new studio is `/`; the existing producer desk is `/desk`. Browser mode can run without the optional inference service. Initial analysis downloads the pinned model/runtime, then plays the permitted sample and emits observations.

Do not start duplicate Vinext servers; reuse the running one or stop the owned process. At handoff a dev server had been running on 5173, but process availability is not guaranteed across sessions. For the manual cloud database on a fresh checkout, follow the existing root README's first-time migration command. Never replay an already applied migration or discard `.wrangler/state` to get a test green.

### Optional Python service

```sh
cd /home/aminakziz/projects/real-suits/services/vision
uv venv --python 3.11
uv pip install --python .venv/bin/python -e '.[test,neural]'
.venv/bin/python -m touchline_vision.cli setup
.venv/bin/python -m touchline_vision.neural_speech setup
.venv/bin/python -m touchline_vision.cli serve --port 8788
```

For local-service mode, sign into the app through `/signin-with-chatgpt?return_to=/` if needed. This is the existing local mock sign-in in portable development, not a new authentication system. Select a source, English and the **LJ Speech neural** voice to use Piper. For ES/FR use the offered eSpeak voices. See `services/vision/README.md`.

If `.venv` already exists, do not recreate it blindly; install/update the needed extras into it. Models are local ignored assets and must be downloaded again on another machine. No trained weights are in Git.

### Checks

```sh
# From apps/touchline:
npm run typecheck
node --experimental-strip-types --test tests/domain.test.ts tests/league.test.ts
npm run test:e2e

# From services/vision:
PYTHONPATH=. .venv/bin/python -m pytest -q
```

Browser regression tests expect the dev server on port 5173 and installed Chrome. The old `tests/production-smoke.mjs` predates the new homepage; update its navigation/assertions before using it as evidence for this release.

## 8. Deployment state

Existing private Site: **https://touchline-matchday-desk.socialpony16.chatgpt.site**.

```text
Site ID: appgprj_6ad2c952011881918cf3fe71b87fdfab
Audience: owner-private custom access (preserve it)
Previous published platform source: 781eca3c00dfaae5e23a4fe24cddbeab0700b601
Opened platform checkout during this build: /tmp/touchline-sites-open
```

The root GitHub repository is the editable project source, including the service. The platform publishing checkout contains only the web application. Synchronize the finalized app source into the proper opened platform checkout, retaining its `.git`, Site manifest, identity and audience. The earlier opening attempt created an unborn nested `.git` in the app; that failed attempt's metadata was moved into ignored `artifacts/failed-site-opening.git` to avoid confusing root Git operations.

Use the installed **Sites skill** and native tools for publication. Re-read its workflow for the next session. Refresh the source write credential; never put credentials in shell arguments, source, docs or Git. The temporary write credential used during this session is not a reusable handoff artifact. The skill helper handles source synchronization, commit/push and packaging; use its returned immutable IDs for deployment. Do not manually fabricate a saved version or call an old successful deployment the new build.

The hosted Worker can serve the browser-only detector; it cannot run CUDA/Python inference, FFmpeg or a persistent local service. Localhost on the deployed Worker is not the customer's computer. To use a hosted service, deploy it separately and configure server-side `TOUCHLINE_VISION_URL`/`TOUCHLINE_SERVICE_TOKEN`. No paid service was provisioned.

## 9. Concrete work breakdown for Claude collaboration

Keep each worker's edits bounded; use separate branches/worktrees if Claude and another coding agent run simultaneously.

| Owner / task | Files or boundary | Required deliverable |
|---|---|---|
| Integrator — **P0** | App build, service integration, deployment, docs | Freeze exact source; pass actual production Worker vision smoke; rerun real pipeline with audio/export; publish new private version with evidence. |
| Claude CV/action worker — **P1** | New `services/vision/touchline_vision/actions.py` and its tests; avoid UI and existing perception edits until agreed | Causal football action proposals with evidence/time/confidence, evaluated on held-out annotated clips. Compare real inferred tracks against supplied/oracle inputs. Begin with a small justified action taxonomy; no fake goal labels from filenames. |
| Claude identity worker — **P1** | New identity/jersey/roster module behind a typed interface | Team/jersey/roster evidence with explicit unknown identities, temporal confidence and reset after cuts/substitutions. No face recognition required initially. |
| Data/evaluation researcher — **P1** | Research docs, manifests, labelled evaluation assets outside Git where required | Representative authorized footage, actual event/actor ground truth, component and end-to-end metrics; artifact-specific licenses. |
| Reliability worker — **P1/P2** | Session lifecycle/export code and meaningful tests | Cancellation/backpressure, crash recovery, retention/deletion, export atomicity and multi-user isolation review; full-match resource measurements. |
| Voice/narrative worker — **P2** | Speech adapters and structured commentary policy | Natural EN/ES/FR narration grounded in confirmed events, pronunciation dictionary, bounded speech queue and measured timing. Use authorized voices only. |

The next useful research is task-specific evaluation and implementable models, not another generic market scan. Relevant papers and licensing caveats already exist in the earlier research. FOOTPASS's README/LICENSE conflict remains unresolved; SoccerNet data restrictions and supplied tracking inputs remain relevant. StreamSoccer's event memory is an architectural reference, not an available checkpoint we installed.

### First Claude instruction to paste

> Read `CLAUDE.md` and `docs/handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md`. Continue in the existing `real-suits` repository. First freeze and verify the final browser worker in an actual production Worker build, then repeat the real video-to-Piper-to-audio-export integration and finish publication. Preserve the reported Premier League hackathon authorization, branding and licensed media manifests. Do not claim current generic visual narration is named-player football play-by-play. After the P0 checks, implement and evaluate a causal football action layer and identity evidence in bounded modules, keeping uncertainty explicit. Update the status/report with exact measured results and remaining work.

## 10. Product/research context and completion criteria

The broad category is not new: [Liat.ai](https://liat.ai/) advertises single-feed computer vision and multilingual football commentary; CAMB and Spiideo cover adjacent localization/production/data needs. A club-specific deployment, ownership and pricing offer remains a commercial hypothesis. No clear exclusive market gap, paid customers or revenue has been demonstrated. The user's access to clubs is a practical route to validation after technical reliability improves.

Completion should mean a permitted continuous match produces useful action commentary, justified player references, generated authorized speech and synchronized viewing without someone entering every moment, then survives a full-match trial and correction/recovery scenarios. Measure named-actor precision and coverage separately, event precision/recall, false goals, replay duplication, inference/utterance latency, resources and cost. A system that avoids all errors by staying silent also fails usefulness review.

Retain the original confirmed-event desk as a recovery/review tool, not as hidden labour behind an “autonomous” claim. The long-term product goal remains unfinished and should stay open for continuation.

Related records:

- `docs/research/live-football-vision-2026-10-17.md` — deeper state-of-the-art and architecture research.
- `docs/research/source-snapshot-2026-10-17.json` — 21 inspected repository/model metadata revisions.
- `docs/research/media-and-brand-sources-2026-10-17.md` — actual footage/design/data sources and attribution.
- `docs/research/initial-detector-comparison-2026-10-17.json` — current small, non-ground-truth detector comparison.
- `docs/product/free-speech.md` — speech integration, exact voice/model provenance and limits.
- `docs/PROJECT_STATUS.md` — concise continuation state.

This report is deliberately explicit about pending checks. It is a reproducible engineering checkpoint, not a declaration that the final product is perfectly implemented.
