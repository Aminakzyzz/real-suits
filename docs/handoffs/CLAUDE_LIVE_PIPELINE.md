# Claude continuation: autonomous football commentary

**Superseded implementation checkpoint:** read [the later full build report](BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md) first. This file preserves the original research-to-implementation plan; parts of it are now implemented.

Prepared 17 October 2026. Read this file, [the research decision](../research/live-football-vision-2026-10-17.md) and [project status](../PROJECT_STATUS.md) before changing the app.

## User's current direction

The user wants computer vision to watch a game, identify play/players, generate factual commentary, choose language/voice, and watch synchronized AI narration. Manual moment entry is insufficient as the main product. They requested deep research first and asked for a handoff so Claude can continue.

**Authorization update:** the user reports permission from a colleague for a Premier League hackathon, and says YouTube videos can be used. Proceed on that basis for the hackathon prototype; do not restart a generic permission interrogation. Use organizer/rights-holder supplied source files or supported live inputs. Preserve the actual permission scope in a source manifest; public release, dataset licenses and identifiable voice licenses are distinct. No account credentials, source media or live feed details have been provided in the repository.

The product objective remains **an actual working end-to-end product**. This handoff is a completed research milestone, not completion of the autonomous product. No model inference, training, new video integration or cloned speech was executed during this milestone.

## Existing repository and application

- Existing repository: `Aminakzyzz/real-suits`, branch `main`. Keep working here unless the user directs otherwise; a second repository is unnecessary.
- App: `apps/touchline`; React/TypeScript, Vinext, Cloudflare Worker, D1/Drizzle. Existing deployment is private at `https://touchline-matchday-desk.socialpony16.chatgpt.site`.
- Source implementation commit: `5c237f6a11feedaaca4256ec5e57f6f1927ff42b`; subsequent commits contain delivery/status docs. Check the actual HEAD rather than resetting to this historical commit.
- `apps/touchline/lib/match.ts`: `matchSchema` version 1, `commandSchema`, `applyCommand`, derived stats, deterministic EN/ES/FR commentary and exports. `sourceSeconds` is video-relative; `seconds` is match time. They are not interchangeable.
- `apps/touchline/components/desk.tsx`: setup, manual desk, local video tagging, browser/cloud state and device speech controls. Refactor focused components when adding the autonomous view; do not make the large desk component own GPU job lifecycle.
- `apps/touchline/app/api/matches/[id]/route.ts`: owner-scoped GET/PATCH/DELETE; PATCH requires `{version, command}`, checks optimistic concurrency and uses `applyCommand`.
- `/api/matches`, `/api/matches/[id]/share`, `/api/live/[id]?key=...` and `/overlay/[id]`: existing cloud records and read-only overlays. Read keys are not mutation/service credentials and do not bypass private hosting access.
- `apps/touchline/db/schema.ts`, `drizzle/0000_classy_toro.sql`: current DB schema/initial migration. Add a new migration, do not rewrite an applied one.
- Root `README.md`: run and test commands. Existing prior validation: 13 domain tests, 6 Chrome e2e tests, TypeScript and Worker build/smoke passed for the manual app. They establish nothing about future vision quality.
- The user's untracked `universal_digital_card_studio_plan.md` is original context. Leave it untouched and uncommitted unless requested. Preserve existing `.gitignore` rules.

The active product no longer uses the historical employer/card plans. Their old approval gates do not govern this continuation.

## Engineering decision

Keep the existing web app as control plane and viewer. Add `services/vision/`, a separate Python media/inference service with its own pinned environment/container. No CUDA, FFmpeg subprocesses or model training inside a Cloudflare Worker.

Start with RF-DETR Small (Apache-designated checkpoint), ByteTrack, temporal jersey OCR/team mapping, past-only action candidates, constrained commentary and Qwen3-TTS. A Qwen3-VL 4B/8B clip interpreter can propose semantic actions during the first experiment; validate its structured output and retain uncertainty. It is not evidence that a named pass, shot outcome or goal is correct. Compare lighter/higher-resolution models based on ball errors and latency.

Run a separate research adapter for SoccerNet GSR/FOOTPASS/SoccerMaster only within applicable terms. FOOTPASS README and LICENSE conflict; SoccerNet video data is research-only; SoccerMaster's whole multi-model stack is not cleared merely by its model card. No end-to-end live pretrained checkpoint was verified. Do not claim to install StreamSoccer: this review found a paper, not an established public release.

The exact inspected repository and model revisions are in [source-snapshot-2026-10-17.json](../research/source-snapshot-2026-10-17.json). Those are research pins, not an instruction to install an unreleased default branch or every model simultaneously. Use a stable compatible package set, record changed pins and weight SHA-256 hashes, and isolate older research environments.

## First work sequence

### 1. Establish reproducible inputs and a causal runner

Create a source manifest and support a permitted local source file. Record its hash, media duration, time base, origin and permission basis. Add paced 1× replay with a decoder that emits timestamped frames only as the stream advances. No preloading future frames for the event model. A local owned/synthetic clip can verify transport, but label it honestly; real football evaluation needs supplied football footage.

Support cancellation, EOF, seek, reconnection and PTS discontinuities through stream epochs. Start with one clip and one job, then live RTSP/SRT/RTMP or another organizer-supplied input once specified. A YouTube watch URL or signed-in archive webpage is not itself a media input. Do not build a generic extraction/bypass mechanism. Network input must reject unsafe protocols/addresses and avoid turning customer-supplied URLs into unrestricted server requests.

Deliver a repeatable CLI for frame/observation JSONL and a debug video overlay. Keep artifacts outside Git. CPU mode may verify plumbing; it must not silently stand in for a promised real-time GPU result. This workspace did not establish a usable CUDA GPU. Do not provision paid infrastructure without existing authorization for its cost.

### 2. Finish the vertical slice through audio and player

Implement adapters for detection/tracking, action proposals, commentary and TTS. Start with conservative semantic outputs and explicit unknowns. Supply rosters before naming players; kit colors alone never produce a name. Feed generated utterance audio and captions into buffered playback of the same permitted media. The first milestone is **video → inferred action → words → generated speech → aligned playback**, not just boxes on a video or another manual event form.

Keep simulation adapters behind explicit test/demo flags. A test fixture can exercise the service protocol; a successful autonomous demonstration must run real inference on raw video and cannot use ground-truth events as hidden input. Report exactly which event classes, identities, languages and voices actually worked.

### 3. Add evidence, identity, outcomes and recovery

Implement cut/replay detection, ball uncertainty, jersey vote histories, lineup validity and optional scoreboard OCR. Separate supplied oracle tracks from inferred tracks in the evaluation. Add provisional/retracted events, confirmation policy and correction speech. Keep an optional review control for consequential ambiguity; ordinary narration must function without a person entering every event.

Do not announce a goal or update the score solely because a shot points at the goal, the ball disappears, or players celebrate. Require corroboration and handle later disallowances. If the available evidence cannot confirm it, narrate cautiously and retain unknown outcome.

### 4. Evaluate, then fine-tune the bottleneck

Hold out whole matches and camera styles. Measure actor precision/coverage, event precision/recall, replay duplicates, false goals, latency, memory and total per-match cost. Distinguish research results with supplied tracking from raw-video results. Train ball detection/jersey/action components based on observed errors and actual permitted annotations. Full-foundation-model pretraining is not the first task.

### 5. Live input and full-match acceptance

Swap paced-file ingress for the permitted live source without replacing the rest of the pipeline. Measure actual ingest-to-heard latency and full-match behavior. Complete EN/ES narration and own-voice/original-voice modes, then add French. Keep exportable audio/captions and match recovery. Test a permitted club rehearsal and the commercial offer after the hackathon demo.

## Proposed service contract

These names and endpoints are **design proposals**, not APIs already implemented. Put schemas in a shared contract with versioning and runtime validation. Keep high-rate observations out of the existing whole-match JSON payload.

Suggested endpoints: create/cancel/status a vision session, an authenticated event stream resumable by sequence number, and private generated-audio access. Use server-minted short-lived per-session credentials bound to owner, match and service audience. The inference service must not receive an interactive Sites login cookie or a read-only overlay key as its write authority.

Persist four kinds of records:

| Record | Essential fields |
|---|---|
| Observation | `sessionId`, `streamEpoch`, `sequence`, `sourcePtsMs`, cut/replay state, boxes/tracks, optional team/jersey hypotheses, model revision |
| Event proposal | `eventId`, revision, type, action interval, latest observed PTS, status, team/actor hypotheses, separate confidence values, evidence IDs, model provenance |
| Confirmed incident | stable ID linked to proposal, match-clock mapping, validated `Command`, confirmation basis and any correction/retraction |
| Utterance | source event IDs, evidence cutoff, language, voice version, text, audio state/duration, scheduled source PTS, deadline and cancellation epoch |

Example proposal, **illustrative values and fictional IDs**, not a model result:

```json
{
  "schemaVersion": 1,
  "sessionId": "demo-session",
  "streamEpoch": 1,
  "sequence": 108,
  "eventId": "candidate-42",
  "revision": 1,
  "status": "provisional",
  "action": "shot",
  "eventPtsMs": 81200,
  "observedThroughPtsMs": 82900,
  "team": { "side": "home", "confidence": 0.97 },
  "actor": { "trackId": "shot3-track9", "playerId": null, "confidence": 0.41 },
  "actionConfidence": 0.84,
  "outcome": "unknown",
  "evidenceIds": ["observation-106", "observation-107"],
  "modelRevision": "example-only"
}
```

Raw confidence scores are not calibrated probabilities. Calibrate thresholds on held-out data. Preserve a null actor and unknown team where needed; do not force uncertainty into an existing mandatory `home|away` field.

The current `Match` supports eleven incident kinds and at most **1,000 events**. A match has far more frame observations and potentially more fine-grained actions. Store passes/drives/possession in a separate timeline; promote only compatible confirmed incidents through `applyCommand`. Add an explicit schema migration if new persisted match fields are needed. Existing `stats()` must not count every candidate as a shot.

Promotion needs a server-side transaction or equivalent version-aware mutation. Deduplicate by stable event ID/revision; do not allocate a new ID on retries. Preserve operator corrections over stale inference revisions. A retraction of a promoted goal must correct the scoreboard and cancel dependent speech. Persist outcomes so reconnects cannot replay old goal calls. An outbox or durable retry record should link accepted state changes to emitted stream messages.

For a portable first demo, keep proposal/session data in service-side SQLite and media in private local storage with an explicit retention setting. If deploying, replace or augment these with durable shared storage. Do not assume D1 can store full video/audio blobs or every frame in one row.

## Playback scheduling requirements

- Preserve source PTS and match time separately. Record the latest frame used by every decision.
- Introduce measured playback delay; experiment initially with 6–12 seconds. This is an unmeasured target, not a promised product capability.
- Schedule audio using the actual player playhead and generated audio readiness. Support pause, seek, rate changes and tab suspension; invalidate queued work across epochs.
- Prioritize an important event over a queued background fact. Drop stale lines instead of creating an expanding narration backlog.
- Keep text/audio for different languages on the same source timeline. Switching language or voice cancels superseded audio safely.
- An original broadcast commentary track must not secretly supply labels to a purported vision-only system. Separate audio permissions and mixing from visual inference.
- Produce an audio file/stream and SRT/VTT against the chosen timeline. Existing `speechSynthesis` dispatch cannot satisfy an audio export or own-voice feature.

## Voice/product constraints

Accept the user's own recording or an authorized voice; store consent/provenance and support deletion. For a famous commentator, use a licensed/shared voice or obtain participation; otherwise offer an original preset with generic cadence/excitement/descriptiveness. Video permission does not establish a right to clone its commentator. Do not copy a real person's identity or signature phrases into a misleading endorsement.

Test which TTS variant supports cloning versus instruction-based design. Qwen3-TTS Base, CustomVoice and VoiceDesign expose different features; do not present a style knob that the chosen model ignores. Chatterbox language and streaming support also differ by variant. Published TTS/SDK millisecond numbers exclude much of our pipeline. Benchmark first audio, full sentence, intelligibility and pronunciation under actual concurrent load.

Avoid a UI promise of “any language” or “every player touch.” Start with the languages/event classes measured to work. Keep the product's main action video-driven; manual controls are recovery and optional review tools.

## Verification and completion record

Add meaningful tests for the new failure modes: no future-frame leakage, event deduplication across retries/replays, identity reset after a cut, score retraction, correction precedence, seek/audio invalidation, cross-owner session isolation, unsafe input URL rejection and bounded backpressure. Keep model quality benchmarks separate from deterministic protocol tests. Existing tests remain regression checks after app changes.

Run a 10–15 minute contiguous permitted sequence at 1× with all pipeline stages. Save source hashes, model revisions, machine details, predictions before corrections, timing metrics and a demo recording covered by source permissions. Then run a full-match soak. Propose target gates from the research report, but never mark them passed without measured evidence.

At each milestone update `docs/PROJECT_STATUS.md` with what runs, what was measured, exact reproduction commands, failures and the next task. A polished UI, a prerecorded narration or a research paper alone is not completion. No autonomous-product delivery, revenue, public hosting or actual live-league integration is currently established.

Suggested first continuation instruction:

> Continue from `docs/handoffs/CLAUDE_LIVE_PIPELINE.md`. Build the paced-video-to-generated-audio vertical slice in the existing Touchline repository, using the reported Premier League hackathon permission and available authorized media. Reuse the app's confirmed-event logic, keep inference separate, and demonstrate real causal inference before claiming autonomous commentary. Record missing source/hardware inputs while completing independent implementation work.
