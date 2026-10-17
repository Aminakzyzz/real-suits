/// <reference types="vite/client" />

import DetectorWorker from "./browser-detector.worker?worker";
import type { VisionHealth, VisionObservation, VisionSession } from "./vision";

export const BROWSER_MODEL_URL =
  "https://huggingface.co/onnx-community/rfdetr_nano-ONNX/resolve/eae21cee0687a91bcf9fa071605c48d7705d2d91/onnx/model_quantized.onnx";

let activeModels = 0;

export async function browserHealth(): Promise<VisionHealth> {
  const supported =
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined";
  return {
    status: supported ? "ready" : "unavailable",
    model: {
      ready: activeModels > 0,
      name: "RF-DETR Nano · on-device WASM · general object detector",
    },
    speech: {
      ready: typeof window !== "undefined" && "speechSynthesis" in window,
      engine: "Browser speech · installed system voices",
      voices: [
        { id: "browser-en", name: "System English", language: "en" },
        { id: "browser-es", name: "System Español", language: "es" },
        { id: "browser-fr", name: "System Français", language: "fr" },
      ],
    },
    version: "browser-vision-1",
  };
}

type Detection = { box: number[]; confidence: number; classId: number };
type DetectorResult = { detections: Detection[]; inferenceMs: number };
type Tracked = { id: number; box: number[] };

function overlap(a: number[], b: number[]) {
  const intersection =
    Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
    Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const area = (box: number[]) =>
    Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1]);
  return intersection / Math.max(1e-9, area(a) + area(b) - intersection);
}

function spokenObservation(
  language: VisionSession["settings"]["language"],
  count: number,
  side: string | null,
) {
  if (language === "es") {
    const direction =
      side === "left"
        ? "izquierda"
        : side === "right"
          ? "derecha"
          : "zona central";
    const people =
      count === 1 ? "una persona visible" : `${count} personas visibles`;
    return side
      ? `El balón se ve en la ${side === "centre" ? direction : `parte ${direction}`} de la imagen. Hay ${people}.`
      : `Hay ${people} en la imagen. El balón no está localizado con suficiente confianza.`;
  }
  if (language === "fr") {
    const direction =
      side === "left"
        ? "à gauche"
        : side === "right"
          ? "à droite"
          : "au centre";
    const people =
      count === 1
        ? "Une personne est visible"
        : `${count} personnes sont visibles`;
    return side
      ? `Le ballon est visible ${direction} de l'image. ${people}.`
      : `${people}. Le ballon n'est pas localisé avec assez de certitude.`;
  }
  const direction =
    side === "left"
      ? "the left"
      : side === "right"
        ? "the right"
        : "the centre";
  const people = count === 1 ? "One person is" : `${count} people are`;
  return side
    ? `The ball is visible towards ${direction} of the picture. ${people} in view.`
    : `${people} visible in this view. The ball is not confidently located.`;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Analysis cancelled.", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      reject(new DOMException("Analysis cancelled.", "AbortError"));
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Analyze only decoded frames at the current video playhead; never seek ahead. */
export async function runBrowserSession(
  video: HTMLVideoElement,
  settings: VisionSession["settings"],
  onSnapshot: (snapshot: VisionSession) => void,
  signal: AbortSignal,
): Promise<void> {
  if ((await browserHealth()).status !== "ready")
    throw new Error(
      "This browser needs WebAssembly and Web Workers for on-device vision.",
    );
  if (!video.videoWidth || !video.videoHeight)
    throw new Error("Load a playable video before starting on-device vision.");
  const id = crypto.randomUUID();
  const durationMs = Number.isFinite(video.duration)
    ? Math.round(video.duration * 1000)
    : 0;
  const snapshot: VisionSession = {
    id,
    status: "queued",
    source: {
      id: "browser-live",
      name: "Current video · on-device vision",
      kind: "browser",
      durationMs,
      provenance: {
        url: BROWSER_MODEL_URL,
        license: "RF-DETR Nano · Apache-2.0",
        attribution:
          "Roboflow / ONNX Community · pinned model revision eae21ce",
      },
    },
    settings: { ...settings },
    progress: {
      processedMs: Math.round(video.currentTime * 1000),
      durationMs,
      frames: 0,
    },
    observations: [],
    events: [],
    utterances: [],
    metrics: {
      inferenceP50Ms: 0,
      inferenceP95Ms: 0,
      realTimeFactor: 0,
      frames: 0,
      events: 0,
    },
    error: null,
  };
  const publish = () =>
    onSnapshot({
      ...snapshot,
      progress: { ...snapshot.progress },
      metrics: { ...snapshot.metrics },
      observations: [...snapshot.observations],
      events: [...snapshot.events],
      utterances: [...snapshot.utterances],
    });
  publish();

  const worker = new DetectorWorker();
  let requestId = 0;
  let loaded = false;
  const requests = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  function failRequests(error: Error) {
    for (const pending of requests.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    requests.clear();
  }
  const abort = () => {
    worker.terminate();
    failRequests(new DOMException("Analysis cancelled.", "AbortError"));
  };
  signal.addEventListener("abort", abort, { once: true });
  worker.onmessage = (
    event: MessageEvent<{ id: number; result?: unknown; error?: string }>,
  ) => {
    const pending = requests.get(event.data.id);
    if (!pending) return;
    requests.delete(event.data.id);
    clearTimeout(pending.timer);
    if (event.data.error) pending.reject(new Error(event.data.error));
    else pending.resolve(event.data.result);
  };
  worker.onerror = (event) =>
    failRequests(
      new Error(
        event.message || "The on-device vision worker could not start.",
      ),
    );
  const rpc = <T>(
    type: "init" | "infer",
    values: Record<string, unknown>,
    transfer: Transferable[] = [],
  ) =>
    new Promise<T>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Analysis cancelled.", "AbortError"));
        return;
      }
      const messageId = ++requestId;
      const timer = setTimeout(
        () => {
          requests.delete(messageId);
          reject(
            new Error(
              type === "init"
                ? "The detector download timed out. Check the connection and retry."
                : "On-device inference timed out. Try the local vision service.",
            ),
          );
        },
        type === "init" ? 180_000 : 60_000,
      );
      requests.set(messageId, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      worker.postMessage({ id: messageId, type, ...values }, transfer);
    });
  let seekEpoch = 0;
  const onSeek = () => {
    seekEpoch++;
  };
  video.addEventListener("seeking", onSeek);
  try {
    if (signal.aborted)
      throw new DOMException("Analysis cancelled.", "AbortError");
    await rpc<{ ready: boolean }>("init", { modelUrl: BROWSER_MODEL_URL });
    activeModels++;
    loaded = true;
    snapshot.status = "running";
    publish();
    await video.play();
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 384;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error("This browser could not create a video analysis canvas.");
    const sampleMs = 1000 / Math.min(3, Math.max(0.2, settings.sampleFps || 1));
    const maxSeconds = Math.min(7200, Math.max(1, settings.maxSeconds || 120));
    const inferenceTimes: number[] = [];
    let previous: Tracked[] = [],
      nextTrack = 1,
      previousPts = -Infinity;
    let lastEventPts = -Infinity,
      lastSignature = "",
      lastEventCount = 0;
    let elapsedMediaMs = 0,
      observedEpoch = seekEpoch,
      initialPts = video.currentTime * 1000;
    while (!signal.aborted) {
      if (
        video.ended ||
        video.currentTime * 1000 - initialPts >= maxSeconds * 1000
      )
        break;
      if (video.paused || video.seeking || video.readyState < 2) {
        await wait(100, signal);
        continue;
      }
      if (observedEpoch !== seekEpoch) {
        previous = [];
        previousPts = -Infinity;
        lastSignature = "";
        lastEventPts = -Infinity;
        observedEpoch = seekEpoch;
        initialPts = video.currentTime * 1000;
      }
      const pts = Math.round(video.currentTime * 1000);
      if (pts - previousPts < sampleMs) {
        await wait(40, signal);
        continue;
      }
      const capturedEpoch = seekEpoch;
      const capturedWidth = video.videoWidth,
        capturedHeight = video.videoHeight;
      context.drawImage(video, 0, 0, 384, 384);
      let rgba: Uint8ClampedArray;
      try {
        rgba = context.getImageData(0, 0, 384, 384).data;
      } catch {
        throw new Error(
          "This video blocks frame access. Use the bundled clip or a local video file.",
        );
      }
      const plane = 384 * 384,
        pixels = new Float32Array(3 * plane);
      for (let pixel = 0; pixel < plane; pixel++) {
        pixels[pixel] = rgba[pixel * 4] / 255;
        pixels[plane + pixel] = rgba[pixel * 4 + 1] / 255;
        pixels[2 * plane + pixel] = rgba[pixel * 4 + 2] / 255;
      }
      const result = await rpc<DetectorResult>(
        "infer",
        { pixels, width: capturedWidth, height: capturedHeight },
        [pixels.buffer],
      );
      if (signal.aborted) break;
      if (capturedEpoch !== seekEpoch) continue; // Discard inference across a seek.
      if (Number.isFinite(previousPts))
        elapsedMediaMs += Math.max(0, pts - previousPts);
      if (pts - previousPts > 2500) previous = [];
      previousPts = pts;
      const normalized = result.detections.map((item) => ({
        ...item,
        box: item.box.map(
          (coordinate, index) =>
            coordinate / (index % 2 === 0 ? capturedWidth : capturedHeight),
        ),
      }));
      const available = new Set(previous.map((item) => item.id));
      const players: VisionObservation["players"] = normalized
        .filter((item) => item.classId === 1)
        .map((item) => {
          const best = previous
            .filter((track) => available.has(track.id))
            .map((track) => ({ track, iou: overlap(track.box, item.box) }))
            .sort((a, b) => b.iou - a.iou)[0];
          const trackId = best && best.iou >= 0.2 ? best.track.id : nextTrack++;
          available.delete(trackId);
          return {
            trackId,
            box: item.box,
            confidence: item.confidence,
            team: null,
          };
        });
      previous = players.map((player) => ({
        id: Number(player.trackId),
        box: player.box,
      }));
      const ballDetection = normalized.find((item) => item.classId === 37);
      const ball = ballDetection
        ? { box: ballDetection.box, confidence: ballDetection.confidence }
        : null;
      const observation: VisionObservation = {
        sequence: snapshot.progress.frames,
        sourcePtsMs: pts,
        observedThroughPtsMs: pts,
        players,
        ball,
        scene: players.length >= 4 ? "wide" : "closeup",
        inferenceMs: result.inferenceMs,
      };
      snapshot.observations.push(observation);
      if (snapshot.observations.length > 600) snapshot.observations.shift();
      snapshot.progress = {
        processedMs: pts,
        durationMs,
        frames: snapshot.progress.frames + 1,
      };
      inferenceTimes.push(result.inferenceMs);
      const sorted = [...inferenceTimes].sort((a, b) => a - b);
      const ballCenter = ball ? (ball.box[0] + ball.box[2]) / 2 : null;
      const side =
        ballCenter === null
          ? null
          : ballCenter < 0.34
            ? "left"
            : ballCenter > 0.66
              ? "right"
              : "centre";
      const signature = `${side || "unseen"}:${players.length >= 4 ? "wide" : "closeup"}`;
      // Describe observable evidence only. This is not an action spotter: no
      // inferred names, possession, goals, fouls, score, or fixture statistics.
      const fresh = Math.abs(video.currentTime * 1000 - pts) <= 4000;
      if (
        players.length > 0 &&
        fresh &&
        pts - lastEventPts >= 8000 &&
        (signature !== lastSignature ||
          Math.abs(players.length - lastEventCount) >= 4)
      ) {
        const eventId = crypto.randomUUID(),
          text = spokenObservation(settings.language, players.length, side);
        const confidence =
          ball?.confidence ??
          Math.min(...players.map((player) => player.confidence));
        snapshot.events.push({
          id: eventId,
          sourcePtsMs: pts,
          observedThroughPtsMs: pts,
          type: "visual_observation",
          team: null,
          actorId: null,
          text,
          confidence,
        });
        snapshot.utterances.push({
          id: crypto.randomUUID(),
          eventId,
          sourcePtsMs: pts,
          text,
          language: settings.language,
          voice: settings.voice || `browser-${settings.language}`,
          durationMs: 0,
          audioUrl: "",
        });
        lastEventPts = pts;
        lastSignature = signature;
        lastEventCount = players.length;
      }
      snapshot.metrics = {
        inferenceP50Ms: sorted[Math.floor((sorted.length - 1) * 0.5)],
        inferenceP95Ms: sorted[Math.ceil((sorted.length - 1) * 0.95)],
        realTimeFactor:
          inferenceTimes.reduce((sum, value) => sum + value, 0) /
          Math.max(1, elapsedMediaMs + result.inferenceMs),
        frames: snapshot.progress.frames,
        events: snapshot.events.length,
      };
      publish();
      await wait(10, signal);
    }
    snapshot.status = signal.aborted ? "cancelled" : "completed";
    publish();
  } catch (error) {
    snapshot.status =
      signal.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
        ? "cancelled"
        : "failed";
    snapshot.error =
      snapshot.status === "cancelled"
        ? null
        : error instanceof Error
          ? error.message
          : String(error);
    publish();
    if (snapshot.status === "failed") throw error;
  } finally {
    worker.terminate();
    failRequests(new Error("The vision worker has stopped."));
    signal.removeEventListener("abort", abort);
    video.removeEventListener("seeking", onSeek);
    if (loaded) activeModels--;
  }
}
