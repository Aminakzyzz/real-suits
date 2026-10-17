# Football action-model experiment

This is an isolated **research** adapter, outside the customer service startup.
It runs an actual pinned OpenSportsLab checkpoint on sequentially decoded frames.
It does not add these predictions to the scoreboard or narrated match facts.

The first evaluation is recorded in
`docs/research/action-model-first-evaluation-2026-10-17.md`. The current clip and
CPU setup did not produce useful rolling action proposals. Do not enable this
model for customers based on its availability or successful loading.

## Setup from the repository root

Create the environment/clone only if absent; preserve existing environments.

```sh
uv venv --python 3.11 artifacts/research/action-env
uv pip install --python artifacts/research/action-env/bin/python \
  -r services/vision/research/requirements-actions.txt
git clone https://github.com/OpenSportsLab/opensportslib.git \
  artifacts/research/opensportslib
git -C artifacts/research/opensportslib checkout \
  b2fe8f16a35336d93b1b0eabe1741bbbbc36cd68
mkdir -p artifacts/models
curl --fail --location \
  https://huggingface.co/OpenSportsLab/OSL-loc-snbas-2025-e2e/resolve/54e24a663a5a0ed057ef12cf16d9460d270ddc6e/model.pt \
  --output artifacts/models/osl-snbas2025-e2e.pt
```

Only CPU PyTorch wheels are selected. This does not alter `services/vision/.venv`
or install the full OpenSportsLib/DALI/CUDA dependency stack. The adapter checks
the checkpoint and imported GSM file hashes, reconstructs the published
RegNet-Y/GSM/bidirectional-GRU architecture, and requires all 446 state keys to
match. That verifies structural compatibility, not benchmark reproduction.

Run the bounded, paced rolling experiment:

```sh
artifacts/research/action-env/bin/python \
  services/vision/scripts/evaluate_action_checkpoint.py --pace
```

Other explicit diagnostics:

```sh
# Initial coarse probe's 480 ms sampling grid, as an offline diagnostic:
artifacts/research/action-env/bin/python \
  services/vision/scripts/evaluate_action_checkpoint.py \
  --mode batch-diagnostic --sample-fps 2.0833333333 \
  --output artifacts/research/action-coarse-diagnostic.json

# Dense, non-default-FPS ablation around the beginning of the clip:
artifacts/research/action-env/bin/python \
  services/vision/scripts/evaluate_action_checkpoint.py \
  --mode batch-diagnostic --sample-fps 25 --max-seconds 6 \
  --output artifacts/research/action-dense-ablation.json
```

The dense mode is an explicit departure from the published extraction FPS. It
must not be represented as reproduction of the card's benchmark or as causal
live throughput. The default source is the already licensed bundled clip.
No title, event log, score, identity roster or original audio enters the model.

## Temporal contract

`touchline_vision/actions.py` provides a model-independent bounded adapter. It
samples on a fixed presentation-time grid, owns copies of decoder frames,
limits context, validates probabilities and emits irrevocable candidate records.
Each records event PTS, latest evidence PTS, receptive start, model revision and
confirmation delay. Names, team and referee/score outcomes stay unassigned.

A two-second holdback is a **minimum media-time confirmation interval**. Initial
warmup, update cadence and model runtime add delay. Returned proposals are never
changed by later suffixes; they are not retroactively placed at their event time
as if available then. Camera cuts, long source gaps and backward seeks clear
pending context. Replay recognition and match-state confirmation are separate,
unfinished layers. The standalone runner does not yet supply shot classification.

Tests use a context-sensitive predictor to check that future frames cannot
rewrite an emitted prefix, plus reset behavior, clock drift, buffer ownership,
memory bounds and rejection of malformed backend output. These tests establish
the transport/causality contract; they do not establish football accuracy.

## Provenance and limits

- Checkpoint SHA-256:
  `2352f17f60de586d7531b07f88ae4d618b46c1f8a4904837b0493ea15767307c`.
- External GSM file SHA-256:
  `783e3c0ea869d6dd90c3be2b90a64a66de35e5fb377dd513b9f751a188a4e78d`.
- The model card labels the artifact AGPL and requests contact for proprietary
  deployment. SoccerNet training-data conditions are separate. No commercial
  clearance is inferred from this experiment.
- The imported external GSM file retains its BSD notices. It is not vendored.
  Architecture reference: `https://github.com/jhong93/spot` (BSD-3-Clause).
- Only the expected NumPy scalar/dtype globals are allowlisted with PyTorch's
  restricted `weights_only=True` loader. No unrestricted pickle fallback.
- Short windows are right-padded with normalized tensor zeros to 100 frames,
  then features are truncated before the GRU, following the inspected source.
  Padding, domain shift and sampling all require evaluation on real labelled data.

Models, environments and raw scratch outputs stay under ignored `artifacts/`.
The checked-in evidence contains the permitted clip's hash and model results,
not user uploads, private credentials or customer records.
