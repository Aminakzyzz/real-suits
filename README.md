# Touchline Desk

A football vision and commentary prototype for small clubs and independent producers. The new studio runs actual on-device person/ball detection, conservative visual narration, local video and live-window input, with a Premier League-inspired interface and sourced league information.

The application lives in [`apps/touchline`](apps/touchline). The new studio is at `/`; the existing producer desk at `/desk` turns **operator-confirmed match events** into commentary, a correctable scoreboard, player-fact overlays and exports. An optional [Python service](services/vision/README.md) adds persistent inference sessions and free WAV speech/caption exports.

Current vision narration describes observations with deterministic rules. The latest local-service iteration adds experimental roster/kit/jersey identity evidence; real-football accuracy and integrated UI verification remain pending, and it is newer than the deployed baseline. It does **not** yet provide reliable named-player play-by-play, football actions/goals or scores, an authenticated league feed, cloned voices or broadcast-quality accuracy. The studio is deployed privately at [Touchline](https://touchline-matchday-desk.socialpony16.chatgpt.site). Read the [latest production verification](docs/product/vision-verification-2026-10-17.md) and [full implementation report and Claude handoff](docs/handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md).

## Run locally

Requires Node.js 22.13+ and npm. Run from `apps/touchline`:

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_classy_toro.sql
npm run dev
```

Open the printed loopback URL, normally `http://127.0.0.1:5173`. The studio includes licensed real match footage; the producer desk's sample fixture uses fictional teams. No API key is required. Local development includes a loopback-only simulated sign-in; hosted sign-in is supplied by Sites.

The SQL command is for the **first local database setup only**. Preserve the `.wrangler/state` folder; do not replay an applied migration. Hosted deployments apply migrations separately.

## Included

- Editable clubs, rosters, shirt numbers and approved player facts.
- Match clock, halves, goals, own goals, attempts, saves, corners, cards and substitutions.
- Event correction with derived score and stats; keyboard shortcuts and confirmation dialogs.
- Three commentary languages, three narration styles and selectable device voices.
- Local video annotation with source-time captions; video files stay on the device.
- Browser draft recovery, authenticated cloud matches, owner-scoped APIs and concurrency checks.
- Read-only live overlay links and link revocation.
- JSON project backup/import, CSV event log, Markdown report, SRT captions and PNG scorecards.
- Responsive desktop and phone layouts.

## Validation

```sh
npm test
npm run typecheck
npm run test:e2e
```

Browser tests require a running dev server at port 5173, Google Chrome, and `ffmpeg` for the synthetic-video case. They cover actual user workflows, persistence, cloud mutations, access boundaries, conflicts, overlay revocation, voice-command dispatch and local-video timing. Audible voice quality and third-party OBS capture still require checks on the operator's own setup.

## Documentation

- [Latest build report and Claude Code handoff](docs/handoffs/BUILD_REPORT_AND_CLAUDE_HANDOFF_2026-10-17.md)
- [Production vision and neural-audio verification](docs/product/vision-verification-2026-10-17.md)
- [Optional local vision/audio service](services/vision/README.md)
- [Free speech engines and voice provenance](docs/product/free-speech.md)
- [Live vision/commentary research and technical decision](docs/research/live-football-vision-2026-10-17.md)
- [Claude handoff: end-to-end autonomous pipeline](docs/handoffs/CLAUDE_LIVE_PIPELINE.md)
- [Operator guide](docs/product/touchline-operator-guide.md)
- [Product decision and competitor research](docs/research/product-pivot-2026-10-17.md)
- [Delivery evidence and limitations](docs/product/touchline-delivery.md)
- [Project continuation state](docs/PROJECT_STATUS.md)

The hosted demo starts private. Live viewer/OBS access follows the hosting audience; possessing an overlay link does not bypass private-site authentication. Commercial pricing in the research is a proposal, not proven revenue. There is no checkout or paid-plan enforcement in this release.
