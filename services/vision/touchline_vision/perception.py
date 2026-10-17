"""Causal, CPU-compatible RF-DETR inference with an explicitly simple IoU tracker.

The generic COCO model detects people and sports balls. It does not identify
footballers, referee rulings, goals, or tactical intent. Keep these boundaries
in the observations rather than turning uncertainty into a made-up event.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import time

import cv2
import numpy as np
import onnxruntime as ort

MODEL_REPO = "onnx-community/rfdetr_nano-ONNX"
MODEL_REVISION = "eae21cee0687a91bcf9fa071605c48d7705d2d91"
MODEL_FILE = "onnx/model_quantized.onnx"


def intersection_over_union(a: list[float], b: list[float]) -> float:
    overlap = max(0., min(a[2], b[2]) - max(a[0], b[0])) * max(0., min(a[3], b[3]) - max(a[1], b[1]))
    total = max(0., a[2] - a[0]) * max(0., a[3] - a[1]) + max(0., b[2] - b[0]) * max(0., b[3] - b[1]) - overlap
    return overlap / total if total > 0 else 0.


@dataclass
class Track:
    id: str
    box: list[float]
    seen: int


class CausalTracker:
    def __init__(self) -> None:
        self.tracks: list[Track] = []
        self.next_id = 1
        self.epoch = 1

    def reset(self) -> None:
        self.tracks = []
        self.epoch += 1

    def update(self, detections: list[dict], sequence: int) -> list[dict]:
        available = {t.id: t for t in self.tracks if sequence - t.seen <= 3}
        result: list[dict] = []
        for item in sorted(detections, key=lambda x: x["confidence"], reverse=True):
            ranked = sorted(((intersection_over_union(item["box"], t.box), t) for t in available.values()), key=lambda x: x[0], reverse=True)
            if ranked and ranked[0][0] >= 0.18:
                track = ranked[0][1]
                del available[track.id]
                track.box, track.seen = item["box"], sequence
            else:
                track = Track(f"e{self.epoch}-t{self.next_id}", item["box"], sequence)
                self.next_id += 1
                self.tracks.append(track)
            result.append({**item, "trackId": track.id, "team": None})
        self.tracks = [t for t in self.tracks if sequence - t.seen <= 3]
        return result


class Detector:
    def __init__(self, model_path: Path, threads: int = 4):
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(model_path), sess_options=options, providers=["CPUExecutionProvider"])

    def detect(self, image: np.ndarray) -> tuple[list[dict], dict | None, float]:
        started = time.perf_counter()
        rgb = cv2.cvtColor(cv2.resize(image, (384, 384), interpolation=cv2.INTER_LINEAR), cv2.COLOR_BGR2RGB)
        tensor = np.ascontiguousarray(rgb.transpose(2, 0, 1)[None], dtype=np.float32) / 255.
        names = [o.name for o in self.session.get_outputs()]
        outputs = dict(zip(names, self.session.run(None, {"pixel_values": tensor})))
        boxes, logits = outputs["pred_boxes"][0], outputs["logits"][0]
        scores = 1. / (1. + np.exp(-np.clip(logits, -60, 60)))
        people: list[dict] = []
        balls: list[dict] = []
        for category, threshold, target in [(1, .40, people), (37, .30, balls)]:
            indices = np.argsort(scores[:, category])[::-1]
            for index in indices:
                confidence = float(scores[index, category])
                if confidence < threshold:
                    break
                cx, cy, width, height = [float(n) for n in boxes[index]]
                box = [max(0., cx-width/2), max(0., cy-height/2), min(1., cx+width/2), min(1., cy+height/2)]
                if box[2] <= box[0] or box[3] <= box[1] or any(intersection_over_union(box, old["box"]) > .65 for old in target):
                    continue
                target.append({"box": box, "confidence": round(confidence, 4)})
        return people[:50], balls[0] if balls else None, round((time.perf_counter()-started)*1000, 2)


class Perception:
    def __init__(self, detector: Detector):
        self.detector, self.tracker = detector, CausalTracker()
        self.previous_histogram: np.ndarray | None = None

    def observe(self, image: np.ndarray, sequence: int, pts_ms: int) -> dict:
        hsv = cv2.cvtColor(cv2.resize(image, (160, 90)), cv2.COLOR_BGR2HSV)
        histogram = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256])
        cv2.normalize(histogram, histogram)
        cut = self.previous_histogram is not None and cv2.compareHist(self.previous_histogram, histogram, cv2.HISTCMP_BHATTACHARYYA) > .60
        self.previous_histogram = histogram
        if cut:
            self.tracker.reset()
        people, ball, elapsed = self.detector.detect(image)
        # "players" is a transport field retained for the UI. Generic person
        # detections can also include officials, staff or spectators.
        return {
            "sequence": sequence, "sourcePtsMs": pts_ms, "observedThroughPtsMs": pts_ms,
            "players": self.tracker.update(people, sequence), "ball": ball,
            "scene": "cut" if cut else "wide" if len(people) >= 5 else "closeup", "inferenceMs": elapsed,
        }
