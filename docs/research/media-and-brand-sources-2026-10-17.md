# Media, Premier League design and current information sources

Source audit: 17 October 2026. This records downloaded artifacts and observed camera content, not model accuracy. Raw files and page snapshots are under ignored `artifacts/media/` and `artifacts/assets/`; the small licensed demonstration excerpts are under `apps/touchline/public/demo/`.

## Current default: Inter–Ajax U19

The final bundled default is **Inter–Ajax U19, 26 March 2012**, filmed by **zilupe**. The [Commons file](https://commons.wikimedia.org/wiki/File:Next_Generation._U19._Inter_vs_Ajax._Ajax_goal..webm) points to the [original Flickr page](https://www.flickr.com/photos/zilupe/7018838149/). Although Commons' external-source review is pending, the original Flickr page was fetched directly and its JSON-LD explicitly identifies [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/).

`public/demo/football.mp4` is the complete contiguous 16.250-second clip, re-encoded to H.264 yuv420p at 1280×720 and muted. Its SHA-256 is `9ef107eaf7b39c61f6511046a37f13de175b2f782c3ee4224c3118b018902b6c`, size 2,778,850 bytes. `public/demo/source.json` and `inter-ajax-source.json` preserve source, license, attribution and transformation details; source ID is `inter-ajax-u19-2012`. The player is closer to the action than the earlier Ajax–Utrecht sample. The title's goal label is source metadata, **not an input event label or a model-verified goal**.

A CPU comparison sampled 17 integer-second frames across the clip. RF-DETR produced ball candidates in 4 frames, as did each separately evaluated football-specific YOLO candidate. This is candidate coverage, **not recall or precision**; there is no full ground truth. Mean measured inference under the concurrent development workload was approximately 283 ms for native RF-DETR, 1,015 ms for YOLOv9 and 2,124 ms for YOLO26. These measurements do not include the entire commentary pipeline. Results are in ignored `artifacts/models/inter-ajax-full-clip-evaluation.json`. The Apache-licensed RF-DETR remains the shipped detector; the AGPL research candidates were not integrated.

The earlier Ajax–Utrecht and CC0 Latvia–Gibraltar files remain useful robustness samples. The default sample is **not a Premier League archive download**, and the app must not imply that it is.

## Earlier demonstration: retained as an alternative

**Ajax–FC Utrecht, Eredivisie, 4 December 2024**, filmed from the stands by **FCUFAN**. The [Commons file description](https://commons.wikimedia.org/wiki/File:Ajax_v_Utrecht_Dec_2024_edited.webm) identifies the original [FCUFAN video](https://www.youtube.com/watch?v=WN1AU7oJjRA), a **CC BY 3.0** license, and a Commons license review dated 25 February 2026. [License](https://creativecommons.org/licenses/by/3.0/).

This was downloaded from Wikimedia's published media URLs without accessing a YouTube stream, accounts or protected media. The 480p transcode was retained for camera inspection. The app excerpt was decoded from the 1080p transcode using normal HTTP seeking, rather than downloading the 2.63 GB original.

| App artifact | Measured result |
| --- | --- |
| `public/demo/ajax-utrecht.mp4` | Contiguous source interval **10:30–11:00**, 30.000 seconds, 1280×720, H.264, yuv420p, muted, fast-start MP4. |
| File size | 2,992,474 bytes. |
| SHA-256 | `5ec0ff3151b9dc0a73c47ba9bdd5c8bf3cc1e4879ecde2aa1ff1ae031bcf65c2` |
| `public/demo/ajax-utrecht-poster.jpg` | Frame from the app excerpt at 0.5 seconds. |
| `public/demo/ajax-utrecht-source.json` | Attribution, license links, original URL, source offset and transformation record. ID: `ajax-utrecht-2024`. |

The excerpt begins with a zoom on players behind a stadium safety net and returns to a wide shot with spectators in the foreground. Those are original camera changes. It contains actual match activity, but small balls, distant players, netting and crowd occlusion make this a difficult perception input. It does **not** establish Premier League broadcast accuracy. The known source-match title is metadata; it does not authorize fabricated player identities, match-clock values, scores or incident descriptions in generated commentary.

Attribution for display: **“Ajax v Utrecht Dec 2024 edited” by FCUFAN, via Wikimedia Commons, CC BY 3.0. Excerpted, resized, re-encoded and muted by Touchline.** Preserve the source watermark. The Creative Commons license does not imply FCUFAN, Ajax, FC Utrecht or the competition endorses this application.

## Additional downloaded footage

| Source | Provenance and suitability |
| --- | --- |
| [Latvia–Gibraltar, 31 March 2026](https://commons.wikimedia.org/wiki/File:Latvia-Gibraltar_football_2026-03-31.webm) | Own work by **Mārtiņš Bruņenieks / Papuass**, **[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)**. Downloaded original is 9,100,520 bytes, 16.903 seconds, 1920×1080, AV1/Opus; SHA-256 `3612e26baf7d57a83e1ab7aa176b8ef7551fa7fe991d821e15434e9f0b5c3fe3`. Behind-goal camera shows goalkeeper and smoke; little active play is visible. App alternative `public/demo/latvia-gibraltar.mp4` converts this to muted H.264 720p, with `latvia-source.json`. Useful robustness input, weak action benchmark. |
| [Ajax–Real Madrid 2019](https://commons.wikimedia.org/wiki/File:Ajax_v_Real_Madrid_2019.webm) | **Real Madrid**, **CC BY 3.0**, original YouTube Creative Commons license reviewed on Commons. Downloaded 12,352,281 bytes; SHA-256 `3d58ce945143b0ba74d090735028ab6b48e47fb8763c259dc1c48304565601fe`. Camera audit showed arrival, warm-ups and interviews. **Not selected as a live-match action sample**, despite its attractive Champions League title. The file description explicitly distinguishes Real Madrid's exclusive material from UEFA footage. |
| [Tom Fisk / Pexels aerial soccer video 3514371](https://www.pexels.com/video/a-game-of-soccer-being-played-in-a-soccer-field-3514371/) | Downloaded from the publisher's free-download link: 112,623,944 bytes, SHA-256 `9e4565bc0e99351ce2dbde2734fe9e2b4e00eafdee4d97c9f57accc5f28d206f`. Actual file probe: 2560×1440, 66.175 seconds, H.264/AAC, 30000/1001 fps. The page labels a 4K resolution, so trust the local probe for this downloaded variant. A clean overhead pitch view shows players and ball. A 45-second muted 720p inspection copy is in `artifacts/media/football-demo-45s.mp4`. **Not bundled as the default product clip.** |

The [Pexels license](https://www.pexels.com/license/) permits free use and modification, while its [terms, sections 5 and 8](https://www.pexels.com/terms-of-service/) separately restrict standalone redistribution, misleading endorsement, automated data collection and unauthorized machine-learning collection. Treat this as a stock playback/creative demonstration candidate, **not an automatically cleared training dataset**. The selected Commons clip has a clearer explicit reuse license.

The user has also reported Premier League hackathon permission. That remains the authorization basis for organizer-supplied Premier League footage when available. None of the files above is represented as a Premier League archive download. No archive credentials, protected stream extraction or DRM bypass were used.

## Current official Premier League design references

The [official homepage](https://www.premierleague.com/en) was fetched successfully. Its current resource revision was **v1.54.15**. The [published stylesheet](https://www.premierleague.com/resources/v1.54.15/styles/screen.css) supplied these observed design tokens:

| Token | Value |
| --- | --- |
| Premier League purple | `#37003c` |
| Green | `#00ff87` |
| Cyan | `#05f0ff` |
| Pink | `#ff2882` |
| Lilac | `#953bff` |
| Yellow | `#ebff00` |
| Soft surfaces | White and pale purple, including `#faf9fa`, `#f5f2f5`, `#ebe5eb`. |

The inspected hero uses large editorial panels, a compact navigation area, approximately 16px rounded panel corners and a 1408px maximum content width. These are references for an original product interface. Do not import the entire stylesheet, source implementation or proprietary font files into the application. The page uses PremierLeague font families; a separately licensed font or system stack is a straightforward substitute.

Official logo downloads, all successful HTTP 200 responses:

| Saved file | Official source | SHA-256 |
| --- | --- | --- |
| `artifacts/assets/pl-logo-dark.svg` | [Dark wordmark](https://www.premierleague.com/resources/v1.54.15/i/svg-files/elements/pl-logo-dark.svg) | `197e2195bb39b1a232b091692cdfddd1f2d69168649d4ff70c31ee2d1e1ac631` |
| `artifacts/assets/pl-icon-purple.svg` | [Purple lion](https://www.premierleague.com/resources/v1.54.15/i/svg-files/elements/pl-icon-purple.svg) | `84a1f516cf6862369ee25b2cd61ec0a2226476041f00992281fb5e4b4a1d7aa1` |
| `artifacts/assets/pl-icon-white.svg` | [White lion](https://www.premierleague.com/resources/v1.54.15/i/svg-files/elements/pl-icon-white.svg) | `5157c5f9f6d67bafa213043ec6099efb060a1b5aa03070b3d1ade6135d935e6e` |

The user expressly requested these logos and reported hackathon permission. Their public availability is not an open-source license or a statement of official product endorsement. Use the app's own name and identify the hackathon context plainly; do not invent a partnership or reproduce the official sponsor wall.

## Current official information feeds

The homepage identifies competition **8**, season **2026**, matchweek **7**, and a public sports-data base URL in its client configuration. The official client bundle exposes the following routes, which returned HTTP 200 to direct requests:

```text
https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v1/competitions/8/seasons/2026/matchweeks/7/matches
https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v5/competitions/8/seasons/2026/standings
https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v5/competitions/8/seasons/2026/matchweeks/6/standings
https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8/details
```

Snapshots: `artifacts/assets/pl-matches.json`, `pl-standings.json`, `pl-matchweek6-standings.json`, `pl-details.json`. `pl-data-provenance.json` records the source URLs, hashes and UTC snapshot timestamps from files created immediately after the successful responses.

The normalized application snapshot at `apps/touchline/lib/data/league-snapshot.json` was freshly collected at **2026-10-17T11:49:45Z**. It contains ten fixtures, twenty standings rows and the current official hero article. Each team includes a crest URL using the verified current format `https://resources.premierleague.com/premierleague25/badges/{numericTeamId}.svg`. Manchester City (`43.svg`) returned HTTP 200 and SVG content. The old `premierleague/badges/t43.svg` also worked, but the current client uses the `premierleague25` namespace without the `t` prefix. The guessed versioned `i/elements/badges/t43.svg` path returned 403 and must not be used.

For refresh, discover the active context rather than keeping Matchweek 7 in application code:

```js
const season = Number(html.match(/ACTIVE_PL_SEASON_ID\s*=\s*['"](\d+)['"]/)?.[1]);
const matchweek = Number(html.match(/ACTIVE_PL_MATCHWEEK_ID\s*=\s*['"](\d+)['"]/)?.[1]);
const blog = html.match(/\/en\/matchweek\/(\d{4})_(\d+)\/blog/);
const apiBase = html.match(/SDP_API\s*=\s*['"]([^'"]+)['"]/)?.[1];
```

Both forms agreed on `2026,7` in a fresh homepage fetch; the test record is `artifacts/assets/pl-discovery-test.json`. Prefer the explicit active variables; the blog route is an optional consistency check or fallback, since a homepage may contain links to older blogs too. Validate the values and API origin before requesting data. A failed discovery should retain a clearly dated snapshot or report unavailable, not silently imply that an old matchweek is current.

Observed JSON shapes:

```text
matches: {pagination:{_limit,_prev,_next}, data:[{
  matchId,kickoff,kickoffTimezone,period,clock?,ground,
  homeTeam:{id,name,shortName,score?,redCards?}, awayTeam:{...}
}]}
standings: {matchweek,tables:[{entries:[{
  team:{id,name,shortName,abbr},
  overall:{position,played,won,drawn,lost,goalsFor,goalsAgainst,points},
  home:{...},away:{...}
}]}]}
```

Normalized fixture kickoff timestamps convert the source London local time to UTC using the `Europe/London` timezone rules. Archive dates require their own historic timezone conversion; do not treat the current BST offset as permanent.

At collection, the match endpoint contained ten Matchweek 7 fixtures, with Everton–Chelsea in the first half and the remaining matches scheduled. The standings response explicitly reported **Matchweek 6**; do not imply it includes all Matchweek 7 results. Use the `kickoffTimezone` field: these dates were labeled **BST**, and local fixture text is not automatically UTC. Display a fetched-at time and the actual match period/status.

These are public website implementation endpoints, **not a verified supported commercial API contract**. Cache modestly, preserve provenance, validate JSON structure, handle timeouts and malformed responses, and show an unavailable/stale state with links to the [official matches](https://www.premierleague.com/en/matches) and [table](https://www.premierleague.com/en/tables/premier-league) if the source changes. Do not fabricate a fresh-looking fallback table. Current fixture/standings feeds are product context; they must not leak future final outcomes into commentary about an archive clip.

## Verification performed

- Inspected official page markup, its published stylesheet, logo files and client route declarations; downloaded two current official JSON responses and provenance snapshots.
- Decoded footage frames and contact sheets to distinguish actual play from warm-up/interview material.
- Used FFmpeg and FFprobe to create and inspect the small H.264 demo files. They contain no source audio, so the commentary pipeline cannot hear the original commentary.
- Recorded media hashes and source/license attribution. No detector, action recognizer, commentary or speech accuracy is claimed by this source audit.
