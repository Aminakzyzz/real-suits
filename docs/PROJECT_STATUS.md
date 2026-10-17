# Project status and continuation record

Updated 17 October 2026, Europe/Berlin. Read the [full Claude handoff](handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md) and root `CLAUDE.md` first. Earlier research implementation-status statements are historical.

## Latest verified publication

**https://touchline-matchday-desk.socialpony16.chatgpt.site** remains owner-private. Platform source `2cccbaf1aa167a901c57e429149a459b6ccfdcba`; version `appgprj_6ad2c952011881918cf3fe71b87fdfab~appgver_49271715232881918fe3e9ae4dadf123`; deployment `appgdep_6ad384c199848191adcb75228b555d10` succeeded at `2026-10-17T14:23:16.970361+00:00`.

Experimental roster controls are published. Real app/service integration passed for roster extraction, kit validation, unknown-player fallback, actual Piper audio and exports. A delayed file read could previously attach the old roster after switching matches; this regression was reproduced and fixed. Setup controls wait for client initialization, and pending roster reads block analysis.

Latest frontend checks: type checking, **18 domain tests**, **eight development Chrome workflows**, and **two local production roster workflows**. A fresh local production smoke passed real ONNX inference, speech dispatch, captions, producer desk and anonymous API boundaries. **Actual hosted private studio QA** also passed: nine real boxes, speech dispatch, captions and no page errors. Hosted QA used documented origin-scoped Sites service admission; it does not verify ordinary OAuth login or visitor identity. The Python service remains separate/local.

Read [the latest verification](product/roster-integration-verification-2026-10-17.md) and [evidence](product/roster-validation-evidence-2026-10-17.json). The earlier complete 16.25-second CV/Piper integration remains in [the baseline record](product/vision-verification-2026-10-17.md). Local production preview needs a clean restart after builds; hot asset state produced obsolete-hash 404s during QA.

## Actual remaining requirements

The full-product goal remains active. The current narrator still produces sparse generic descriptions. Automatic useful football actions, justified actor attribution, match/replay state, meaningful narration scheduling, native capture lifecycle, continuous synchronization, full-match reliability, inference hosting and customer willingness to pay remain incomplete. No revenue, exclusive market gap or customer readiness has been established.

Repeated jersey/kit evidence is experimental. Synthetic OCR controls and mismatched-roster abstention do not establish real-football accuracy. Generic detections include people who may be spectators or officials; on-pitch eligibility and labelled negative cases are required. Browser overlays expire between model results, so smooth continuous overlays are not established.

An actual OpenSportsLab checkpoint now runs in isolated CPU research, with a bounded causal proposal contract and ten tests. The most recent full Python suite passed **36 tests plus 23 subtests**; no backend implementation changed during the UI continuation. Short rolling, dense and full-window diagnostics did not establish useful actions: paced short footage took 35.28 seconds and returned no proposals; an unpadded control had no foreground winner above threshold. None entered customer narration/scoring. Read [the action evaluation](research/action-model-first-evaluation-2026-10-17.md), [raw evidence](product/action-model-evidence-2026-10-17.json) and [setup](../services/vision/research/README.md).

A direct hackathon media URL was requested asynchronously for stronger broadcast-domain evaluation. Existing code work can continue without the answer. Do not repeat completed checks without relevant changes or unresolved concerns; focus on the remaining football and reliability requirements.

## Scope and preservation

The user chose video-first football commentary after earlier card/recruiting and operator-assisted ideas. Their original `universal_digital_card_studio_plan.md` is untracked context: leave it untouched/uncommitted. Historical document approval checkpoints do not replace current user authorization.

The user reports Premier League hackathon permission and requested the supplied branding. Bundled sample footage has its own attribution; it is not a Premier League archive download. Use free authorized voices. No celebrity clones or paid services were introduced. Preserve owner-private access, existing data, source manifests and ignore rules. Models, voices, uploads, databases and credentials do not belong in Git.
