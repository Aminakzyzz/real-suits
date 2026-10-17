"""CPU research adapter for one pinned OpenSportsLab E2E checkpoint.

Not imported by the customer app/service. Model/data deployment conditions are
unresolved. This reconstructs the published RegNet-Y/GSM/GRU architecture and
strictly checks every state key. The external GSM file keeps its upstream BSD
notices; the full OpenSportsLib package (AGPL) is not installed or vendored.
Architecture reference: https://github.com/jhong93/spot (BSD-3-Clause).
"""
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path

import cv2
import numpy as np
import timm
import torch
from torch import nn

MODEL_REPO = "OpenSportsLab/OSL-loc-snbas-2025-e2e"
MODEL_REVISION = "54e24a663a5a0ed057ef12cf16d9460d270ddc6e"
MODEL_SHA256 = "2352f17f60de586d7531b07f88ae4d618b46c1f8a4904837b0493ea15767307c"
SOURCE_REVISION = "b2fe8f16a35336d93b1b0eabe1741bbbbc36cd68"
GSM_SHA256 = "783e3c0ea869d6dd90c3be2b90a64a66de35e5fb377dd513b9f751a188a4e78d"
LABELS = ("background", "PASS", "DRIVE", "HEADER", "HIGH PASS", "OUT", "CROSS",
          "THROW IN", "SHOT", "BALL PLAYER BLOCK", "PLAYER SUCCESSFUL TACKLE", "FREE KICK", "GOAL")
MEAN = np.array([.485, .456, .406], dtype=np.float32)
STD = np.array([.229, .224, .225], dtype=np.float32)


def check_hash(path: Path, expected: str):
    with path.open("rb") as stream:
        if hashlib.file_digest(stream, "sha256").hexdigest() != expected:
            raise ValueError(f"Artifact hash mismatch: {path.name}")


class OSLActionModel:
    labels = LABELS
    revision = MODEL_REVISION

    def __init__(self, checkpoint: Path, source_checkout: Path, *, threads: int = 2):
        if not 1 <= threads <= 8:
            raise ValueError("Use 1–8 CPU threads for this bounded experiment.")
        check_hash(checkpoint, MODEL_SHA256)
        source = source_checkout / "opensportslib/models/utils/impl/gsm.py"
        check_hash(source, GSM_SHA256)
        spec = importlib.util.spec_from_file_location("touchline_external_gsm", source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        torch.set_num_threads(threads)

        class Shift(nn.Module):
            def __init__(self, conv):
                super().__init__()
                self.fold_dim = ((conv.conv.in_channels//4+3)//4)*4
                self.gsm = module._GSM(self.fold_dim, 100)
                self.net = conv

            def forward(self, x):
                return self.net(torch.cat((self.gsm(x[:, :self.fold_dim]), x[:, self.fold_dim:]), dim=1))

        class Backbone(nn.Module):
            def __init__(self):
                super().__init__()
                self._features = timm.create_model("regnety_008", pretrained=False)
                self._features.head.fc = nn.Identity()
                for stage in (self._features.s1, self._features.s2, self._features.s3, self._features.s4):
                    for block in stage.children():
                        block.conv1 = Shift(block.conv1)

            def forward(self, x):
                count = x.shape[1]
                # Match the publisher's variable-length path: normalize first,
                # right-pad to 100 with tensor zeros, truncate before the GRU.
                x = nn.functional.pad(x, (0, 0, 0, 0, 0, 0, 0, 100-count))
                return self._features(x.flatten(0, 1)).reshape(1, 100, 768)[:, :count]

        class Output(nn.Module):
            def __init__(self):
                super().__init__()
                self._fc_out = nn.Linear(1536, len(LABELS))

            def forward(self, x):
                return self._fc_out(x)

        class Temporal(nn.Module):
            def __init__(self):
                super().__init__()
                self._gru = nn.GRU(768, 768, batch_first=True, bidirectional=True)
                self._fc_out = Output()
                self._dropout = nn.Dropout()

            def forward(self, x):
                return self._fc_out(self._dropout(self._gru(x)[0]))

        class Model(nn.Module):
            def __init__(self):
                super().__init__()
                self.backbone = Backbone()
                self.head = nn.Module()
                self.head._pred_fine = Temporal()

            def forward(self, x):
                return self.head._pred_fine(self.backbone(x))

        # The checkpoint contains optimizer state and a NumPy scalar. Never use
        # weights_only=False to sidestep PyTorch's restricted loader.
        allowed = {"numpy.dtype", "numpy._core.multiarray.scalar"}
        if set(torch.serialization.get_unsafe_globals_in_checkpoint(checkpoint))-allowed:
            raise ValueError("Unexpected checkpoint serialization globals.")
        with torch.serialization.safe_globals([np.dtype, np._core.multiarray.scalar, np.dtypes.Float64DType]):
            state = torch.load(checkpoint, map_location="cpu", weights_only=True, mmap=True)
        self.model = Model().eval()
        self.model.load_state_dict(state["model_state_dict"], strict=True)

    @staticmethod
    def preprocess(bgr: np.ndarray) -> np.ndarray:
        rgb = cv2.cvtColor(cv2.resize(bgr, (398, 224)), cv2.COLOR_BGR2RGB).astype(np.float32)/255.
        return np.ascontiguousarray(((rgb-MEAN)/STD).transpose(2, 0, 1))

    def predict(self, frames: np.ndarray) -> np.ndarray:
        if frames.ndim != 4 or frames.shape[1:] != (3, 224, 398) or not 1 <= len(frames) <= 100:
            raise ValueError("Use 1–100 normalized RGB CHW 224×398 frames.")
        with torch.inference_mode():
            logits = self.model(torch.from_numpy(np.ascontiguousarray(frames))[None])
            return logits.softmax(-1)[0].numpy().copy()
