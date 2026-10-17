# Roster integration, regression fixes and private publication

Updated 17 October 2026. This supersedes the earlier handoff's pending statements
about roster UI integration and publication. It does **not** establish reliable
footballer identification, action recognition or customer readiness.

## Published release

**https://touchline-matchday-desk.socialpony16.chatgpt.site**

- Platform source: `2cccbaf1aa167a901c57e429149a459b6ccfdcba`.
- Version: `appgprj_6ad2c952011881918cf3fe71b87fdfab~appgver_49271715232881918fe3e9ae4dadf123`.
- Deployment: `appgdep_6ad384c199848191adcb75228b555d10`.
- Native result: `succeeded`, `2026-10-17T14:23:16.970361+00:00`.
- Audience remains owner-private: one owner, no groups or added viewers.

The website includes the experimental roster controls. The Python inference/OCR
service is still separate and local; this publication does not provision remote
inference. Browser mode works independently. No action-model research adapter was
enabled in customer narration or scoring.

## Failures found and fixed

A controlled delayed file read reproduced a real bug: after switching sources,
the old roster could finish loading and attach to the newly selected match.
Roster reads now have a generation guard; source/engine changes invalidate
pending reads and clear the lineup. Reading a roster blocks analysis, and stale
completion cannot restore a cleared/obsolete roster.

Setup controls now remain disabled until client initialization, preventing early
clicks on server-rendered controls from being lost during cold startup. The
disabled fieldset was also checked in the actual server-rendered production HTML.
Kit collisions are reported with a readable message before session creation.
The empty browser-mode roster wrapper was removed, layout bounds were retained,
and the new TypeScript code was formatted.

## What passed

- TypeScript checking and **18 domain tests**.
- **Eight Chrome workflows** against the real development app, including two new
  roster/service tests and all six existing producer-desk workflows.
- **Two roster workflows against the packaged local production Worker**. Its
  trusted identity headers were explicitly simulated only on loopback. The dev
  sign-in route is absent from a production Worker; no app authentication bypass
  was added. This check is not an ordinary hosted OAuth test.
- Real model/session processing with the imported roster, actual Piper speech,
  WAV/VTT delivery and the unknown-player fallback. The observed 15-second run
  processed **15 frames**, enabled identity processing for all 15, emitted no
  supported player names and produced one generic neural utterance.
- Producer-backup events, scores and player facts were excluded from the request.
  Kit edits survived the request/response; conflicting colours blocked creation;
  engine changes cleared roster state; a 390-pixel layout had no overflow.
- Actual local production browser inference, speech dispatch, VTT download,
  preserved producer desk and anonymous protected API responses of 401. The
  final fresh-process run captured eight detection boxes and no page errors.
- **Actual hosted private studio**, using origin-scoped Sites service admission:
  real ONNX inference, nine visible boxes, speech dispatch, 112-byte VTT and no
  page errors. Recorded at `2026-10-17T14:26:42.114Z`.

The full Python suite most recently passed **36 tests plus 23 subtests** in the
preceding action-model checkpoint. No backend implementation changed in this
roster-UI continuation, so that result was not rerun merely to repeat it.

## Timing and verification boundaries

Browser overlays deliberately expire when their observation becomes old. A
diagnostic observed fresh boxes alternating with expiry gaps at approximately
1.1–1.2-second inference latency. The smoke test now waits for an actual fresh
detection rather than assuming speech dispatch and overlay refresh occur in the
same render. It does not retain stale boxes or substitute fabricated detections.
Smooth continuous overlays and sustained playback synchronization remain open.

Rebuilding while Wrangler was running also left the local server requesting old
asset hashes and returning 404. A fresh Worker start resolved this; final smoke
ran against the clean packaged build. Restart local production preview after a
build rather than treating its hot asset state as deployment evidence.

The hosted check uses the documented Sites admission bearer, scoped only to the
selected Site origin, with redirects prevented from forwarding it. External
model/CDN requests receive no credential. The credential stays in memory/stdin,
is never logged or stored, and supplies no visitor identity or connected-app
consent. Thus the check proves hosted browser-mode functionality, not ordinary
OAuth sign-in or authenticated hosted service/record operations.

Audio dispatch is instrumented; actual Piper WAV generation is separately
exercised by the service test. No human pronunciation or expressive-quality
review is implied. The synthetic mismatched roster intentionally tests
abstention and request integrity, not football identity precision. Generic
person detections can include spectators/officials; repeated kit/jersey evidence
still needs an on-pitch eligibility layer and independent real-football labels.

## Reproduction and records

See [the evidence JSON](roster-validation-evidence-2026-10-17.json) for immutable
publication IDs, archive/source hashes, actual session counts, timing diagnostic
and hosted browser result. Credentials and owner identifiers are excluded.

```sh
# Start the dev app and optional service/Piper/Tesseract first, then from apps/touchline:
npm run typecheck
node --experimental-strip-types --test tests/domain.test.ts tests/league.test.ts tests/roster.test.ts
npm run test:e2e

# After packaging/building, start a fresh local production Worker on 5174.
# Simulated trusted identity is rejected for non-loopback target hosts:
TOUCHLINE_TEST_URL=http://127.0.0.1:5174 TOUCHLINE_PRODUCTION_WORKER_TEST=1 \
  npx playwright test tests/roster.e2e.ts
TOUCHLINE_TEST_URL=http://127.0.0.1:5174 node tests/production-smoke.mjs
```

`scripts/verify-hosted-studio.mjs`, run from the repository root, accepts one
newline-terminated JSON object containing the selected Site URL and temporary
Sites admission token on hidden stdin. Obtain supported service access through
the Sites tool; never put its token in a command argument, environment file or
handoff. It writes only sanitized evidence/captions and an ignored screenshot
under `artifacts/hosted-studio/`. This script is outside the website source, so it
does not change the published runtime or introduce a production authentication
endpoint.

Next work remains representative footage and identity/action evaluation,
on-pitch filtering, useful commentary scheduling, actual native screen-capture
lifecycle verification, full-match reliability, hosting and a permitted customer
trial. The active product goal is still incomplete.
