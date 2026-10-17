# First actual temporal action-model evaluation

17 October 2026. This follows the full Claude handoff. The previously inspected
OpenSportsLab checkpoint was downloaded, hash checked and executed in an
isolated CPU research environment. It is **not** integrated into customer
narration or scoring. The full autonomous product remains incomplete.

## What changed

- Added `services/vision/touchline_vision/actions.py`: bounded rolling context,
  fixed presentation-time sampling, delayed non-maximum suppression, immutable
  evidence-bearing proposals and explicit cut/gap/seek resets.
- Added a research-only RegNet-Y/GSM/bidirectional-GRU adapter and sequential
  evaluator. All 446 checkpoint state keys matched. No full OpenSportsLib,
  DALI/CUDA installation, paid endpoint or production-model substitution.
- Added ten contract tests. The complete Python suite now passes **36 tests and
  23 subtests**. No app frontend files changed in this continuation.
- Saved actual probabilities, windows, runtime and source/model hashes in
  [the evidence record](../product/action-model-evidence-2026-10-17.json).

## Actual results

CPU runs used two threads. Runtime varied under the shared development workload;
these are individual measurements, not stable hardware benchmarks.

| Run | Inputs / method | Observed result |
|---|---|---|
| Initial coarse diagnostic | Full 16.25-second Inter–Ajax sample, 34 known frames on a 480 ms grid; short input padded to 100. | 11.52 seconds inference. Mostly background; late THROW IN 0.598 and DRIVE 0.896 winners. Inspected late frames are spectator-obstructed and provide no clear visual support for those actions. |
| Paced rolling | Same sample, intended 2 FPS, minimum 20 frames, update every 4 seconds, 2-second media holdback. Two actual model calls at evidence PTS 9.5 and 13.5 seconds. | No proposals. Calls took 11.77 and 13.24 seconds. Processing wall time 35.28 seconds for the 16.25-second source; approximately 2.17× duration, including intentional pacing. Peak RSS approximately 2.25 GiB. |
| Dense sampling ablation | 100 known frames spanning PTS 1.833–5.958 seconds; requested 25 FPS on a 24 FPS source; no temporal padding. Explicit departure from the published extraction FPS. | Every winning label was background. Inference 22.86 seconds. This does not reproduce the publisher benchmark or establish live performance. |
| Full-window control | Separate licensed Ajax–Utrecht recording, contiguous source 10:00–11:00. At 2 FPS, last 100 frames span excerpt PTS 10.0–59.5 seconds; no temporal padding. Offline diagnostic. | 99 background winners, one DRIVE winner at 0.494. Inference 12.20 seconds. No foreground winner reached the default 0.6 proposal threshold. |

The full-window control matters: missing context in a short padded input is not
the only unresolved issue. Its camera is high in the stands, players/ball are
small, netting/crowds intrude and the camera reframes. The footage differs from
typical broadcast training data. We have not isolated domain shift from all
preprocessing/model issues, and have not measured labelled event accuracy.

**Decision:** keep this checkpoint as an executable research baseline. It has
not established sufficient usefulness or latency for the product on these
inputs. Do not turn weak model scores into automatic goals, named possession or
customer commentary; do not claim this small evaluation disproves the model's
published benchmark or measures its general precision/recall.

## Causality and runtime boundaries

The inspected architecture uses bidirectional GRU and temporal shifts. Offline
predictions can depend on later frames. Rolling inference supplies only frames
already decoded, then records both event PTS and the latest evidence PTS.
`confirmationDelayMs` is media-time evidence delay, **not** total inference or
viewer latency. Initial warmup, update cadence and the measured runtime add delay.

Candidate records are immutable and keep actor/team unknown. A context-sensitive
test demonstrates that a later suffix which would change offline predictions
cannot rewrite a previously emitted prefix. Other tests cover decoder-buffer
reuse, bounded memory, sampling drift, resets and invalid backend probabilities.
This validates the adapter contract, not football semantics or calibration.

The standalone research runner has no replay classifier, no reliable shot
classifier, no match-state confirmation and no commentary/TTS integration for
these candidate actions. The already verified generic-CV/Piper pipeline remains
a separate baseline. No action was inferred from the clip title or existing
manual records; original human audio is absent from the model inputs.

## Provenance and reproduction

The [publisher checkpoint](https://huggingface.co/OpenSportsLab/OSL-loc-snbas-2025-e2e)
is pinned at `54e24a663a5a0ed057ef12cf16d9460d270ddc6e`, SHA-256
`2352f17f60de586d7531b07f88ae4d618b46c1f8a4904837b0493ea15767307c`.
The [source](https://github.com/OpenSportsLab/opensportslib) was inspected at
`b2fe8f16a35336d93b1b0eabe1741bbbbc36cd68`. The adapter reconstructs the network
and imports only a hash-checked external GSM file retaining its BSD notices.
Structural state-key agreement is weaker than numerical parity with a complete
publisher environment; no such benchmark parity has been claimed.

The full-window footage is FCUFAN's
[Ajax–Utrecht recording](https://commons.wikimedia.org/wiki/File:Ajax_v_Utrecht_Dec_2024_edited.webm),
CC BY 3.0. It was excerpted from an existing downloaded Commons 480p transcode,
re-encoded/muted and left under ignored research artifacts. Its attribution,
source offset and hashes are in the evidence JSON. It is not bundled as a new
product default. Inter–Ajax provenance remains in the earlier media record.

See [research setup and commands](../../services/vision/research/README.md).
Use the isolated CPU requirements, not the base service environment. Model/data
deployment conditions remain unresolved; the model card's AGPL/commercial
contact statements and separate dataset conditions are unchanged by execution.

Next useful evaluation needs a continuous permitted broadcast-quality source,
independent labels and preprocessing parity review. A direct hackathon media URL
was requested asynchronously; work on existing code can continue without it.
Identity/UI verification and full-match reliability also remain open.
