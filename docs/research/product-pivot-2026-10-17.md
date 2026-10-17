# Product pivot research — 17 October 2026

**Subsequent research:** this document explains the earlier operator-assisted delivery. The user now requests autonomous video-to-commentary. See [the later research](live-football-vision-2026-10-17.md), including a direct competitor, Liat.ai, that changes the market assessment. Do not treat the decision below as a restriction on the new implementation.

## Decision

Build **Touchline Desk**, a producer-assisted football commentary studio for independent clubs and match streamers. A volunteer enters confirmed match events; the studio maintains the score, prepares commentary, surfaces approved player facts, supports narration, and produces a transparent broadcast overlay and exportable match record.

This is a **commercial hypothesis**, not a proven market gap or a claim of originality. “AI commentary” and “football overlays” already have competitors. The opportunity to test is whether a small club values one dependable event-to-commentary workflow enough to replace its current combination of notes, scoreboard controls, and ad hoc narration. The user can reach clubs and associations, making this more testable than an undifferentiated consumer assistant.

The latest user instruction authorizes selecting and developing a product; it replaces the previous implementation checkpoint. This research therefore informs an immediately usable first product rather than another indefinite research gate.

## Five candidate products

| Candidate | Existing capability and competition | Initial decision |
|---|---|---|
| Discord screen-aware voice study companion | Gemini Live already offers conversational help with camera/screen context, including a free option [1]. Discord integration could offer group context and community convenience, but is not sufficient differentiation alone. | Defer: platform/media integration and recurring inference expense precede proof that users will pay. |
| Autonomous commentary over LaLiga/Premier League/Champions League video | CAMB markets generative commentary [3]; Spiideo offers automated sports production [4]. Recognizing each player and ball action requires several distinct vision capabilities [9]. | Defer full autonomy: a substantial data, rights, latency, and evaluation project. |
| Touchline Desk for small-club production | OBSFootball already provides football graphics and match controls [5]; ScoreLayer supplies inexpensive overlays [6]. Narration plus a controlled event record is a narrower workflow proposition. | Build a usable experiment, then test against these substitutes. |
| AI exam-revision pack from notes | Quizlet sells practice tests, learning modes and textbook solutions; its indexed US offer showed Plus at $35.99/year and Unlimited at $44.99/year [7]. | Technically simple, commercially crowded; no demonstrated specialist distribution advantage. |
| Voice recording to club committee actions | Otter already provides transcription, summaries, action items and integrations; Basic includes 300 monthly minutes, with Pro listed at $16.99/user/month or $8.33/month billed annually [8]. | A narrowly localized committee workflow might sell, but a generic transcription wrapper is weak differentiation. |

Prices are public-page snapshots, not purchase quotes; currency, tax, billing periods, promotions and localization matter. Quizlet's search-indexed page was accessible in search but returned 403 on direct fetch, so its price has lower verification confidence than the directly fetched pages.

## What the football competitors already offer

**CAMB.AI:** Its own site advertises sports localization, audience personalization, generative commentary and monetization for feeds without an existing voice. The page uses a sales contact rather than publishing a directly comparable small-club commentary tariff. This establishes that automated narration is an existing category; it does not establish affordability, quality or suitability for our reachable clubs [3].

**Spiideo:** Play combines AI cameras, third-party camera ingestion, remote production, graphic overlays, replay and commentary workflows, plus distribution and highlights. Pricing on the inspected product page requires contacting its media team. Its breadth makes competing as another end-to-end autonomous broadcaster unattractive for an initial small product [4].

**OBSFootball:** Its inspected pricing page lists two welcome matches, **€4.90 per match**, **€19/month Pro**, and **€39/month Studio**, including applicable taxes. Current functionality includes teams, players, lineups, goals, cards, substitutions, clock, graphics, club operators and sponsor placements. Some statistics/social-output features are explicitly planned. A basic scoreboard or lineup tool would compete directly with an inexpensive specialist [5].

**ScoreLayer:** Free includes **three live overlay hours/month**, custom teams/colors/logos and streaming-software support. Monthly is **$12.99** with unlimited hours, removed branding and team features; annual is **$149.90**. This sets a low price reference for overlay-only value [6].

Public pages do not prove competitors lack reliable event-linked narration or a particular review workflow. Those omissions remain questions for product trials, not negative feature claims.

## Technical boundary that makes the first product practical

The first release uses an **operator-confirmed event log**, rather than claiming to watch a match autonomously. Goals, cards and substitutions must produce a consistent score and timeline, survive refresh, and support correction. Player facts must be explicitly entered or imported and approved; the system must never invent historical statistics or identify a player from video without evidence.

Browser narration can make the product immediately demonstrable without a paid key. Device/browser voice availability varies: `speechSynthesis.getVoices()` returns the voices available on that device [10]. Language selection is therefore not a promise that every customer has a matching installed voice. Provide text and export when speech is unavailable, and distinguish browser speech from any optional external AI writing or premium speech integration.

Full vision remains a future module: SoccerNet separately benchmarks ball actions, player tracking/re-identification, jersey recognition, calibration and captioning [9]. Detecting a ball is not equivalent to identifying its possessor and generating accurate contextual commentary. A production claim would require licensed representative footage, identity/event ground truth, error and latency evaluation, and a correction interface. Professional footage, live statistics and redistribution permissions must be verified before incorporating them; this report does not establish those permissions.

For the Discord idea, official documentation says DAVE end-to-end encryption became required for supported calls from 1 March 2026 [2]. That adds a real media-client requirement. This research **has not verified a supported bot API for consuming arbitrary Go Live screen shares**. Do not base delivery on undocumented endpoints or user-account automation. An explicit browser screen-share companion would be a separate feasible implementation route, but still needs a paid-use hypothesis.

## Initial offer and revenue experiment

Deliver one complete rehearsal: set up two squads and approved facts, start/stop a match clock, record and correct events, review/speak commentary, open a broadcast overlay, and export/import the match. Use fictional demo teams; retain customer control over exported records. Make persistence and recovery observable.

Test **€9 per match** and **€19–29 per club/month** as interview/pilot offers, not established willingness to pay. A managed setup/rehearsal service could be an additional initial offer. Voice/API costs, payment fees, support and taxes must be measured before claiming profitability. For illustration only, 20 clubs at €19/month is €380 gross monthly revenue before all costs; it is not a forecast.

The useful commercial test is a real operator running a whole rehearsal, then a permitted match, and choosing to pay for another. Track event-entry effort, score/correction accuracy, narration usefulness, recovery failures and repeat use. If clubs only want a scoreboard, the existing low-cost competitors are a reason to change direction, not add speculative features.

## Primary sources

1. [Google: Gemini Live with free camera/screen sharing](https://blog.google/products-and-platforms/products/gemini/gemini-app-updates-io-2025/).
2. [Discord: voice connections and DAVE requirements](https://github.com/discord/discord-api-docs/blob/main/developers/topics/voice-connections.mdx).
3. [CAMB.AI: generative commentary and sports localization](https://www.camb.ai/).
4. [Spiideo Play: production capabilities](https://www.spiideo.com/spiideo-play/).
5. [OBSFootball: pricing and current/planned features](https://obsfootball.com/pricing/).
6. [ScoreLayer: pricing](https://www.scorelayer.live/pricing).
7. [Quizlet: upgrade plans](https://quizlet.com/upgrade?redir=%2Ffeatures%2Fhow-quizlet-works).
8. [Otter: current pricing and feature comparison](https://otter.ai/pricing).
9. [SoccerNet: benchmark task catalog](https://www.soccer-net.org/tasks).
10. [MDN: available speech-synthesis voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices).
