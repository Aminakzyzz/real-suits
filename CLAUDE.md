# Continuation entry point

Read `docs/handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md` first. It is the
latest implementation checkpoint, prepared at the user's explicit request to hand
the work to Claude. Earlier handoffs describe the pre-implementation research.

The app is `apps/touchline`; the optional local inference/audio service is
`services/vision`. Preserve the existing repository and user changes. The user's
original `universal_digital_card_studio_plan.md` is untracked context and must not
be committed or rewritten without instruction.

The published baseline runs real generic person/ball detection and conservative
visual observation narration. The newer repository iteration adds experimental
roster/kit/jersey identity evidence, not yet integrated-browser/real-football
validated or published. Latest Python suite: 36 tests plus 23 subtests passed. The prior frontend
checkpoint passed 18 TypeScript/domain tests and type checking. Do not claim reliable
named-player play-by-play or automatic rule-event/score recognition is done.
Subsequent production verification and private deployment succeeded. Read
`docs/product/vision-verification-2026-10-17.md` for the latest evidence and
remaining quality gaps. The current narration remains too generic for the full
product objective, despite working inference/audio transport.

The user reported Premier League hackathon footage permission and expressly
requested the supplied league branding. Proceed within that scope. Bundled sample
footage has separate attribution manifests. Use free authorized speech; do not
introduce unconsented celebrity voice clones or paid services without authorization.

Avoid worker-loading regressions: the browser detector uses a Vite `?worker`
constructor, static pinned external ONNX Runtime ESM import, and
`worker.format = 'es'` in Vite. Verify the production Worker, not only a standalone
Vite harness, before publishing.

The action checkpoint has now been executed in isolated CPU research, with a
bounded causal proposal module at `services/vision/touchline_vision/actions.py`.
Read `docs/research/action-model-first-evaluation-2026-10-17.md`: the actual
short/long-window runs did not establish useful football actions or live CPU
performance. This adapter is not enabled in customer narration/scoring. Preserve
that boundary until representative labelled evaluation supports adoption.
