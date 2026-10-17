/// <reference lib="webworker" />

import type { InferenceSession } from "onnxruntime-web";
// Load the pinned ESM runtime directly: Vinext's dev dependency optimizer adds
// window-based HMR imports to bundled ORT modules, which cannot run in a worker.
// @ts-expect-error Browser-native HTTPS modules are not resolved by TypeScript.
import * as runtime from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.wasm.min.mjs";
const ort = runtime as typeof import("onnxruntime-web");

type Request = {
  id: number;
  type: "init" | "infer";
  modelUrl?: string;
  pixels?: Float32Array;
  width?: number;
  height?: number;
};
type Detection = { box: number[]; confidence: number; classId: number };

let session: InferenceSession | null = null;

function overlap(a: number[], b: number[]) {
  const intersect =
    Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
    Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const area = (box: number[]) =>
    Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1]);
  return intersect / Math.max(1, area(a) + area(b) - intersect);
}

async function dispatch(request: Request) {
  if (request.type === "init") {
    if (!request.modelUrl) throw new Error("No detector model was configured.");
    // Vite must use worker.format='es' to retain this native external ESM import.
    // A single WASM thread works without cross-origin isolation headers.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths =
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
    session = await ort.InferenceSession.create(request.modelUrl, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
      freeDimensionOverrides: { batch_size: 1, height: 384, width: 384 },
    });
    return { ready: true };
  }
  if (!session || !request.pixels || !request.width || !request.height)
    throw new Error("The detector is not ready.");
  const started = performance.now();
  const input = new ort.Tensor("float32", request.pixels, [1, 3, 384, 384]);
  let outputs: InferenceSession.ReturnType | null = null;
  try {
    outputs = await session.run({ pixel_values: input });
    const boxes = outputs.pred_boxes;
    const logits = outputs.logits;
    if (
      !boxes ||
      !logits ||
      boxes.dims.at(-1) !== 4 ||
      logits.dims.at(-1) !== 91
    ) {
      throw new Error(
        "The detector returned an incompatible output signature.",
      );
    }
    const candidates: Detection[] = [];
    for (let query = 0; query < 300; query++) {
      let maximum = -Infinity;
      let classId = -1;
      for (let category = 0; category < 91; category++) {
        const value = Number(logits.data[query * 91 + category]);
        if (value > maximum) {
          maximum = value;
          classId = category;
        }
      }
      if (classId !== 1 && classId !== 37) continue; // COCO person / sports ball.
      const confidence = 1 / (1 + Math.exp(-maximum));
      if (confidence < (classId === 37 ? 0.35 : 0.45)) continue;
      const [cx, cy, width, height] = Array.from(
        boxes.data.slice(query * 4, query * 4 + 4),
        Number,
      );
      const box = [
        Math.max(0, (cx - width / 2) * request.width),
        Math.max(0, (cy - height / 2) * request.height),
        Math.min(request.width, (cx + width / 2) * request.width),
        Math.min(request.height, (cy + height / 2) * request.height),
      ];
      if (box.every(Number.isFinite) && box[2] > box[0] && box[3] > box[1])
        candidates.push({ box, classId, confidence });
    }
    // DETR is normally NMS-free; discard only near-identical same-class boxes.
    const detections: Detection[] = [];
    for (const candidate of candidates.sort(
      (a, b) => b.confidence - a.confidence,
    )) {
      if (
        !detections.some(
          (item) =>
            item.classId === candidate.classId &&
            overlap(item.box, candidate.box) > 0.7,
        )
      )
        detections.push(candidate);
    }
    return { detections, inferenceMs: Math.round(performance.now() - started) };
  } finally {
    input.dispose();
    if (outputs) for (const tensor of Object.values(outputs)) tensor.dispose();
  }
}

self.onmessage = (event: MessageEvent<Request>) => {
  void dispatch(event.data).then(
    (result) => self.postMessage({ id: event.data.id, result }),
    (error) =>
      self.postMessage({
        id: event.data.id,
        error: error instanceof Error ? error.message : String(error),
      }),
  );
};
