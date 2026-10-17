# Continuation entry point

Read `docs/handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md` first. It is the
full consolidated implementation report prepared for Claude continuation. Latest
UI/publication evidence is in
`docs/product/roster-integration-verification-2026-10-17.md`.

The app is `apps/touchline`; the optional local inference/audio service is
`services/vision`. Preserve the existing repository and user changes. The user's
original untracked `universal_digital_card_studio_plan.md` is context: do not
commit or rewrite it inadvertently.

The private studio is published, including experimental roster controls. The
actual hosted browser model, narration dispatch and captions passed QA using
origin-scoped Sites service admission, not ordinary OAuth login. Real local
service inference/Piper/exports and unknown-player fallback also passed. Latest
frontend checks: type checking, 18 domain tests, eight development Chrome
workflows and two local production roster workflows. A delayed-file bug that
could associate the old roster with a new source was reproduced and fixed.

Identity accuracy/player eligibility, useful football action recognition, match
state and full-match/customer validation remain incomplete. Generic people can
include spectators/officials; repeated jersey/kit evidence is not validated
football identity. Do not claim reliable named-player play-by-play or automatic
rule-event/scoring. Python inference remains a separate local service.

The action checkpoint has been executed in isolated CPU research, with a bounded
causal proposal contract at `services/vision/touchline_vision/actions.py`. Read
`docs/research/action-model-first-evaluation-2026-10-17.md`: actual short/long
window runs did not establish useful actions or live CPU performance. It is not
enabled in customer narration/scoring. Latest Python suite: 36 tests plus 23
subtests passed; no backend implementation changed during UI verification.

The user reports Premier League hackathon permission and requested the supplied
branding. Bundled footage has separate manifests and is not an archive download.
Use free authorized speech; no unconsented celebrity clones or paid services.
Preserve owner-private Site access and media provenance. The full product goal
remains active.

Keep the Vite `?worker` import, static pinned external ONNX Runtime ESM import
and `worker.format = 'es'`. Restart local production Wrangler after rebuilding;
hot asset state can request obsolete hashes. Verify the actual production
Worker and meaningful user flows before publication. The root hosted-QA script
accepts origin-scoped service admission only on hidden stdin; never persist or
log tokens, and do not mistake admission for visitor identity.
