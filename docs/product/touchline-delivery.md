# Touchline Desk delivery evidence

Date: 17 October 2026. Product: a producer-assisted football commentary desk for small clubs and independent streamers.

## Product decision

The user's latest instruction explicitly authorizes researching broader ideas, independently selecting one and developing an end product. It supersedes the earlier research-before-implementation checkpoint. The [pivot research](../research/product-pivot-2026-10-17.md) compares five directions and ten primary sources. Touchline was selected for feasible delivery and access to club operators; no proven originality, customer demand or revenue is claimed.

## Actual implementation

The app is in `apps/touchline`. Match data is schema-validated; confirmed events produce deterministic commentary in three languages, scores, statistics and captions. The user can edit rosters, enter approved facts, operate/correct a match, choose device narration, inspect local footage, preview overlays, export production files and restore a JSON project.

Authenticated cloud storage uses D1. Write routes authorize the owning user, reject cross-origin mutations and check match versions. Viewer routes use separate revocable read keys and expose no owner identity or write credentials. Browser drafts and cloud matches are distinguished in the interface. The host's private audience remains a separate access boundary.

## Verification completed

- `npm test`: **13 passing domain tests**, including correction, idempotent event retries, own goals, event-time scores, three languages, clock transitions, roster validation, substitutions, CSV formula protection and grouped SRT timing.
- `npm run typecheck`: passed.
- `npm run test:e2e`: **6 passing Chrome browser tests**, covering actual event/roster/export/import flows, refresh persistence, cloud saves, version conflicts, unauthorized writes, cross-origin rejection, read-only viewer output, revocation, foreign-owner denial, identity-header spoof rejection in local preview, mobile navigation/overflow, speech-command dispatch and synthetic local-video timestamps.
- Production Worker build through the Sites build helper: passed, including all application/API routes and the D1 binding.
- `node tests/production-smoke.mjs`: passed against the built Worker at port 5174. Verified real page/assets, a client-side goal entry, absence of uncaught browser errors and rejection of an unauthenticated cloud request.
- Desktop/mobile screenshots were inspected. Local D1 migration was applied to an isolated preview database.

These checks do not independently prove audible voice quality, external OBS capture, native hosted sign-in on every customer browser, or a full unattended season of operation. Speech-command testing uses a stub to observe dispatch; it is not an audio-quality evaluation.

## Hosted provenance

- Site: `appgprj_6ad2c952011881918cf3fe71b87fdfab`
- Platform source commit: `781eca3c00dfaae5e23a4fe24cddbeab0700b601`
- Saved version: `appgprj_6ad2c952011881918cf3fe71b87fdfab~appgver_2253b00def0c8191b948dbccb19f1e4d`
- Deployment: `appgdep_6ad2cc87d4b0819182f1ab1222373b14`
- Publication status: **succeeded**, confirmed by the native deployment-status result.
- Private production URL: https://touchline-matchday-desk.socialpony16.chatgpt.site

The publication uses an isolated ignored checkout, keeping the user's GitHub worktree intact. No source credentials or runtime database files are included. The platform repository contains the exact source packaged for that version. The main GitHub repository additionally retains research, operating documentation and the production smoke script.

## Pilot boundaries and commercial next step

This is a working first product for supervised rehearsals and pilots. It is not the autonomous television-game vision system in the user's example: events are operator-confirmed, commentary is template-based, and voices come from the device. There is no player recognition, paid league-data feed, voice cloning, downloadable narration track, live-video retransmission or subscription checkout. Those capabilities are not simulated in the UI.

Hosted access starts private. External viewers and OBS must pass the hosting audience gate; a read key does not bypass it. Use a deliberate hosting-sharing decision before giving external viewers access. Local operation is available through the repository startup instructions.

A practical first commercial experiment is a paid setup/rehearsal for one club, followed by one permitted match and a repeat-use decision. The research proposes testing €9/match or €19–29/club/month, but neither price nor demand is validated. There are no fake paid plans or checkout buttons. Review the [operator guide](touchline-operator-guide.md), test the actual production machine's voice and OBS setup, retain project backups and agree operator support before a live customer broadcast.
