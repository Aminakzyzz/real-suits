"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Eye,
  FileVideo,
  Globe2,
  Layers3,
  Loader2,
  Maximize2,
  MonitorUp,
  Play,
  Radio,
  RefreshCw,
  ScanLine,
  Settings2,
  Square,
  Upload,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from "lucide-react";
import {
  formatVisionTime,
  visionRequest,
  visionUrl,
  type VisionHealth,
  type VisionLanguage,
  type VisionSession,
  type VisionSource,
  type VisionUtterance,
} from "@/lib/vision";

type League = {
  updatedAt?: string;
  sourceUrl?: string;
  season?: string;
  matchweek?: number;
  standingsMatchweek?: number;
  stale?: boolean;
  error?: string;
  articles?: { title: string; url: string; imageUrl?: string }[];
  fixtures?: {
    id: string;
    home: string;
    away: string;
    homeBadge?: string;
    awayBadge?: string;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string;
    kickoff?: string;
  }[];
  standings?: {
    position: number;
    team: string;
    shortName?: string;
    badge?: string;
    played: number;
    points: number;
  }[];
};
const languages: { value: VisionLanguage; label: string; native: string }[] = [
  { value: "en", label: "English", native: "EN" },
  { value: "es", label: "Spanish", native: "ES" },
  { value: "fr", label: "French", native: "FR" },
];
const initialSources: VisionSource[] = [];

function fixtureStatus(status?: string) {
  if (!status) return "Fixture";
  return (
    (
      {
        PreMatch: "Scheduled",
        FirstHalf: "First half",
        HalfTime: "Half time",
        SecondHalf: "Second half",
        FullTime: "Full time",
        Postponed: "Postponed",
      } as Record<string, string>
    )[status] || status.replace(/([a-z])([A-Z])/g, "$1 $2")
  );
}

function Badge({ src, name }: { src?: string; name: string }) {
  return src ? (
    <img src={src} alt="" className="vision-club-badge" loading="lazy" />
  ) : (
    <span className="vision-club-fallback" aria-hidden>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function VisionStudio() {
  const [mode, setMode] = useState<"browser" | "service">("browser");
  const [health, setHealth] = useState<VisionHealth | null>(null);
  const [serviceHealth, setServiceHealth] = useState<VisionHealth | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [sources, setSources] = useState<VisionSource[]>(initialSources);
  const [sourceId, setSourceId] = useState("");
  const [localSource, setLocalSource] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [session, setSession] = useState<VisionSession | null>(null);
  const [language, setLanguage] = useState<VisionLanguage>("en");
  const [voice, setVoice] = useState("");
  const [maxSeconds, setMaxSeconds] = useState(60);
  const [boxes, setBoxes] = useState(true);
  const [speak, setSpeak] = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoAspect, setVideoAspect] = useState(16 / 9);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [leagueError, setLeagueError] = useState(false);
  const [activeUtterance, setActiveUtterance] =
    useState<VisionUtterance | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>(
    [],
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const spokenRef = useRef(new Set<string>());
  const isSpeakingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSessionRef = useRef<string | null>(null);
  const startedVideoRef = useRef(false);
  const sessionRef = useRef<VisionSession | null>(null);
  sessionRef.current = session;

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScreenStream(null);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !screenStream) return;
    video.srcObject = screenStream;
    video.play().catch(() => setIsPlaying(false));
    return () => {
      if (video.srcObject === screenStream) video.srcObject = null;
    };
  }, [screenStream]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
  }, []);

  const refreshConnection = useCallback(async () => {
    const results = await Promise.allSettled([
      visionRequest<VisionHealth>("/health"),
      visionRequest<{ sources: VisionSource[] }>("/sources"),
    ]);
    if (results[0].status === "fulfilled") {
      setServiceHealth(results[0].value);
      setServiceError(null);
    } else {
      setServiceHealth(null);
      setServiceError(
        results[0].reason instanceof Error
          ? results[0].reason.message
          : "Service unavailable",
      );
    }
    if (results[1].status === "fulfilled") {
      const incoming = results[1].value.sources;
      setSources((current) => [
        ...incoming.map((item) => ({
          ...current.find((previous) => previous.id === item.id),
          ...item,
        })),
        ...current.filter(
          (item) =>
            item.mediaUrl && !incoming.some((source) => source.id === item.id),
        ),
      ]);
      setSourceId(
        (current) =>
          current ||
          (results[1].status === "fulfilled" &&
            results[1].value.sources[0]?.id) ||
          "",
      );
    }
  }, []);

  const refreshLeague = useCallback(async () => {
    try {
      const response = await fetch("/api/league", { cache: "no-store" });
      if (!response.ok) throw new Error("League feed unavailable");
      setLeague((await response.json()) as League);
      setLeagueError(false);
    } catch {
      setLeagueError(true);
      setLeague((current) => (current ? { ...current, stale: true } : current));
    }
  }, []);

  useEffect(() => {
    refreshLeague();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshLeague();
    }, 30000);
    return () => clearInterval(timer);
  }, [refreshLeague]);

  useEffect(() => {
    refreshConnection();
    import("@/lib/browser-vision")
      .then(async (module) => setHealth(await module.browserHealth()))
      .catch(() => setHealth(null));
    fetch("/demo/source.json")
      .then((response) => {
        if (!response.ok) throw new Error("No sample");
        return response.json() as Promise<VisionSource>;
      })
      .then((source) => {
        setSources((current) => [
          ...current.filter((item) => item.id !== source.id),
          source,
        ]);
        setSourceId((current) => current || source.id);
      })
      .catch(() => {});
    if ("speechSynthesis" in window) {
      const updateVoices = () =>
        setBrowserVoices(window.speechSynthesis.getVoices());
      updateVoices();
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          updateVoices,
        );
        abortRef.current?.abort();
        stopAudio();
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      };
    }
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      abortRef.current?.abort();
      stopAudio();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [refreshConnection, stopAudio]);

  useEffect(() => {
    if (
      mode !== "service" ||
      !session ||
      !["queued", "running"].includes(session.status)
    )
      return;
    let live = true;
    const timer = setInterval(async () => {
      try {
        const next = await visionRequest<VisionSession>(
          `/sessions/${session.id}`,
        );
        if (live) {
          setSession(next);
          setError(null);
        }
      } catch (failure) {
        if (live)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to refresh analysis",
          );
      }
    }, 1000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [mode, session?.id, session?.status]);

  useEffect(() => {
    if (!session || startedVideoRef.current || !videoRef.current) return;
    if (
      (session.status === "running" &&
        (mode === "browser" || session.progress.processedMs >= 4000)) ||
      session.status === "completed"
    ) {
      startedVideoRef.current = true;
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [mode, session]);

  const speakUtterance = useCallback(
    (utterance: VisionUtterance) => {
      isSpeakingRef.current = true;
      setActiveUtterance(utterance);
      const finish = () => {
        isSpeakingRef.current = false;
      };
      if (utterance.audioUrl) {
        const audio = new Audio(visionUrl(utterance.audioUrl));
        audioRef.current = audio;
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(() => {
          finish();
          setAudioBlocked(true);
        });
      } else if ("speechSynthesis" in window) {
        const speech = new SpeechSynthesisUtterance(utterance.text);
        const selected = browserVoices.find((item) => item.voiceURI === voice);
        speech.lang =
          selected?.lang || { en: "en-GB", es: "es-ES", fr: "fr-FR" }[language];
        if (selected) speech.voice = selected;
        speech.rate = 1.05;
        speech.onend = finish;
        speech.onerror = finish;
        window.speechSynthesis.speak(speech);
      } else finish();
    },
    [browserVoices, voice, language],
  );

  useEffect(() => {
    if (!session || !speak || !isPlaying || isSpeakingRef.current) return;
    const ready = session.utterances.filter(
      (item) =>
        item.sourcePtsMs <= currentMs + 200 && !spokenRef.current.has(item.id),
    );
    if (!ready.length) return;
    // Fall behind after a seek or a slow inference? Read the latest relevant line, never a backlog.
    for (const item of ready) spokenRef.current.add(item.id);
    const next = ready[ready.length - 1];
    if (currentMs - next.sourcePtsMs <= 12000) speakUtterance(next);
  }, [currentMs, session, speak, isPlaying, speakUtterance]);

  useEffect(() => {
    if (!speak || !isPlaying) stopAudio();
  }, [speak, isPlaying, stopAudio]);

  const selectedSource = sources.find((item) => item.id === sourceId);
  const live = session?.status === "running" || session?.status === "queued";
  const currentHealth = mode === "browser" ? health : serviceHealth;
  const mediaUrl =
    mode === "browser"
      ? localSource?.url || selectedSource?.mediaUrl || ""
      : session
        ? visionUrl(`/sessions/${session.id}/media`)
        : "";
  const playable = Boolean(mediaUrl || screenStream);
  const observation = session?.observations
    .filter((item) => item.sourcePtsMs <= currentMs)
    .at(-1);
  const visibleObservation =
    observation && currentMs - observation.sourcePtsMs < 1800
      ? observation
      : null;
  const currentLine = session?.utterances
    .filter((item) => item.sourcePtsMs <= currentMs)
    .at(-1);
  const progress = session?.progress.durationMs
    ? Math.min(
        100,
        (session.progress.processedMs / session.progress.durationMs) * 100,
      )
    : 0;
  const availableBrowserVoices = browserVoices.filter((item) =>
    item.lang.startsWith(language),
  );

  async function upload(file: File) {
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file, such as MP4 or WebM.");
      return;
    }
    releaseStream();
    setError(null);
    setSession(null);
    spokenRef.current.clear();
    stopAudio();
    if (mode === "browser") {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setLocalSource({ url, name: file.name });
      setSourceId("");
      setCurrentMs(0);
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await visionRequest<{ source: VisionSource }>("/sources", {
        method: "POST",
        body,
      });
      setSources((current) => [
        ...current.filter((item) => item.id !== result.source.id),
        result.source,
      ]);
      setSourceId(result.source.id);
      setLocalSource(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function run() {
    if (busy || live) return;
    setBusy(true);
    setSession(null);
    setError(null);
    setAudioBlocked(false);
    stopAudio();
    spokenRef.current.clear();
    setActiveUtterance(null);
    startedVideoRef.current = false;
    setCurrentMs(0);
    if (videoRef.current) {
      videoRef.current.pause();
      if (!screenStream) videoRef.current.currentTime = 0;
    }
    const settings: VisionSession["settings"] = {
      language,
      voice: voice || null,
      sampleFps: 1,
      pace: true,
      maxSeconds,
    };
    try {
      if (mode === "browser") {
        if (!videoRef.current || !playable)
          throw new Error("Choose a match video first.");
        const module = await import("@/lib/browser-vision");
        const controller = new AbortController();
        abortRef.current = controller;
        await module.runBrowserSession(
          videoRef.current,
          settings,
          (next) => {
            const sourceName = screenStream
              ? "Shared match window · live"
              : localSource?.name || selectedSource?.name;
            setSession(
              sourceName
                ? {
                    ...next,
                    source: {
                      ...next.source,
                      name: sourceName,
                      kind: screenStream ? "live" : next.source.kind,
                    },
                  }
                : next,
            );
            lastSessionRef.current = next.id;
          },
          controller.signal,
        );
      } else {
        const next = await visionRequest<VisionSession>("/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, ...settings }),
        });
        setSession(next);
        lastSessionRef.current = next.id;
      }
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === "AbortError")) {
        const message =
          failure instanceof Error
            ? failure.message
            : "Unable to start analysis";
        setError(message);
        setSession((current) =>
          current ? { ...current, status: "failed", error: message } : current,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    abortRef.current?.abort();
    videoRef.current?.pause();
    stopAudio();
    if (mode === "service" && session) {
      try {
        setSession(
          await visionRequest<VisionSession>(`/sessions/${session.id}`, {
            method: "DELETE",
          }),
        );
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to stop analysis",
        );
      }
    } else
      setSession((current) =>
        current ? { ...current, status: "cancelled" } : null,
      );
    setBusy(false);
    if (screenStream) releaseStream();
  }

  async function shareMatchWindow() {
    if (live || busy) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError(
        "Window sharing is available in supported desktop browsers over HTTPS or localhost. You can upload a video instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      releaseStream();
      stopAudio();
      setSession(null);
      setLocalSource(null);
      setSourceId("");
      setError(null);
      setCurrentMs(0);
      streamRef.current = stream;
      setScreenStream(stream);
      const track = stream.getVideoTracks()[0];
      if (track)
        track.onended = () => {
          abortRef.current?.abort();
          stopAudio();
          releaseStream();
          setBusy(false);
          setSession((current) =>
            current && ["running", "queued"].includes(current.status)
              ? { ...current, status: "cancelled" }
              : current,
          );
        };
    } catch (failure) {
      if (!(
        failure instanceof DOMException && failure.name === "NotAllowedError"
      ))
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to share this window.",
        );
    }
  }

  function seek(ms: number) {
    if (!videoRef.current || screenStream) return;
    stopAudio();
    setActiveUtterance(null);
    spokenRef.current = new Set(
      session?.utterances
        .filter((item) => item.sourcePtsMs < ms)
        .map((item) => item.id),
    );
    videoRef.current.currentTime = ms / 1000;
    setCurrentMs(ms);
  }

  function exportCaptions() {
    if (!session) return;
    if (mode === "service") {
      window.open(
        visionUrl(`/sessions/${session.id}/captions.vtt`),
        "_blank",
        "noopener",
      );
      return;
    }
    const stamp = (ms: number) =>
      new Date(Math.max(0, ms)).toISOString().slice(11, 23);
    const lines = session.utterances
      .map(
        (item, index, all) =>
          `${index + 1}\n${stamp(item.sourcePtsMs)} --> ${stamp(Math.min(item.sourcePtsMs + Math.max(2000, item.durationMs || 5000), all[index + 1]?.sourcePtsMs ?? Infinity))}\n${item.text.replaceAll("-->", "→")}`,
      )
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([`WEBVTT\n\n${lines}\n`], { type: "text/vtt" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "touchline-commentary.vtt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function changeMode(next: "browser" | "service") {
    if (live || busy) return;
    stopAudio();
    releaseStream();
    setMode(next);
    setSession(null);
    setCurrentMs(0);
    setVoice("");
    setError(null);
  }

  return (
    <main className="vision-app">
      <div className="vision-topline">
        <span>THE GAME. A NEW PERSPECTIVE.</span>
        <span>
          Premier League hackathon project <span className="vision-tiny-dot" />
        </span>
      </div>
      <header className="vision-header">
        <a href="/" className="vision-brand" aria-label="Touchline home">
          <img src="/branding/pl-icon-purple.svg" alt="Premier League" />
          <span className="vision-brand-divider" />
          <span>
            <strong>
              touchline<span className="vision-brand-dot">.</span>
            </strong>
            <small>AI MATCH STUDIO</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className="vision-nav-active" href="#studio">
            Match studio
          </a>
          <a href="#league">Around the league</a>
          <a href="/desk">
            Producer desk <ArrowRight size={14} />
          </a>
        </nav>
        <a
          className="vision-header-link"
          href="https://www.premierleague.com"
          target="_blank"
          rel="noreferrer"
        >
          PremierLeague.com <ExternalLink size={13} />
        </a>
      </header>

      <section className="vision-hero" id="studio">
        <div className="vision-hero-inner">
          <div>
            <p className="vision-eyebrow">
              <span /> A NEW VIEW OF MATCHDAY
            </p>
            <h1>
              See the game.
              <br />
              <span>Hear its story.</span>
            </h1>
            <p className="vision-hero-copy">
              From the pitch to the microphone. Turn match footage into computer
              vision insights and commentary in your language.
            </p>
          </div>
          <div className="vision-hero-mark" aria-hidden>
            <img src="/branding/pl-icon-white.svg" alt="" />
            <div className="vision-hero-orbit" />
            <span className="vision-hero-label">
              <ScanLine size={15} /> VISION → VOICE
            </span>
          </div>
        </div>
        <div className="vision-hero-bottom">
          <span>
            <Eye size={15} /> Real video. Real inference.
          </span>
          <span>
            <Globe2 size={15} /> Three commentary languages
          </span>
          <span>
            <Volume2 size={15} /> Free, authorized voices
          </span>
        </div>
      </section>

      <div className="vision-content">
        <div className="vision-section-heading">
          <div>
            <p className="vision-kicker">THE MATCH STUDIO</p>
            <h2>Your view. Your commentary.</h2>
          </div>
          <span
            className={`vision-connection ${currentHealth ? "vision-connected" : ""}`}
          >
            <span />{" "}
            {mode === "browser"
              ? health
                ? "Browser vision available"
                : "Checking browser"
              : serviceHealth
                ? "Vision service connected"
                : "Vision service offline"}
          </span>
        </div>

        <div className="vision-workspace">
          <div className="vision-main-column">
            <section
              className="vision-player-card"
              aria-label="Match video and vision overlay"
            >
              <div className="vision-player-top">
                <span>
                  <Radio size={14} />{" "}
                  {session
                    ? session.status === "running"
                      ? "ANALYZING MATCH"
                      : session.status.toUpperCase()
                    : "MATCH FEED"}
                </span>
                <span>
                  {screenStream
                    ? "Shared match window · live"
                    : localSource?.name ||
                      selectedSource?.name ||
                      "No match selected"}
                </span>
              </div>
              <div className="vision-video-container">
                <video
                  ref={videoRef}
                  src={mediaUrl || undefined}
                  poster={!screenStream ? selectedSource?.posterUrl : undefined}
                  onLoadedMetadata={(event) =>
                    setVideoAspect(
                      event.currentTarget.videoWidth /
                        event.currentTarget.videoHeight || 16 / 9,
                    )
                  }
                  playsInline
                  muted
                  controls={playable}
                  preload="metadata"
                  crossOrigin="anonymous"
                  onTimeUpdate={(event) =>
                    setCurrentMs(event.currentTarget.currentTime * 1000)
                  }
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onSeeking={(event) => {
                    stopAudio();
                    spokenRef.current = new Set(
                      sessionRef.current?.utterances
                        .filter(
                          (item) =>
                            item.sourcePtsMs <
                            event.currentTarget.currentTime * 1000 - 500,
                        )
                        .map((item) => item.id),
                    );
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    stopAudio();
                  }}
                  onError={() => {
                    if (mediaUrl)
                      setError(
                        "This video could not be played. Try uploading a browser-compatible MP4.",
                      );
                  }}
                />
                {!playable && (
                  <div className="vision-video-empty">
                    <div className="vision-pitch-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className="vision-video-empty-icon">
                      <ScanLine size={34} strokeWidth={1.2} />
                    </div>
                    <h3>The next story starts here.</h3>
                    <p>Choose match footage to bring the pitch into focus.</p>
                    <button
                      className="vision-btn vision-btn-lime"
                      onClick={() => uploadRef.current?.click()}
                    >
                      <Upload size={16} /> Choose a match video
                    </button>
                    <span>MP4, WebM and other browser-supported video</span>
                  </div>
                )}
                {boxes && visibleObservation && (
                  <svg
                    className="vision-detection-overlay"
                    style={
                      videoAspect > 16 / 9
                        ? {
                            height: `${(16 / 9 / videoAspect) * 100}%`,
                            top: `${(1 - 16 / 9 / videoAspect) * 50}%`,
                          }
                        : {
                            width: `${(videoAspect / (16 / 9)) * 100}%`,
                            left: `${(1 - videoAspect / (16 / 9)) * 50}%`,
                          }
                    }
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                    aria-label={`${visibleObservation.players.length} people detected${visibleObservation.ball ? ", ball detected" : ""}`}
                  >
                    {visibleObservation.players.map((player, index) => (
                      <g key={`${player.trackId}-${index}`}>
                        <rect
                          x={player.box[0] * 1000}
                          y={player.box[1] * 1000}
                          width={(player.box[2] - player.box[0]) * 1000}
                          height={(player.box[3] - player.box[1]) * 1000}
                          fill="none"
                          stroke={
                            player.team === "away" ? "#ff70d5" : "#00ff85"
                          }
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={player.box[0] * 1000}
                          y={Math.max(18, player.box[1] * 1000 - 8)}
                          fill="#fff"
                          fontSize="20"
                          paintOrder="stroke"
                          stroke="#200c35"
                          strokeWidth="5"
                        >
                          {player.trackId} ·{" "}
                          {Math.round(player.confidence * 100)}%
                        </text>
                      </g>
                    ))}
                    {visibleObservation.ball && (
                      <rect
                        x={visibleObservation.ball.box[0] * 1000}
                        y={visibleObservation.ball.box[1] * 1000}
                        width={
                          (visibleObservation.ball.box[2] -
                            visibleObservation.ball.box[0]) *
                          1000
                        }
                        height={
                          (visibleObservation.ball.box[3] -
                            visibleObservation.ball.box[1]) *
                          1000
                        }
                        fill="none"
                        stroke="#fff174"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                  </svg>
                )}
                {session && (
                  <div className="vision-video-badge">
                    <span className={live ? "vision-pulse" : ""} />
                    <ScanLine size={13} />{" "}
                    {visibleObservation
                      ? `${visibleObservation.players.length} tracked · ${visibleObservation.scene}`
                      : live
                        ? "Reading the game"
                        : "Analysis replay"}
                  </div>
                )}
              </div>
              <div className="vision-player-toolbar">
                <span>
                  <FileVideo size={14} /> {formatVisionTime(currentMs)}{" "}
                  <span className="vision-muted">
                    /{" "}
                    {formatVisionTime(
                      session?.progress.durationMs ||
                        (videoRef.current?.duration || 0) * 1000 ||
                        0,
                    )}
                  </span>
                </span>
                <div>
                  <button
                    className={boxes ? "vision-tool-active" : ""}
                    onClick={() => setBoxes((value) => !value)}
                    aria-pressed={boxes}
                    title="Toggle detection boxes"
                  >
                    <ScanLine size={16} />
                    <span>Detections</span>
                  </button>
                  <button
                    onClick={() => {
                      setSpeak((value) => !value);
                      setAudioBlocked(false);
                    }}
                    aria-label={
                      speak ? "Mute AI commentary" : "Enable AI commentary"
                    }
                    title={
                      speak ? "Mute AI commentary" : "Enable AI commentary"
                    }
                  >
                    {speak ? <Volume2 size={17} /> : <VolumeX size={17} />}
                  </button>
                  <button
                    aria-label="Fullscreen video"
                    onClick={() => videoRef.current?.requestFullscreen?.()}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </section>

            <div className="vision-pipeline" aria-label="Analysis pipeline">
              {[
                { icon: FileVideo, label: "Video input", ready: playable },
                {
                  icon: ScanLine,
                  label: "Computer vision",
                  ready: Boolean(session?.observations.length),
                },
                {
                  icon: Activity,
                  label: "Match insights",
                  ready: Boolean(session?.events.length),
                },
                {
                  icon: AudioLines,
                  label: "Your commentary",
                  ready: Boolean(session?.utterances.length),
                },
              ].map((stage, index) => (
                <div
                  className={stage.ready ? "vision-stage-ready" : ""}
                  key={stage.label}
                >
                  <span className="vision-stage-icon">
                    {stage.ready ? (
                      <Check size={16} />
                    ) : (
                      <stage.icon size={16} />
                    )}
                  </span>
                  <span>{stage.label}</span>
                  {index < 3 && (
                    <ChevronRight className="vision-stage-chevron" size={15} />
                  )}
                </div>
              ))}
            </div>

            <section className="vision-commentary-card">
              <div className="vision-card-heading">
                <h3>
                  <AudioLines size={18} /> The commentary box
                </h3>
                <span className="vision-language-label">
                  {languages.find((item) => item.value === language)?.native}
                </span>
              </div>
              <div
                className={`vision-commentary-line ${currentLine ? "vision-has-line" : ""}`}
              >
                <span className="vision-quote-mark">“</span>
                <p>
                  {currentLine?.text ||
                    (live
                      ? "Watching the play. Commentary will appear when the model has something to say."
                      : "Every passage of play has a story. Run the analysis to hear this one.")}
                </p>
                {currentLine && (
                  <span>
                    {formatVisionTime(currentLine.sourcePtsMs)} ·{" "}
                    {isSpeakingRef.current &&
                    activeUtterance?.id === currentLine.id
                      ? "Speaking"
                      : "Generated from video"}
                  </span>
                )}
              </div>
              {audioBlocked && (
                <button
                  className="vision-audio-enable"
                  onClick={() => {
                    setAudioBlocked(false);
                    if (activeUtterance) speakUtterance(activeUtterance);
                  }}
                >
                  <Volume2 size={15} /> Click to enable commentary audio
                </button>
              )}
              <div className="vision-commentary-footer">
                <span>
                  <Waves size={14} />{" "}
                  {mode === "browser"
                    ? "Device speech synthesis"
                    : "Free local voice synthesis"}
                </span>
                <button
                  onClick={exportCaptions}
                  disabled={!session?.utterances.length}
                >
                  <ArrowDownToLine size={14} /> Captions
                </button>
                {mode === "service" && session && (
                  <a
                    href={visionUrl(`/sessions/${session.id}/commentary.wav`)}
                    download
                    className={
                      !session.utterances.length ? "vision-disabled-link" : ""
                    }
                  >
                    <ArrowDownToLine size={14} /> Audio
                  </a>
                )}
              </div>
            </section>

            <section className="vision-timeline-card">
              <div className="vision-card-heading">
                <h3>
                  <Layers3 size={18} /> Match observations
                </h3>
                <span>{session?.events.length || 0} insights</span>
              </div>
              {session?.events.length ? (
                <ol className="vision-timeline">
                  {session.events
                    .slice()
                    .reverse()
                    .map((event) => (
                      <li key={event.id}>
                        <button onClick={() => seek(event.sourcePtsMs)}>
                          <time>{formatVisionTime(event.sourcePtsMs)}</time>
                          <span className="vision-event-dot" />
                          <span>
                            <strong>{event.type.replaceAll("_", " ")}</strong>
                            <span>{event.text}</span>
                          </span>
                          <small>{Math.round(event.confidence * 100)}%</small>
                          <Play size={13} />
                        </button>
                      </li>
                    ))}
                </ol>
              ) : (
                <div className="vision-timeline-empty">
                  <Activity size={22} />
                  <div>
                    <strong>The evidence goes here.</strong>
                    <p>
                      Time-stamped observations appear as the video is analyzed.
                      Nothing is pre-scripted.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="vision-controls" aria-label="Commentary settings">
            <div className="vision-control-title">
              <span>
                <Settings2 size={19} /> Make it yours
              </span>
              <span>01 — SETUP</span>
            </div>
            <div className="vision-control-body">
              <label className="vision-field-label">PROCESSING ENGINE</label>
              <div className="vision-engine-toggle">
                <button
                  className={mode === "browser" ? "vision-selected" : ""}
                  onClick={() => changeMode("browser")}
                  disabled={live || busy}
                >
                  <Zap size={14} /> This browser
                </button>
                <button
                  className={mode === "service" ? "vision-selected" : ""}
                  onClick={() => changeMode("service")}
                  disabled={live || busy}
                >
                  <Layers3 size={14} /> Local service
                </button>
              </div>
              <p className="vision-field-hint">
                {mode === "browser"
                  ? "Runs on your device. Video stays in your browser."
                  : "Uses the dedicated vision backend for tracking and downloadable voice audio."}
              </p>
              <label className="vision-field-label" htmlFor="vision-source">
                MATCH FOOTAGE
              </label>
              {sources.length > 0 && (
                <select
                  id="vision-source"
                  value={sourceId}
                  disabled={live || busy}
                  onChange={(event) => {
                    releaseStream();
                    setSourceId(event.target.value);
                    setLocalSource(null);
                    setSession(null);
                    setError(null);
                    setCurrentMs(0);
                  }}
                >
                  {(localSource || screenStream) && (
                    <option value="">
                      {screenStream
                        ? "Shared match window · live"
                        : localSource?.name}
                    </option>
                  )}
                  {sources.map((source) => (
                    <option value={source.id} key={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                ref={uploadRef}
                type="file"
                accept="video/*"
                className="vision-file-input"
                aria-label="Upload match video"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload(file);
                  event.target.value = "";
                }}
                disabled={live || busy || uploading}
              />
              <button
                className="vision-upload"
                onClick={() => uploadRef.current?.click()}
                disabled={live || busy || uploading}
              >
                {uploading ? (
                  <Loader2 size={20} className="vision-spin" />
                ) : (
                  <Upload size={20} />
                )}
                <span>
                  <strong>
                    {localSource ? localSource.name : "Upload your footage"}
                  </strong>
                  <small>
                    {mode === "browser"
                      ? "No upload to a server · MP4 / WebM"
                      : "Choose an authorized match video"}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
              {mode === "browser" && (
                <button
                  className="vision-share-window"
                  disabled={live || busy}
                  onClick={screenStream ? releaseStream : shareMatchWindow}
                >
                  <MonitorUp size={16} />{" "}
                  {screenStream
                    ? "Stop sharing match window"
                    : "Share a match window"}
                  <span>{screenStream ? "Sharing" : "LIVE"}</span>
                </button>
              )}
              {screenStream && (
                <p className="vision-field-hint">
                  Your shared window is live. Keep the match visible, then start
                  analysis. Only video is captured.
                </p>
              )}
              {selectedSource?.provenance && !localSource && (
                <p className="vision-provenance">
                  <Check size={12} />{" "}
                  {selectedSource.provenance.license ||
                    "Authorized demo footage"}
                  {selectedSource.provenance.url && (
                    <a
                      href={selectedSource.provenance.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source <ExternalLink size={10} />
                    </a>
                  )}
                </p>
              )}

              <label className="vision-field-label" htmlFor="vision-language">
                COMMENTARY LANGUAGE
              </label>
              <div className="vision-language-control">
                <Globe2 size={16} />
                <select
                  id="vision-language"
                  value={language}
                  disabled={live || busy}
                  onChange={(event) => {
                    setLanguage(event.target.value as VisionLanguage);
                    setVoice("");
                  }}
                >
                  {languages.map((item) => (
                    <option value={item.value} key={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="vision-field-label" htmlFor="vision-voice">
                YOUR VOICE
              </label>
              <select
                id="vision-voice"
                value={voice}
                disabled={live || busy}
                onChange={(event) => setVoice(event.target.value)}
              >
                <option value="">
                  {mode === "browser"
                    ? "Device default voice"
                    : "Default authorized voice"}
                </option>
                {mode === "browser"
                  ? availableBrowserVoices.map((item) => (
                      <option key={item.voiceURI} value={item.voiceURI}>
                        {item.name}
                        {item.localService ? " · on device" : ""}
                      </option>
                    ))
                  : serviceHealth?.speech?.voices
                      .filter(
                        (item) =>
                          !item.language || item.language.startsWith(language),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
              </select>
              <p className="vision-field-hint">
                {mode === "browser"
                  ? "Uses the voices available on your device. Voice availability varies by browser."
                  : "Open source speech voices. No impersonation or voice cloning."}
              </p>

              <div className="vision-range-label">
                <label className="vision-field-label" htmlFor="vision-duration">
                  ANALYZE UP TO
                </label>
                <strong>
                  {maxSeconds === 60 ? "1 minute" : `${maxSeconds} seconds`}
                </strong>
              </div>
              <input
                id="vision-duration"
                type="range"
                min="15"
                max="180"
                step="15"
                value={maxSeconds}
                disabled={live || busy}
                onChange={(event) => setMaxSeconds(Number(event.target.value))}
              />
              <div className="vision-range-ends">
                <span>15 sec</span>
                <span>3 min</span>
              </div>
              <div className="vision-controls-divider" />
              <label className="vision-checkbox">
                <input
                  type="checkbox"
                  checked={boxes}
                  onChange={(event) => setBoxes(event.target.checked)}
                />
                <span>Show detection overlay</span>
                <ScanLine size={15} />
              </label>
              <label className="vision-checkbox">
                <input
                  type="checkbox"
                  checked={speak}
                  onChange={(event) => setSpeak(event.target.checked)}
                />
                <span>Play AI commentary</span>
                <Volume2 size={15} />
              </label>

              {error && (
                <div className="vision-error" role="alert">
                  {error}
                </div>
              )}
              {mode === "service" && !serviceHealth && (
                <div className="vision-service-note">
                  <CircleHelp size={16} />
                  <div>
                    <strong>Connect your local engine</strong>
                    <p>
                      Start the vision service on port 8788, then refresh. Or
                      use “This browser” to get started now.
                    </p>
                    {serviceError?.includes("401") && (
                      <a
                        className="vision-sign-in"
                        href="/signin-with-chatgpt?return_to=/"
                      >
                        Sign in to connect <ArrowRight size={12} />
                      </a>
                    )}
                    <button onClick={refreshConnection}>
                      <RefreshCw size={12} /> Check connection
                    </button>
                    {serviceError && (
                      <details>
                        <summary>Connection details</summary>
                        <small>{serviceError}</small>
                      </details>
                    )}
                  </div>
                </div>
              )}
              {live || busy ? (
                <button
                  className="vision-btn vision-btn-purple vision-run"
                  onClick={stop}
                >
                  <Square size={15} fill="currentColor" /> Stop analysis
                </button>
              ) : (
                <button
                  className="vision-btn vision-btn-purple vision-run"
                  onClick={run}
                  disabled={
                    uploading ||
                    (mode === "service" && (!serviceHealth || !sourceId)) ||
                    (mode === "browser" && !playable)
                  }
                >
                  <Play size={17} fill="currentColor" />{" "}
                  {session ? "Run again" : "Start match analysis"}
                  <ArrowRight size={16} />
                </button>
              )}
              <p className="vision-run-note">
                {live
                  ? session?.status === "queued"
                    ? "Preparing the model. The first run downloads weights."
                    : "Analyzing as the video plays."
                  : "First run downloads the vision model. Keep this tab open."}
              </p>
            </div>
            <div className="vision-model-info">
              <span>
                <span
                  className={
                    live
                      ? "vision-status-dot vision-pulse"
                      : "vision-status-dot"
                  }
                />{" "}
                {currentHealth?.model?.name || "Computer vision engine"}
              </span>
              <p>
                Person detections and visual observations are estimates. Goals
                and player identities require stronger evidence.
              </p>
            </div>
          </aside>
        </div>

        {session && (
          <section className="vision-metrics" aria-label="Analysis metrics">
            <div className="vision-progress-stat">
              <span>ANALYSIS PROGRESS</span>
              <strong>
                {Math.round(progress)}
                <small>%</small>
              </strong>
              <div className="vision-progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>
              <small>
                {formatVisionTime(session.progress.processedMs)} /{" "}
                {formatVisionTime(session.progress.durationMs)} processed
              </small>
            </div>
            <div>
              <span>FRAMES ANALYZED</span>
              <strong>{session.metrics.frames}</strong>
              <small>Actual model inferences</small>
            </div>
            <div>
              <span>MEDIAN INFERENCE</span>
              <strong>
                {Math.round(session.metrics.inferenceP50Ms)}
                <small>ms</small>
              </strong>
              <small>P95 {Math.round(session.metrics.inferenceP95Ms)} ms</small>
            </div>
            <div>
              <span>COMMENTARY LINES</span>
              <strong>{session.utterances.length}</strong>
              <small>Grounded in visual observations</small>
            </div>
          </section>
        )}

        <section className="vision-league-section" id="league">
          <div className="vision-section-heading">
            <div>
              <p className="vision-kicker">AROUND THE LEAGUE</p>
              <h2>The bigger picture.</h2>
            </div>
            <a
              className="vision-text-link"
              href={league?.sourceUrl || "https://www.premierleague.com"}
              target="_blank"
              rel="noreferrer"
            >
              PremierLeague.com <ArrowRight size={15} />
            </a>
          </div>
          <div className="vision-league-grid">
            <div className="vision-fixtures-card">
              <div className="vision-card-heading">
                <h3>
                  <img src="/branding/pl-icon-purple.svg" alt="" /> Premier
                  League
                </h3>
                <span>
                  {league?.season || "League feed"}
                  {league?.matchweek ? ` · MW ${league.matchweek}` : ""}
                </span>
              </div>
              {league?.fixtures?.length ? (
                <div className="vision-fixtures">
                  {league.fixtures.slice(0, 5).map((fixture) => (
                    <a
                      key={fixture.id}
                      href={
                        league.sourceUrl ||
                        "https://www.premierleague.com/en/matches"
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="vision-fixture-team">
                        <span>{fixture.home}</span>
                        <Badge name={fixture.home} src={fixture.homeBadge} />
                      </span>
                      <strong className="vision-fixture-score">
                        {fixture.homeScore != null && fixture.awayScore != null
                          ? `${fixture.homeScore} — ${fixture.awayScore}`
                          : fixture.kickoff
                            ? new Date(fixture.kickoff).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "v"}
                      </strong>
                      <span className="vision-fixture-team vision-away">
                        <Badge name={fixture.away} src={fixture.awayBadge} />
                        <span>{fixture.away}</span>
                      </span>
                      <small>
                        {fixture.status
                          ? fixtureStatus(fixture.status)
                          : fixture.kickoff
                            ? new Date(fixture.kickoff).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })
                            : "Fixture"}
                      </small>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="vision-feed-empty">
                  <Radio size={23} />
                  <p>
                    {leagueError
                      ? "League updates are unavailable right now."
                      : "Connecting to the official league feed…"}
                  </p>
                  <a
                    href="https://www.premierleague.com/en/matches"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View official fixtures <ExternalLink size={12} />
                  </a>
                </div>
              )}
              <div className="vision-feed-footnote">
                {league?.stale
                  ? "Saved snapshot · official data"
                  : "Official league data"}
                {league?.updatedAt &&
                  ` · Updated ${new Date(league.updatedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
              </div>
            </div>
            <div className="vision-standings-card">
              <div className="vision-card-heading">
                <h3>
                  The table
                  {league?.standingsMatchweek ? (
                    <small className="vision-table-week">
                      MW {league.standingsMatchweek}
                    </small>
                  ) : null}
                </h3>
                <a
                  href="https://www.premierleague.com/en/tables"
                  target="_blank"
                  rel="noreferrer"
                >
                  Full table <ArrowRight size={13} />
                </a>
              </div>
              {league?.standings?.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>POS</th>
                      <th>CLUB</th>
                      <th>PL</th>
                      <th>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {league.standings.slice(0, 6).map((team) => (
                      <tr key={team.position}>
                        <td>{team.position}</td>
                        <td>
                          <Badge name={team.team} src={team.badge} />
                          <span>{team.team}</span>
                        </td>
                        <td>{team.played}</td>
                        <td>{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="vision-feed-empty">
                  <Layers3 size={23} />
                  <p>Standings appear when official data is available.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="vision-method-note">
          <div>
            <Eye size={20} />
            <span>
              <strong>Let the game lead.</strong>
              <p>
                This prototype comments on what the model can see. It does not
                invent player names, goals, or match facts from uncertain
                detections.
              </p>
            </span>
          </div>
          <a href="/desk">
            Need precise event control? Open the producer desk{" "}
            <ArrowRight size={15} />
          </a>
        </div>
      </div>
      <footer className="vision-footer">
        <div>
          <img src="/branding/pl-icon-white.svg" alt="Premier League" />
          <strong>touchline.</strong>
          <span>A new perspective on the beautiful game.</span>
        </div>
        <p>
          Independent hackathon prototype. Premier League branding used for the
          authorized project.
          <br />
          Computer vision and generated commentary may be inaccurate.
        </p>
        <a href="/desk">
          Producer desk <ArrowRight size={13} />
        </a>
      </footer>
    </main>
  );
}
