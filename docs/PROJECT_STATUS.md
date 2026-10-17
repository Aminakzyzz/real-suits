# Project status and continuation record

Updated: 17 October 2026, Europe/Berlin.

## Latest verification and publication

The new studio is now deployed at https://touchline-matchday-desk.socialpony16.chatgpt.site with owner-private access unchanged. Native deployment `appgdep_6ad365f643bc8191993ccf8da1cc82ea` succeeded for platform source `dacbc6c5e2332c5a297825ea86bc15fa8cf4c791`. The final production Worker ran actual browser inference, narration dispatch and caption export without page errors. A reproducible paced real-CV → Piper → WAV/VTT integration also passed on the complete short clip. Read [the verification record](product/vision-verification-2026-10-17.md).

The same evidence shows the narration still produced only one generic observation despite several ball detections. Football action/identity intelligence, useful play-by-play, full-match reliability and customer validation remain incomplete. The full product goal is active; publication does not establish completion.

## Earlier build checkpoint — handoff requested

The user requested a full report to pass immediately to Claude. Read [the complete build report and continuation packet](handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md) and root `CLAUDE.md` first. Those supersede the pre-build state below.

Implemented locally: a Premier League-inspired studio at `/`, preserved producer desk at `/desk`, actual RF-DETR browser inference with on-device visual narration, file/live-window inputs, an optional Python CPU inference service with SQLite sessions and audio/caption exports, free EN/ES/FR eSpeak voices, optional English Piper neural speech, and a sourced current league refresh with dated fallback. Bundled default footage is licensed Inter–Ajax U19, not a Premier League archive download.

Verification: 20 Python tests (23 subtests), 16 TypeScript/domain tests during integration, six existing Chrome workflows, actual browser inference/narration and responsive screenshots. Production build succeeded during integration; exact final-source production browser smoke and new deployment are still pending. The report records the last worker/source changes and necessary retests. No action/identity accuracy, full-match reliability or revenue claim is made.

The current detector is generic and track IDs are temporary. Named-player identity, reliable actions/possession/goals, professional commentary and full-match/customer validation remain unfinished. The autonomous product objective remains open. The old hosted URL still serves the earlier operator-assisted release; do not present it as the new studio.

## Authorization and pre-build research history

The latest request advances Touchline from manually entered moments to **live video → computer vision → player/action understanding → multilingual commentary → generated speech → synchronized viewing**. The user requested deeper current research and a concrete handoff for Claude to continue implementation. The earlier operator-assisted release does not fulfill this new autonomous-pipeline objective.

During this research the user reported permission from a colleague for participation in a Premier League hackathon and said YouTube videos can also be used. Treat this as authorization for the hackathon prototype; do not repeatedly ask for the same permission. Exact source delivery and permission scope were not supplied. Keep footage/model/dataset/voice/customer-release permissions distinct without blocking independent implementation work.

**Earlier research milestone:** research and initial Claude handoff were prepared before implementation. Read [live football research](research/live-football-vision-2026-10-17.md), [the initial implementation plan](handoffs/CLAUDE_LIVE_PIPELINE.md) and [source revisions/license metadata](research/source-snapshot-2026-10-17.json) for background. Actual video downloads and inference were subsequently implemented as described in the latest build checkpoint.

The earlier user instruction remains: **an end product must exist**. It authorized independently choosing and developing a product. The previous goal was completed for the earlier manual product delivery; the new vision-to-commentary product is not complete. Continue from the handoff rather than treating the previous completion record as completion of the new request.

## Current research decision

Keep the existing web app and add a separate Python inference/media service. First deliver a causal, paced authorized-video-to-generated-audio vertical slice with buffered synchronized viewing, then connect the same pipeline to a permitted live input. Proposed components: RF-DETR Small, ByteTrack, roster/jersey evidence, past-only temporal action proposals, grounded event memory and Qwen3-TTS/Chatterbox voice adapters. These are recommendations, not implemented features or benchmarked performance.

New findings revise the earlier market picture: Liat.ai explicitly advertises the broad single-feed vision-to-multilingual-commentary concept. Originality and a clear market gap are not established. A club-focused deployment/pricing offer needs validation. Research benchmark results often include supplied tracking, event labels or reference anchors; do not market them as our raw-video autonomous accuracy. FOOTPASS's README and LICENSE conflict, and data/weight licenses need artifact-specific handling.

## Selected product: Touchline Desk

A producer-assisted football commentary and broadcast studio for small clubs and independent streamers. The app is in `apps/touchline` in the existing `Aminakzyzz/real-suits` GitHub repository. The attached universal-card plan remains untouched as historical inspiration.

The earlier [pivot research](research/product-pivot-2026-10-17.md) compares five ideas and ten primary sources. Its manual-first scope is delivery history, not a reason to avoid the user's new autonomous objective. Touchline is a commercial experiment; revenue and a differentiated market position remain unvalidated.

## Previously implemented and verified: operator-assisted release

- Real editable teams, rosters, approved facts, match clock and confirmed event log.
- Correctable score/stat derivation, own goals, substitutions and event retry behavior.
- English/Spanish/French structured commentary, three styles and device speech controls.
- Local video annotation with source-time captions; footage is not uploaded.
- Browser drafts, JSON restore, authenticated D1 cloud matches, owner-scoped APIs, concurrency checks and revocable read-only overlays.
- CSV, Markdown, SRT, JSON and PNG exports; responsive desktop/mobile UI.
- 13 domain tests, 6 Chrome end-to-end tests and TypeScript checks passed.
- Production Worker build and browser smoke test passed.
- [Operator guide](product/touchline-operator-guide.md) and [delivery evidence](product/touchline-delivery.md) written.

## Existing deployment

A new private Site was registered and its exact source pushed/packaged using Sites. The native deployment reached **succeeded** at https://touchline-matchday-desk.socialpony16.chatgpt.site. The application source was committed as `5c237f6a11feedaaca4256ec5e57f6f1927ff42b` and pushed to the user's existing GitHub `main`; the remote ref was read back and matched. See the delivery record for immutable Site/source/version/deployment identifiers and final URL.

## Scope and honest limits

This release is operator-assisted and uses deterministic commentary templates. It does not train or run an autonomous football vision model, identify players from video, fetch licensed league feeds, clone voices, export a narration audio track, retransmit footage or process subscriptions. Device speech and external OBS need a rehearsal on the operator's actual setup. Hosted access starts private; overlay keys do not bypass hosting authentication.

Revenue and repeated customer demand remain unvalidated. Proposed pilot prices are experiments, not forecasts. Do not report a successful subscription launch or paid customers without actual evidence.

## Delivery audit

- Private production deployment succeeded and its literal URL is recorded above.
- Source, research and operator documentation are pushed to the existing GitHub repository.
- Existing root ignore rules were preserved; dependencies, credentials, local databases and publication scratch files were excluded from commits.
- A source archive is available under ignored `artifacts/touchline-source.zip`.
- The earlier request for a first operator-assisted product was fulfilled. The latest autonomous vision pipeline remains to be built. No paid-customer, public-launch or autonomous-vision claim is made.
- Final handoff must state the private-access and operator-assisted boundaries clearly.

## Commercial follow-up

Next implementation work follows the Claude handoff: build the full paced-video-to-audio slice, evaluate raw-video factuality and latency, then add the permitted live source and a full-match trial. Use the existing manual correction/overlay functionality for recovery. Verify voice/pronunciation, measure interventions and actual cost, then seek a paid repeat match. Do not promise autonomous results from the current template engine.

The previous digital-card and employer-follow-through reports are historical research, not current implementation instructions. Their old approval gates no longer apply to the user's latest authorized scope.
