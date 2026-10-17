# Touchline operator guide

## Prepare a real match

1. Select **New match → Set up a new match**. The previous browser draft is replaced; export a JSON backup first if you need it.
2. In **Teams & players**, enter the fixture, competition, venue, club names, short names and colours. Add shirt numbers and players. Save the form.
3. Enter only player facts you have verified and may publish. These appear verbatim on the viewer overlay. Facts and operator notes are not automatically translated.
4. Sign in and **Save match to cloud** if you need recovery on another device or a read-only cloud overlay. Without sign-in, the working draft remains on the current browser. Export JSON regularly.

The demo fixture is fictional. Load a new match for actual coverage.

## Call the match

Choose the playing period and start the clock. Correct the time with `minutes:seconds`. Choosing first half resets the clock to zero; second half sets it to 45:00. Half-time and full-time stop the clock. Touchline does not decide when a referee's whistle occurs.

Select a team and, if known, the player. Choose a moment and confirm it. A goal also counts as a shot on target; do not record a second shot for the same attempt. Saves are independent recorded events, so incomplete logging is not a full set of match statistics. Own goals are awarded to the other team.

A substitution requires two different players from the selected team. Referenced players cannot be removed from the roster until their associated events are corrected or removed.

Use **Undo last event** or a feed item's **Correct** control to remove a mistake. The score and stats recalculate from the remaining log. Original commentary lines use the score as of each event, rather than the final score. This release removes incorrect events; to change one, remove it, set the appropriate clock time and record its replacement.

Shortcuts when focus is outside a form/button:

| Key | Action |
| --- | --- |
| G | Goal |
| S | Shot off target |
| T | Shot on target |
| C | Corner |
| Y / R | Yellow / red card |
| U | Substitution |
| Space | Start/pause the clock |
| Z | Undo last event |

## Narration and footage

In **Studio**, choose English, Spanish or French and a commentary style. Choose a device voice and test it. **Voice on** reads new confirmed events; **Listen** reads an existing line. Playback uses browser speech synthesis, not a cloned commentator voice. Some voices need network access; availability depends on your operating system and browser. Speech playback does not create a downloadable audio track.

The commentary engine uses structured templates and recorded context. It does not use an external language model or identify events automatically.

For a recording, open a local video in Studio, pause/seek to a moment, then switch to Live desk and record it. The event retains the last source playhead time for captions. Return to Studio to move to another moment. Footage is not uploaded. Reopening a project requires reselecting the local video; backups contain event timestamps, not the video itself. Use footage you are authorized to process and publish.

## Overlay and exports

**Open overlay** opens a clean, transparent viewer with the score, commentary, player fact and optional sponsor. Browser drafts have same-browser previews only. Cloud matches have separate read-only links. Anyone allowed through the hosting audience with that link can read that match's public production information, but cannot edit it.

For OBS, use the overlay URL as a Browser Source at 1920 × 1080. Verify that OBS can pass the host's authentication/access requirements. A private Sites deployment does not become publicly readable because a link was copied. This initial hosted demo is private. You can preview in an authenticated browser; change hosting access deliberately before an external broadcast. Touchline does not transmit your camera feed or broadcast audio to OBS.

**Revoke old overlay link** changes its read key. Replace the old URL in every viewer/OBS source. A disconnected viewer can retain its last frame with an error message; it is not proof of a current match state.

**Match report** provides:

- **JSON:** full project backup, with the clock paused at export time. Import creates a new browser draft.
- **CSV:** confirmed events and commentary, with escaping and protection against common spreadsheet formula prefixes.
- **SRT:** captions at source-video time where recorded, otherwise match-clock time. Simultaneous events share a caption. Review timing in the video editor before publication.
- **Markdown:** readable event report and score.
- **PNG:** a 1600 × 900 result card, including your match partner if set.

## Recovery and shared work

Cloud changes require the current match version. If another tab saved a newer version, the desk loads the latest response and asks you to retry. It does not silently overwrite it. If a cloud save fails, read the error and check Saved matches before retrying. There is no automatic offline-to-cloud merge.

Local drafts are not an archival backup. Export JSON and retain it outside browser storage. Clearing browser data deletes browser drafts. Deleting a cloud match revokes its viewer link; an exported backup can be imported as a new match. Prefer one event operator initially, even though version checks protect against stale changes.
