import type { MatchRoster } from "./roster";
export type VisionLanguage = "en" | "es" | "fr";

export type VisionSource = {
  id: string;
  name: string;
  kind?: string;
  durationMs?: number;
  mediaUrl?: string;
  posterUrl?: string;
  provenance?: { url?: string; license?: string; attribution?: string };
};

export type VisionVoice = { id: string; name: string; language?: string };
export type VisionHealth = {
  status: string;
  model?: { ready: boolean; name: string };
  speech?: { ready: boolean; voices: VisionVoice[]; engine?: string };
  version?: string;
  identity?: {
    available: boolean;
    experimental: boolean;
    requiresRoster: boolean;
  };
};
export type VisionObservation = {
  sequence: number;
  sourcePtsMs: number;
  observedThroughPtsMs: number;
  identityEnabled?: boolean;
  identityMs?: number;
  players: {
    trackId: number | string;
    box: number[];
    confidence: number;
    team: "home" | "away" | null;
    identity?: {
      playerId: string;
      name: string;
      number: number;
      team: "home" | "away";
      evidence: {
        method: string;
        readings: number;
        firstPtsMs: number;
        lastPtsMs: number;
        teamScore: number;
        ocrScore: number;
      };
    };
  }[];
  ball: { box: number[]; confidence: number } | null;
  scene: "wide" | "closeup" | "cut";
  inferenceMs: number;
};
export type VisionEvent = {
  id: string;
  sourcePtsMs: number;
  observedThroughPtsMs: number;
  type: string;
  team: string | null;
  actorId: string | null;
  text: string;
  confidence: number;
};
export type VisionUtterance = {
  id: string;
  eventId: string;
  sourcePtsMs: number;
  text: string;
  language: string;
  voice: string;
  durationMs: number;
  audioUrl: string;
};
export type VisionSession = {
  id: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed";
  source: VisionSource;
  settings: {
    language: VisionLanguage;
    voice: string | null;
    sampleFps: number;
    pace: boolean;
    maxSeconds: number;
    roster?: MatchRoster | null;
  };
  progress: { processedMs: number; durationMs: number; frames: number };
  observations: VisionObservation[];
  events: VisionEvent[];
  utterances: VisionUtterance[];
  metrics: {
    inferenceP50Ms: number;
    inferenceP95Ms: number;
    realTimeFactor: number;
    frames: number;
    events: number;
  };
  error: string | null;
};

export function visionUrl(path: string) {
  if (path.startsWith("/api/vision/")) return path;
  if (path.startsWith("/")) return `/api/vision${path}`;
  return `/api/vision/${path}`;
}

export async function visionRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(visionUrl(path), { cache: "no-store", ...init });
  const contentType = response.headers.get("content-type") || "";
  const result: unknown = contentType.includes("json")
    ? await response.json()
    : null;
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Sign in to use the local service (401).");
    const body = result as {
      error?: string | { message?: string };
      detail?: string;
    } | null;
    const message =
      typeof body?.error === "string" ? body.error : body?.error?.message;
    throw new Error(
      message || body?.detail || `Vision service returned ${response.status}`,
    );
  }
  if (!result)
    throw new Error("The vision service returned an unexpected response.");
  return result as T;
}

export function formatVisionTime(ms: number) {
  const seconds = Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
