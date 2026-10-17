# Project status and continuation record

Updated: 17 October 2026, Europe/Berlin. The user's latest request is a complete report for immediate Claude Code handoff.

Read [the full consolidated handoff](handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md) and root `CLAUDE.md` first. They replace obsolete implementation-status statements in earlier research documents.

## Verified baseline

The new vision studio is privately deployed at https://touchline-matchday-desk.socialpony16.chatgpt.site. Owner-private audience is unchanged. Platform source `dacbc6c5e2332c5a297825ea86bc15fa8cf4c791`, deployment `appgdep_6ad365f643bc8191993ccf8da1cc82ea`, returned success at `2026-10-17T12:11:58.185903+00:00`. Root baseline commit: `fb4d3381695d58a66bf79693cacf26d339fe625b`.

Actual local production Worker Chrome checks passed for real browser inference, narration dispatch, caption export, preserved manual desk and protected APIs. A real 1× paced 16.25-second clip ran through the authenticated local app proxy, RF-DETR CPU and Piper neural speech, exporting WAV/VTT. See [the verification record](product/vision-verification-2026-10-17.md). The hosted authenticated page was not separately browser tested. Python inference remains a separate local service.

The integration produced only one generic observation despite ball candidates in four sampled frames. The model/transport work; useful football play-by-play remains the main unfinished component.

## New experimental iteration in the current repository

Added match-roster validation/import, configured kit colours, repeated Tesseract jersey evidence, conservative unknown handling and evidence-only player introduction. Local-service mode only. Names require repeated legible readings; no possession or rule event is inferred from identity. Imported producer backups exclude events, scores and facts.

Latest checks: **26 Python tests and 23 subtests**, **18 TypeScript/domain tests**, and TypeScript checking passed. Actual OCR passed on a synthetic readable-jersey control. Real-football identity precision/coverage, new UI browser integration, current-iteration production smoke and publication remain pending. These source changes are newer than the deployed baseline; do not present them as already published or validated identity recognition.

## Remaining objective

The persistent full-product goal remains active. Automatic football action recognition, justified useful actor attribution, event/match state, replay handling, grounded narration scheduling, native screen-capture lifecycle checks, full-match reliability, service hosting and customer willingness to pay remain incomplete. No real-customer readiness, revenue or exclusive market gap has been established.

The latest action-model lead is a pinned accessible OpenSportsLab 12-class checkpoint, researched but not installed/executed/commercially cleared. See [the checkpoint snapshot](research/action-checkpoint-availability-2026-10-17.json). Review temporal causality/runtime and artifact conditions before integration.

## Scope and preservation

The user chose video-first football commentary after earlier digital-card and operator-assisted ideas. Earlier card/recruiting research and its approval checkpoints are historical context, not current implementation instructions. The original `universal_digital_card_studio_plan.md` is untracked user context: leave it untouched and uncommitted.

The user reports Premier League hackathon permission and requested the supplied branding. Bundled sample footage has separate attribution manifests and is not an archive download. Use free authorized speech; no unconsented celebrity clones or paid services were introduced. Preserve owner-private access, existing user data, ignore rules and source manifests. Model weights, runtime uploads, voices and databases remain ignored.
