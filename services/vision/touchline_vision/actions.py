"""Bounded temporal action proposals with explicit evidence availability.

This module does not confirm rules, scores, identities, or a calibrated accuracy.
A bidirectional model can be used inside an already observed rolling window;
its proposals carry the latest evidence PTS, rather than pretending that its
event timestamp was also its availability time. Already returned proposals are
never revised by future frames. Backend/model approval is a separate concern.
"""
from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
import hashlib
import math
import time
from typing import Protocol

import numpy as np


class ActionPredictor(Protocol):
    labels: tuple[str, ...]  # background must be first
    revision: str

    def predict(self, frames: np.ndarray) -> np.ndarray:
        """Return probabilities [time, classes] for only the supplied frames."""
        ...


@dataclass(frozen=True)
class ActionProposal:
    id: str
    label: str
    confidence: float
    sourcePtsMs: int
    observedThroughPtsMs: int
    receptiveStartPtsMs: int
    modelRevision: str
    confirmationDelayMs: int
    status: str = "candidate"
    actorId: None = None
    team: None = None

    def to_dict(self) -> dict:
        return asdict(self)


class BufferedActionProposer:
    """Past-input-only adapter with bounded context and irrevocable proposals.

    ``confirmation_ms`` is a minimum media-time holdback, not total wall latency.
    Initial warmup, inference and update cadence add delay. Predictions use all
    supplied context; labels from a whole-video/offline pass must not be injected.
    The caller supplies model-ready frames and must reset at shot boundaries.
    """
    def __init__(self, predictor: ActionPredictor, *, window_frames: int = 100,
                 min_frames: int = 20, sample_period_ms: int = 500,
                 update_period_ms: int = 2000, confirmation_ms: int = 2000,
                 nms_ms: int = 1000, threshold: float = .6):
        if (not predictor.labels or predictor.labels[0] != "background"
                or len(set(predictor.labels)) != len(predictor.labels)):
            raise ValueError("Use distinct labels with background first.")
        if (not 1 <= min_frames <= window_frames <= 500
                or sample_period_ms <= 0 or update_period_ms < sample_period_ms
                or not 0 <= nms_ms <= confirmation_ms
                or not math.isfinite(threshold) or not 0 < threshold <= 1):
            raise ValueError("Invalid temporal action settings.")
        self.predictor = predictor
        self.frames: deque[tuple[int, np.ndarray]] = deque(maxlen=window_frames)
        self.min_frames, self.sample_period_ms = min_frames, sample_period_ms
        self.update_period_ms, self.confirmation_ms = update_period_ms, confirmation_ms
        self.nms_ms, self.threshold = nms_ms, threshold
        self.epoch = 0
        self.reset()

    def reset(self):
        self.frames.clear()
        self.epoch += 1
        self.last_input_pts = -1
        self.next_sample_pts = 0
        self.last_update_pts: int | None = None
        self.finalized_through = -1
        self.last_proposal: dict[str, int] = {}
        self.last_inference_ms = 0.
        self.inference_count = 0

    def observe(self, frame: np.ndarray, pts_ms: int, *, cut: bool = False) -> list[ActionProposal]:
        if not isinstance(pts_ms, int) or isinstance(pts_ms, bool) or pts_ms < 0:
            raise ValueError("Use nonnegative integer presentation timestamps.")
        if (cut or pts_ms < self.last_input_pts
                or self.last_input_pts >= 0 and pts_ms-self.last_input_pts > 3*self.sample_period_ms):
            self.reset()
        if pts_ms == self.last_input_pts:
            return []
        self.last_input_pts = pts_ms
        if pts_ms < self.next_sample_pts:
            return []
        if frame.ndim != 3 or frame.size == 0 or not np.isfinite(frame).all():
            raise ValueError("Use a finite model-ready CHW image.")
        # Copy: a decoder may reuse/mutate its input buffer after this call.
        self.frames.append((pts_ms, np.asarray(frame, dtype=np.float32).copy()))
        if len(self.frames) == 1:
            self.next_sample_pts = pts_ms+self.sample_period_ms
        else:
            # Keep a fixed sampling clock. Anchoring every due time to the
            # slightly late decoded frame would progressively lower the FPS.
            steps = max(1, (pts_ms-self.next_sample_pts)//self.sample_period_ms+1)
            self.next_sample_pts += steps*self.sample_period_ms
        if len(self.frames) < self.min_frames:
            return []
        if self.last_update_pts is not None and pts_ms-self.last_update_pts < self.update_period_ms:
            return []
        started = time.perf_counter()
        scores = np.asarray(self.predictor.predict(np.stack([f for _, f in self.frames])))
        self.last_inference_ms = (time.perf_counter()-started)*1000
        self.inference_count += 1
        expected = (len(self.frames), len(self.predictor.labels))
        if (scores.shape != expected or not np.isfinite(scores).all()
                or (scores < 0).any() or (scores > 1).any()
                or not np.allclose(scores.sum(axis=1), 1., atol=.001)):
            raise ValueError("Action backend returned invalid probabilities.")
        self.last_update_pts = pts_ms
        times = np.array([t for t, _ in self.frames])
        frontier = pts_ms-self.confirmation_ms
        proposals = []
        for i, event_pts in enumerate(times):
            event_pts = int(event_pts)
            if not self.finalized_through < event_pts <= frontier:
                continue
            category = int(scores[i].argmax())
            if category == 0 or scores[i, category] < self.threshold:
                continue
            label = self.predictor.labels[category]
            neighbors = np.flatnonzero(np.abs(times-event_pts) <= self.nms_ms)
            # Stable ties choose the first point; future context is already here.
            peak = int(neighbors[np.argmax(scores[neighbors, category])])
            if peak != i or event_pts-self.last_proposal.get(label, -10**12) <= self.nms_ms:
                continue
            self.last_proposal[label] = event_pts
            key = f"{self.epoch}:{self.predictor.revision}:{label}:{event_pts}"
            proposals.append(ActionProposal(
                id=hashlib.sha256(key.encode()).hexdigest()[:24], label=label,
                confidence=float(scores[i, category]), sourcePtsMs=event_pts,
                observedThroughPtsMs=pts_ms, receptiveStartPtsMs=int(times[0]),
                modelRevision=self.predictor.revision,
                confirmationDelayMs=pts_ms-event_pts))
        self.finalized_through = max(self.finalized_through, frontier)
        return proposals
