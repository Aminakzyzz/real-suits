"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flag,
  FolderOpen,
  HelpCircle,
  Mic2,
  Monitor,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Target,
  Trash2,
  Undo2,
  Upload,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  applyCommand,
  clockSeconds,
  commentary,
  Command,
  eventKinds,
  EventKind,
  eventLabels,
  exportCsv,
  exportReport,
  exportSrt,
  formatClock,
  Language,
  Match,
  matchSchema,
  newMatch,
  Side,
  stats,
  Style,
} from "@/lib/match";
import Scoreboard from "./scoreboard";

type Binding = { id: string; version: number; readKey: string };
type ApiData = {
  match: Match;
  version: number;
  readKey: string;
  error?: string;
  matches: Array<{ id: string; title: string; updatedAt: string }>;
};
async function readApi(response: Response): Promise<ApiData> {
  return (await response.json()) as ApiData;
}
type Panel = "desk" | "squad" | "studio" | "report";
const languages = { en: "English", es: "Español", fr: "Français" };
const shortcuts: Record<string, EventKind> = {
  g: "goal",
  s: "shot",
  t: "on_target",
  c: "corner",
  y: "yellow",
  r: "red",
  u: "substitution",
};
const fileBase = (m: Match) =>
  m.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "match";
function download(content: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default function Desk({
  user,
}: {
  user: { id: string; name: string } | null;
}) {
  const [match, setMatch] = useState<Match | null>(null),
    [binding, setBinding] = useState<Binding | null>(null),
    [ready, setReady] = useState(false),
    [panel, setPanel] = useState<Panel>("desk"),
    [side, setSide] = useState<Side>("home"),
    [player, setPlayer] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [eventModal, setEventModal] = useState<EventKind | null>(null),
    [modal, setModal] = useState<"new" | "saved" | "help" | null>(null),
    [saved, setSaved] = useState<
      Array<{ id: string; title: string; updatedAt: string }>
    >([]),
    [savedLoading, setSavedLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [voice, setVoice] = useState(""),
    [narration, setNarration] = useState(false),
    [speechSupported, setSpeechSupported] = useState(false);
  const [videoUrl, setVideoUrl] = useState(""),
    [videoName, setVideoName] = useState("");
  const clipSeconds = useRef<number | null>(null);
  const video = useRef<HTMLVideoElement>(null),
    upload = useRef<HTMLInputElement>(null);
  const lock = useRef(false),
    storageFailed = useRef(false);
  const draftKey = `touchline.draft.${user?.id ?? "guest"}`;
  useEffect(() => {
    let active = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const local = JSON.parse(raw),
          m = matchSchema.parse(local.match);
        setMatch(m);
        if (user && local.binding) {
          setBinding(local.binding);
          fetch(`/api/matches/${encodeURIComponent(local.binding.id)}`)
            .then(async (r) => {
              if (!r.ok)
                throw new Error(
                  "Your saved cloud match could not be loaded. This browser copy is available; reopen it from Saved matches.",
                );
              return readApi(r);
            })
            .then((data) => {
              if (active) {
                setMatch(matchSchema.parse(data.match));
                setBinding({
                  id: data.match.id,
                  version: data.version,
                  readKey: data.readKey,
                });
              }
            })
            .catch((e) => {
              if (active) {
                setBinding(null);
                setError(e.message);
              }
            });
        }
      } else setMatch(newMatch(true));
    } catch {
      setMatch(newMatch(true));
      setError(
        "The previous browser draft could not be read. Import a project backup to recover it.",
      );
    }
    setReady(true);
    return () => {
      active = false;
    };
  }, [draftKey, user]);
  useEffect(() => {
    if (ready && match) {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ match, binding }));
      } catch {
        if (!storageFailed.current) {
          setError(
            "Browser storage is full or unavailable. Export a project backup before leaving.",
          );
          storageFailed.current = true;
        }
      }
    }
  }, [match, binding, ready, draftKey]);
  useEffect(() => {
    const supported = "speechSynthesis" in window;
    setSpeechSupported(supported);
    if (!supported) return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      speechSynthesis.cancel();
    };
  }, []);
  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(t);
  }, [message]);
  const say = useCallback(
    (text: string, lang: Language) => {
      if (!speechSupported) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = { en: "en-GB", es: "es-ES", fr: "fr-FR" }[lang];
      const selected =
        voices.find((v) => v.voiceURI === voice) ??
        voices.find((v) => v.lang.startsWith(lang));
      if (selected) utterance.voice = selected;
      utterance.rate = 1;
      utterance.onerror = (e) => {
        if (!["canceled", "interrupted"].includes(e.error))
          setError(
            "This device could not play the selected voice. Try another voice.",
          );
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    },
    [voices, voice, speechSupported],
  );
  async function act(command: Command) {
    if (!match || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let next: Match;
      if (binding) {
        const r = await fetch(`/api/matches/${binding.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: binding.version, command }),
        });
        const data = await readApi(r);
        if (data.match) {
          setMatch(matchSchema.parse(data.match));
          setBinding({
            id: data.match.id,
            version: data.version,
            readKey: data.readKey,
          });
        }
        if (!r.ok) throw new Error(data.error ?? "Unable to save this action.");
        next = data.match;
      } else {
        next = applyCommand(match, command);
        setMatch(next);
      }
      if (command.type === "event" && narration) {
        const e = next.events.find((e) => e.id === command.event.id);
        if (e) say(commentary(next, e), next.settings.language);
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat ||
        modal ||
        eventModal ||
        panel !== "desk"
      )
        return;
      const target = e.target as HTMLElement;
      if (target.closest("input,select,textarea,button,[contenteditable]"))
        return;
      if (e.key === " ") {
        e.preventDefault();
        void actRef.current({ type: "clock", action: "toggle" });
      } else if (shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        setEventModal(shortcuts[e.key.toLowerCase()]);
      } else if (e.key.toLowerCase() === "z" && match?.events.length) {
        void actRef.current({
          type: "remove",
          eventId: match.events.at(-1)!.id,
        });
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [modal, eventModal, panel, match]);
  async function saveCloud() {
    if (!match || !user || lock.current || binding) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(match),
      });
      const data = await readApi(r);
      if (!r.ok) throw new Error(data.error);
      setMatch(matchSchema.parse(data.match));
      setBinding({
        id: data.match.id,
        version: data.version,
        readKey: data.readKey,
      });
      setMessage("Saved. Future changes sync to this match automatically.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function openSaved() {
    setModal("saved");
    setSavedLoading(true);
    try {
      const r = await fetch("/api/matches");
      const data = await readApi(r);
      if (!r.ok) throw new Error(data.error);
      setSaved(data.matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load matches.");
    } finally {
      setSavedLoading(false);
    }
  }
  async function loadSaved(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/matches/${id}`);
      const data = await readApi(r);
      if (!r.ok) throw new Error(data.error);
      setMatch(matchSchema.parse(data.match));
      setBinding({ id, version: data.version, readKey: data.readKey });
      setModal(null);
      setPanel("desk");
      setPlayer("");
      setMessage("Saved match opened.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open match.");
    } finally {
      setBusy(false);
    }
  }
  async function importProject(file: File) {
    try {
      if (file.size > 750000)
        throw new Error("Project files must be smaller than 750 KB.");
      const m = matchSchema.parse(JSON.parse(await file.text()));
      m.id = crypto.randomUUID();
      m.clock = { ...m.clock, seconds: clockSeconds(m), startedAt: null };
      setMatch(m);
      setBinding(null);
      setPlayer("");
      setMessage("Project imported as a new browser draft. Clock paused.");
    } catch (e) {
      setError(
        e instanceof Error && !("issues" in e)
          ? e.message
          : "Invalid Touchline project. Expected a version 1 project backup.",
      );
    }
  }
  function overlayUrl() {
    if (typeof window === "undefined") return "";
    return binding
      ? `${location.origin}/overlay/${binding.id}?key=${encodeURIComponent(binding.readKey)}`
      : `${location.origin}/overlay/local?draft=${encodeURIComponent(draftKey)}`;
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(overlayUrl());
      setMessage("Overlay link copied.");
    } catch {
      setError("Clipboard unavailable. Open the overlay and copy its address.");
    }
  }
  function exportFile(kind: "json" | "csv" | "srt" | "md") {
    if (!match) return;
    const content =
      kind === "json"
        ? JSON.stringify(
            {
              ...match,
              clock: {
                ...match.clock,
                seconds: clockSeconds(match),
                startedAt: null,
              },
            },
            null,
            2,
          )
        : kind === "csv"
          ? exportCsv(match)
          : kind === "srt"
            ? exportSrt(match)
            : exportReport(match);
    download(
      content,
      `${fileBase(match)}.${kind}`,
      kind === "json"
        ? "application/json"
        : kind === "csv"
          ? "text/csv;charset=utf-8"
          : "text/plain;charset=utf-8",
    );
    setMessage(`${kind.toUpperCase()} downloaded.`);
  }
  function scorecard() {
    if (!match) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const c = canvas.getContext("2d");
    if (!c) return;
    const t = stats(match);
    c.fillStyle = "#123b30";
    c.fillRect(0, 0, 1600, 900);
    c.strokeStyle = "#255044";
    for (let x = -800; x < 1600; x += 160) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 900, 900);
      c.stroke();
    }
    c.fillStyle = "#ddf47c";
    c.font = "bold 30px sans-serif";
    c.fillText("TOUCHLINE / MATCHDAY", 90, 100);
    c.fillStyle = "#ffffff";
    c.font = "32px sans-serif";
    c.fillText(match.competition.slice(0, 60), 90, 190);
    c.font = "bold 140px sans-serif";
    c.fillText(`${t.home.goals} — ${t.away.goals}`, 90, 440);
    c.font = "bold 55px sans-serif";
    c.fillText(match.home.name, 90, 560, 1400);
    c.fillText(match.away.name, 90, 635, 1400);
    c.font = "25px sans-serif";
    c.fillStyle = "#bac8bc";
    c.fillText(`${match.clock.period} · ${match.venue}`.slice(0, 100), 90, 740);
    if (match.settings.sponsor)
      c.fillText(`Match partner: ${match.settings.sponsor}`, 90, 800, 1400);
    const a = document.createElement("a");
    a.download = `${fileBase(match)}-scorecard.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }
  if (!match)
    return (
      <main className="loading">
        <Radio size={32} />
        <h1>Opening the commentary desk…</h1>
      </main>
    );
  const tally = stats(match),
    last = match.events.at(-1),
    lastPlayer = last
      ? match[last.side].players.find((p) => p.id === last.playerId)
      : null;
  const tabs: Array<[Panel, typeof Radio, string]> = [
    ["desk", Radio, "Live desk"],
    ["squad", Users, "Teams & players"],
    ["studio", Settings2, "Studio"],
    ["report", FileText, "Match report"],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Touchline home">
          <span className="brand-icon">
            <Radio size={23} />
          </span>
          touchline<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR MATCHDAY WORKSPACE</div>
        <nav aria-label="Main navigation">
          {tabs.map(([id, Icon, title]) => (
            <button
              key={id}
              className={`nav-item ${panel === id ? "active" : ""}`}
              onClick={() => setPanel(id)}
            >
              <Icon size={18} />
              {title}
              {id === "desk" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-label">BUILT FOR THE TOUCHLINE</span>
            <h3>
              Big-match energy.
              <br />
              Your club's story.
            </h3>
            <p>One operator. A whole production desk.</p>
            <span className="pitch-icon">
              ◜ ─ ◝<br />│ ○ │<br />◟ ─ ◞
            </span>
          </div>
          <button className="nav-item" onClick={() => setModal("help")}>
            <HelpCircle size={18} />
            Matchday guide <ArrowUpRight size={15} />
          </button>
          <div className="profile">
            <span className="avatar">
              {user?.name.charAt(0).toUpperCase() ?? "T"}
            </span>
            <div>
              <strong>{user?.name ?? "Your local workspace"}</strong>
              <small>
                {user
                  ? "Signed in · private workspace"
                  : "No account needed to try"}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {panel === "desk"
                ? "Live desk"
                : tabs.find((t) => t[0] === panel)?.[2]}
            </strong>
          </div>
          <div className="top-actions">
            <span className={`save-state ${busy ? "pending" : ""}`}>
              <span />
              {busy ? "Saving…" : binding ? "Cloud synced" : "Browser draft"}
            </span>
            {user ? (
              <button
                className="quiet-button"
                onClick={openSaved}
                disabled={busy}
              >
                <FolderOpen size={16} />
                Saved matches
              </button>
            ) : (
              <a
                className="quiet-button"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                Sign in to save
              </a>
            )}
            <button
              className="dark-button compact"
              onClick={() => setModal("new")}
              disabled={busy}
            >
              <Plus size={16} />
              New match
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="green-dot" /> THE MATCHDAY STUDIO
              </div>
              <h1>
                {panel === "desk"
                  ? "Every match has a story."
                  : panel === "squad"
                    ? "Know the names. Tell the story."
                    : panel === "studio"
                      ? "Make it sound like you."
                      : "From the whistle to the recap."}
              </h1>
              <p>
                {panel === "desk"
                  ? "You call the moments. We put them into words."
                  : panel === "squad"
                    ? "Your teams, shirt numbers and approved player facts, all in one place."
                    : panel === "studio"
                      ? "Set the language, choose a voice and prepare your broadcast."
                      : "A clear record of the match, ready for your next production."}
              </p>
            </div>
            <button
              className="outline-button heading-button"
              onClick={() => exportFile("json")}
            >
              <Download size={16} />
              Export project
            </button>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={16} />
              </button>
            </div>
          )}
          {message && (
            <div className="alert success" role="status">
              <Check size={16} />
              {message}
            </div>
          )}
          <div className="mobile-tabs">
            {tabs.map(([id, Icon, title]) => (
              <button
                key={id}
                className={panel === id ? "active" : ""}
                onClick={() => setPanel(id)}
              >
                <Icon size={16} />
                {title}
              </button>
            ))}
          </div>
          {panel === "desk" && (
            <>
              <div className="match-banner">
                <div className="match-context">
                  <span className="small-label">
                    {match.demo
                      ? "DEMO FIXTURE · FICTIONAL TEAMS"
                      : match.competition || "YOUR MATCH"}
                  </span>
                  <h2>
                    {match.home.name} <span>vs</span> {match.away.name}
                  </h2>
                  <p>
                    <Flag size={13} />
                    {match.venue || "Add a venue in Teams & players"}
                    <span>•</span>
                    {match.demo
                      ? "Try every control"
                      : "Operator-confirmed coverage"}
                  </p>
                </div>
                <div className="match-status">
                  <span className="status-pill">
                    <span />
                    {match.clock.startedAt
                      ? "CLOCK RUNNING"
                      : match.clock.period === "FT"
                        ? "FULL TIME"
                        : "READY AT THE TOUCHLINE"}
                  </span>
                  <div className="mini-score">
                    {tally.home.goals}
                    <span>—</span>
                    {tally.away.goals}
                  </div>
                </div>
              </div>
              <div className="desk-grid">
                <section className="left-stack">
                  {videoUrl && (
                    <div className="alert success">
                      <Video size={16} />
                      Clip attached: events use the last playhead time.{" "}
                      <button onClick={() => setPanel("studio")}>
                        Adjust in Studio →
                      </button>
                    </div>
                  )}
                  <div className="card event-card">
                    <div className="card-title">
                      <h2>
                        <CircleDot size={17} />
                        Call the action
                      </h2>
                      <span className="subtle">
                        Confirm a moment to add commentary
                      </span>
                    </div>
                    <div className="team-toggle">
                      {(["home", "away"] as Side[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setSide(s);
                            setPlayer("");
                          }}
                          className={side === s ? "selected" : ""}
                        >
                          <span
                            className="team-dot"
                            style={{ background: match[s].color }}
                          />
                          {match[s].name}
                          <small>{s.toUpperCase()}</small>
                        </button>
                      ))}
                    </div>
                    <label className="player-select">
                      Player <span>optional for team events</span>
                      <select
                        value={player}
                        onChange={(e) => setPlayer(e.target.value)}
                      >
                        <option value="">Choose a player</option>
                        {match[side].players.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.number} · {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="event-buttons">
                      {(
                        [
                          "goal",
                          "shot",
                          "on_target",
                          "corner",
                          "yellow",
                          "red",
                          "substitution",
                          "save",
                        ] as EventKind[]
                      ).map((kind) => (
                        <button
                          key={kind}
                          className={`event-button event-${kind}`}
                          disabled={busy || match.clock.period === "FT"}
                          onClick={() => setEventModal(kind)}
                        >
                          <span className="event-symbol">
                            {kind === "goal" ? (
                              "⚽"
                            ) : kind === "shot" ? (
                              "↗"
                            ) : kind === "on_target" ? (
                              "◎"
                            ) : kind === "corner" ? (
                              "⚑"
                            ) : kind === "yellow" || kind === "red" ? (
                              <i />
                            ) : kind === "substitution" ? (
                              "⇄"
                            ) : (
                              "⌁"
                            )}
                          </span>
                          <strong>{eventLabels[kind]}</strong>
                          <kbd>
                            {Object.entries(shortcuts)
                              .find(([, v]) => v === kind)?.[0]
                              .toUpperCase() ?? "·"}
                          </kbd>
                        </button>
                      ))}
                    </div>
                    <div className="event-footer">
                      <button
                        className="text-button"
                        disabled={busy || !last}
                        onClick={() =>
                          last && act({ type: "remove", eventId: last.id })
                        }
                      >
                        <Undo2 size={15} />
                        Undo last event
                      </button>
                      <button
                        className="text-button"
                        disabled={busy || match.clock.period === "FT"}
                        onClick={() => setEventModal("note")}
                      >
                        <Plus size={15} />
                        Add a note
                      </button>
                    </div>
                  </div>
                  <div className="card commentary-card">
                    <div className="card-title">
                      <h2>
                        <Mic2 size={17} />
                        Commentary feed
                      </h2>
                      <span className="badge">
                        {match.events.length} moments
                      </span>
                    </div>
                    <div className="feed-tools">
                      <span>
                        <span className="green-dot" />
                        Verified events · {languages[match.settings.language]}
                      </span>
                      <button
                        className={`voice-toggle ${narration ? "enabled" : ""}`}
                        disabled={!speechSupported}
                        onClick={() => {
                          setNarration(!narration);
                          if (narration) speechSynthesis.cancel();
                          else if (last)
                            say(
                              commentary(match, last),
                              match.settings.language,
                            );
                        }}
                      >
                        {narration ? (
                          <Volume2 size={15} />
                        ) : (
                          <VolumeX size={15} />
                        )}
                        Voice {narration ? "on" : "off"}
                      </button>
                    </div>
                    <div className="feed-list">
                      {match.events.length ? (
                        [...match.events].reverse().map((e) => (
                          <article
                            className={`feed-item ${e.kind === "goal" ? "feed-goal" : ""}`}
                            key={e.id}
                          >
                            <div className="feed-time">
                              {formatClock(e.seconds)}
                              <span className={e.side} />
                            </div>
                            <div className="feed-copy">
                              <span className="feed-kind">
                                {eventLabels[e.kind]}{" "}
                                <span>· {match[e.side].short}</span>
                              </span>
                              <p>{commentary(match, e)}</p>
                              <div className="feed-item-actions">
                                <button
                                  aria-label={`Read commentary at ${formatClock(e.seconds)}`}
                                  disabled={!speechSupported}
                                  onClick={() =>
                                    say(
                                      commentary(match, e),
                                      match.settings.language,
                                    )
                                  }
                                >
                                  <Volume2 size={13} />
                                  Listen
                                </button>
                                <button
                                  aria-label={`Remove ${eventLabels[e.kind]} at ${formatClock(e.seconds)}`}
                                  disabled={busy}
                                  onClick={() =>
                                    act({ type: "remove", eventId: e.id })
                                  }
                                >
                                  <Trash2 size={13} />
                                  Correct
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="empty-state">
                          <Radio />
                          <h3>Ready for the first moment.</h3>
                          <p>Add a confirmed event to start your commentary.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                <aside className="right-stack">
                  <div className="card broadcast-card">
                    <div className="card-title">
                      <h2>
                        <Monitor size={17} />
                        Broadcast preview
                      </h2>
                      <span className="preview-tag">PREVIEW</span>
                    </div>
                    <div className="pitch-preview">
                      <div className="pitch-marking" />
                      <Scoreboard match={match} />
                      <div className="pitch-center">
                        <span className="tiny-ball">✦</span>
                        <small>{match.competition}</small>
                      </div>
                      {last && (
                        <div className="preview-lower">
                          <small>
                            {eventLabels[last.kind]} ·{" "}
                            {formatClock(last.seconds)}
                          </small>
                          <strong>
                            {lastPlayer?.name ?? match[last.side].name}
                          </strong>
                          <span>
                            {lastPlayer?.fact || commentary(match, last)}
                          </span>
                        </div>
                      )}
                      <div className="preview-credit">
                        TOUCHLINE <span>STUDIO OUTPUT</span>
                      </div>
                    </div>
                    <div className="broadcast-actions">
                      <a
                        className="dark-button"
                        href={overlayUrl()}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={15} />
                        Open overlay
                      </a>
                      <button
                        className="outline-button"
                        onClick={copyLink}
                        aria-label="Copy overlay link"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                    <p className="helper">
                      {binding
                        ? "Live cloud overlay. Viewer access follows your site's sharing settings."
                        : "Same-browser preview. Save to the cloud for a live read-only link."}
                    </p>
                  </div>
                  <div className="card clock-card">
                    <div className="card-title">
                      <h2>
                        <Clock3 size={17} />
                        Match clock
                      </h2>
                      <span className="badge">{match.clock.period}</span>
                    </div>
                    <ClockDisplay match={match} />
                    <div className="clock-controls">
                      <button
                        className="dark-button"
                        disabled={
                          busy || ["HT", "FT"].includes(match.clock.period)
                        }
                        onClick={() => act({ type: "clock", action: "toggle" })}
                      >
                        {match.clock.startedAt ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}{" "}
                        {match.clock.startedAt ? "Pause clock" : "Start clock"}
                      </button>
                      <select
                        aria-label="Match period"
                        disabled={busy}
                        value={match.clock.period}
                        onChange={(e) => {
                          const a = {
                            PRE: "first",
                            "1H": "first",
                            HT: "half",
                            "2H": "second",
                            FT: "full",
                          }[e.target.value] as
                            "first" | "half" | "second" | "full";
                          void act({ type: "clock", action: a });
                        }}
                      >
                        <option value="PRE" disabled>
                          Pre-match
                        </option>
                        <option value="1H">First half (00:00)</option>
                        <option value="HT">Half-time</option>
                        <option value="2H">Second half (45:00)</option>
                        <option value="FT">Full-time</option>
                      </select>
                    </div>
                    <form
                      className="time-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = String(
                          new FormData(e.currentTarget).get("time"),
                        );
                        const parts = v.split(":").map(Number);
                        if (
                          !/^\d{1,3}:\d{2}$/.test(v) ||
                          parts[1] > 59 ||
                          parts[0] > 239
                        ) {
                          setError(
                            "Use minutes:seconds, for example 62:14 (maximum 239:59).",
                          );
                          return;
                        }
                        void act({
                          type: "clock",
                          action: "set",
                          seconds: parts[0] * 60 + parts[1],
                        });
                      }}
                    >
                      <input
                        name="time"
                        placeholder="62:14"
                        aria-label="Correct clock time"
                        maxLength={6}
                      />
                      <button className="text-button" disabled={busy}>
                        Set time
                      </button>
                    </form>
                  </div>
                  <div className="card stats-card">
                    <div className="card-title">
                      <h2>
                        <Activity size={17} />
                        Recorded stats
                      </h2>
                    </div>
                    <div className="stats-teams">
                      <span>{match.home.short}</span>
                      <span>{match.away.short}</span>
                    </div>
                    {(
                      [
                        ["shots", "Shots"],
                        ["onTarget", "On target"],
                        ["corners", "Corners"],
                        ["yellow", "Yellow cards"],
                      ] as const
                    ).map(([key, label]) => (
                      <div className="stat-row" key={key}>
                        <strong>{tally.home[key]}</strong>
                        <span>{label}</span>
                        <strong>{tally.away[key]}</strong>
                      </div>
                    ))}
                    <p className="helper">
                      From your event log. A goal also counts as a shot on
                      target.
                    </p>
                  </div>
                  <div className="trust-note">
                    <ShieldCheck size={18} />
                    <p>
                      <strong>Facts, never fiction.</strong>
                      <br />
                      Commentary uses confirmed events. Player stories come from
                      your own approved notes.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {panel === "squad" && (
            <Squad key={match.id} match={match} busy={busy} onSave={act} />
          )}
          {panel === "studio" && (
            <div className="studio-grid">
              <section className="card settings-card">
                <h2>Commentary settings</h2>
                <p className="subtle">
                  Structured narration, grounded in your match log. No model key
                  needed.
                </p>
                <label>
                  Commentary language
                  <select
                    value={match.settings.language}
                    disabled={busy}
                    onChange={(e) =>
                      act({
                        type: "settings",
                        settings: {
                          ...match.settings,
                          language: e.target.value as Language,
                        },
                      })
                    }
                  >
                    {Object.entries(languages).map(([key, name]) => (
                      <option value={key} key={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Commentary style
                  <select
                    value={match.settings.style}
                    disabled={busy}
                    onChange={(e) =>
                      act({
                        type: "settings",
                        settings: {
                          ...match.settings,
                          style: e.target.value as Style,
                        },
                      })
                    }
                  >
                    <option value="radio">Radio · bring the energy</option>
                    <option value="concise">
                      Concise · straight to the moment
                    </option>
                    <option value="analyst">
                      Analyst · include recorded context
                    </option>
                  </select>
                </label>
                <label>
                  Device voice
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    disabled={!speechSupported}
                  >
                    <option value="">Automatic for selected language</option>
                    {voices.map((v) => (
                      <option value={v.voiceURI} key={v.voiceURI}>
                        {v.name} · {v.lang}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="setting-actions">
                  <button
                    className="outline-button"
                    disabled={!speechSupported}
                    onClick={() =>
                      say(
                        last
                          ? commentary(match, last)
                          : "Welcome to the match.",
                        match.settings.language,
                      )
                    }
                  >
                    <Volume2 size={16} />
                    Test voice
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (speechSupported) speechSynthesis.cancel();
                    }}
                  >
                    Stop audio
                  </button>
                </div>
                <p className="helper">
                  Voices are supplied by your browser/device and may use its
                  network services. Availability varies. Operator notes and
                  player facts stay in their original language. Speech playback
                  is not an audio-file export.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void act({
                      type: "settings",
                      settings: {
                        ...match.settings,
                        sponsor: String(f.get("sponsor")),
                        tagline: String(f.get("tagline")),
                      },
                    });
                  }}
                >
                  <label>
                    Match partner
                    <input
                      name="sponsor"
                      maxLength={100}
                      defaultValue={match.settings.sponsor}
                      placeholder="Your local sponsor"
                    />
                  </label>
                  <label>
                    Club tagline
                    <input
                      name="tagline"
                      maxLength={180}
                      defaultValue={match.settings.tagline}
                    />
                  </label>
                  <button className="dark-button" disabled={busy}>
                    Save broadcast details
                  </button>
                </form>
              </section>
              <div className="right-stack">
                <section className="card settings-card">
                  <h2>
                    <Video size={19} />
                    Local footage workspace
                  </h2>
                  <p className="subtle">
                    Open your own match recording and tag moments as you watch.
                    The file stays on this device.
                  </p>
                  <label className="upload-zone">
                    <Upload size={25} />
                    <strong>{videoName || "Choose a match recording"}</strong>
                    <span>Video stays local · no upload</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setVideoUrl(URL.createObjectURL(f));
                          setVideoName(f.name);
                          clipSeconds.current = 0;
                        }
                      }}
                    />
                  </label>
                  {videoUrl && (
                    <>
                      <video
                        ref={video}
                        src={videoUrl}
                        controls
                        className="local-video"
                        onTimeUpdate={(e) => {
                          clipSeconds.current = e.currentTarget.currentTime;
                        }}
                        onLoadedMetadata={(e) => {
                          e.currentTarget.currentTime =
                            clipSeconds.current ?? 0;
                        }}
                      />
                      <p className="helper">
                        New events retain this video's playhead time for SRT
                        captions. Use the Live desk to tag moments; playback
                        pauses when this panel is hidden.
                      </p>
                    </>
                  )}
                </section>
                <section className="card settings-card">
                  <h2>Broadcast handoff</h2>
                  <p>
                    Open the transparent overlay in a browser window, or add its
                    URL as a 1920 × 1080 OBS Browser Source when your hosting
                    audience permits viewer access.
                  </p>
                  <div className="setting-actions">
                    <button className="outline-button" onClick={copyLink}>
                      <Copy size={16} />
                      Copy overlay link
                    </button>
                    <a
                      className="text-button"
                      href={overlayUrl()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview <ArrowUpRight size={15} />
                    </a>
                  </div>
                  <p className="helper">
                    This deployment is private by default. OBS and external
                    viewers need access through the host. Your match footage is
                    not streamed by Touchline.
                  </p>
                  {binding && (
                    <button
                      className="text-button danger"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          const r = await fetch(
                            `/api/matches/${binding.id}/share`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: "{}",
                            },
                          );
                          const d = await readApi(r);
                          if (!r.ok) throw new Error(d.error);
                          setBinding({ ...binding, readKey: d.readKey });
                          setMessage(
                            "New overlay link created. Old links no longer work.",
                          );
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Unable to rotate link.",
                          );
                        }
                      }}
                    >
                      <RefreshCw size={14} />
                      Revoke old overlay link
                    </button>
                  )}
                </section>
              </div>
            </div>
          )}
          {panel === "report" && (
            <>
              <div className="report-score">
                <span className="eyebrow">
                  {match.clock.period === "FT"
                    ? "FULL-TIME REPORT"
                    : "MATCH IN PROGRESS"}
                </span>
                <h2>
                  {match.home.name}{" "}
                  <strong>
                    {tally.home.goals} — {tally.away.goals}
                  </strong>{" "}
                  {match.away.name}
                </h2>
                <p>
                  {match.competition} · {match.venue}
                </p>
                <p className="subtle">{match.settings.tagline}</p>
              </div>
              <div className="export-grid">
                {[
                  {
                    kind: "md" as const,
                    title: "Match report",
                    desc: "Readable commentary and final score",
                    icon: FileText,
                  },
                  {
                    kind: "csv" as const,
                    title: "Event data",
                    desc: "A clean CSV for your club's records",
                    icon: Activity,
                  },
                  {
                    kind: "srt" as const,
                    title: "Video captions",
                    desc: "Timed subtitles for your editing timeline",
                    icon: Monitor,
                  },
                  {
                    kind: "json" as const,
                    title: "Project backup",
                    desc: "Reopen the complete match in Touchline",
                    icon: Save,
                  },
                ].map(({ kind, title, desc, icon: Icon }) => (
                  <button
                    className="card export-card"
                    key={kind}
                    onClick={() => exportFile(kind)}
                  >
                    <Icon size={23} />
                    <h3>{title}</h3>
                    <p>{desc}</p>
                    <span>
                      Download {kind.toUpperCase()}{" "}
                      <ArrowDownToLine size={15} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="card report-bottom">
                <div>
                  <h2>A result worth sharing.</h2>
                  <p>
                    Download a 1600 × 900 scorecard with your teams and match
                    partner.
                  </p>
                </div>
                <button className="dark-button" onClick={scorecard}>
                  <Download size={16} />
                  Download scorecard
                </button>
              </div>
              <p className="helper">
                SRT uses source-video time when attached to an event, otherwise
                match-clock time. These are commentary captions, not a
                transcription of recorded audio. Review timing before
                publishing.
              </p>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              touchline<span className="brand-dot">.</span>{" "}
              <span>Every match has a story.</span>
            </span>
            <button className="text-button" onClick={() => setModal("help")}>
              How it works <ArrowUpRight size={14} />
            </button>
          </footer>
        </main>
      </div>
      <input
        ref={upload}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importProject(f);
          e.currentTarget.value = "";
        }}
      />
      {eventModal && (
        <Modal
          title={`Confirm ${eventLabels[eventModal].toLowerCase()}`}
          close={() => setEventModal(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                id = crypto.randomUUID();
              const success = await act({
                type: "event",
                event: {
                  id,
                  kind: eventModal,
                  side,
                  playerId: String(f.get("player") ?? "") || null,
                  secondaryId: String(f.get("secondary") ?? "") || null,
                  note: String(f.get("note") ?? ""),
                  sourceSeconds: videoUrl ? clipSeconds.current : null,
                },
              });
              if (success) setEventModal(null);
            }}
          >
            <p className="subtle">
              {match[side].name} · Events use the current match clock.
            </p>
            <label>
              {eventModal === "substitution" ? "Player coming off" : "Player"}
              <select name="player" defaultValue={player}>
                <option value="">Team event / player unknown</option>
                {match[side].players.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number} · {p.name}
                  </option>
                ))}
              </select>
            </label>
            {eventModal === "substitution" && (
              <label>
                Player coming on
                <select name="secondary" required defaultValue="">
                  <option value="" disabled>
                    Select replacement
                  </option>
                  {match[side].players.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} · {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              {eventModal === "note"
                ? "Commentary note"
                : "Approved detail (optional)"}
              <textarea
                name="note"
                maxLength={350}
                required={eventModal === "note"}
                placeholder="Only include details you have confirmed."
                rows={3}
              />
            </label>
            <p className="helper">
              {eventModal === "goal"
                ? "A goal also counts as one shot on target. For an own goal, use the control below."
                : "Recorded statistics come only from your confirmed events."}
            </p>
            {eventModal === "goal" && (
              <button
                type="button"
                className="text-button"
                onClick={() => setEventModal("own_goal")}
              >
                Record an own goal instead
              </button>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setEventModal(null)}
              >
                Cancel
              </button>
              <button className="dark-button" disabled={busy}>
                <Check size={16} />
                Confirm moment
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "new" && (
        <Modal
          title="Your next match starts here."
          close={() => setModal(null)}
        >
          <p className="subtle">
            Start a fresh match, reopen a project, or explore the demo. Your
            current browser draft will be replaced. Export it first if you want
            to keep it.
          </p>
          <button
            className="new-option"
            onClick={() => {
              setMatch(newMatch(false));
              setBinding(null);
              setModal(null);
              setPanel("squad");
              setPlayer("");
            }}
          >
            <Plus />
            <div>
              <strong>Set up a new match</strong>
              <span>Your teams. Your story.</span>
            </div>
            <ArrowUpRight size={18} />
          </button>
          <button
            className="new-option"
            onClick={() => {
              upload.current?.click();
              setModal(null);
            }}
          >
            <Upload />
            <div>
              <strong>Import project backup</strong>
              <span>Continue from a Touchline JSON file.</span>
            </div>
            <ArrowUpRight size={18} />
          </button>
          <button
            className="new-option"
            onClick={() => {
              setMatch(newMatch(true));
              setBinding(null);
              setModal(null);
              setPanel("desk");
              setPlayer("");
            }}
          >
            <Radio />
            <div>
              <strong>Load the sample match</strong>
              <span>Fictional teams, real working controls.</span>
            </div>
            <ArrowUpRight size={18} />
          </button>
        </Modal>
      )}
      {modal === "saved" && (
        <Modal title="Saved matches" close={() => setModal(null)}>
          {savedLoading ? (
            <p>Loading your matches…</p>
          ) : saved.length ? (
            saved.map((s) => (
              <div className="saved-row" key={s.id}>
                <button
                  className="saved-open"
                  disabled={busy}
                  onClick={() => loadSaved(s.id)}
                >
                  <strong>{s.title}</strong>
                  <small>{new Date(s.updatedAt).toLocaleDateString()}</small>
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${s.title}`}
                  onClick={async () => {
                    if (
                      !confirm(
                        `Delete “${s.title}” and revoke its overlay? Export a backup first if needed.`,
                      )
                    )
                      return;
                    try {
                      const r = await fetch(`/api/matches/${s.id}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: "{}",
                      });
                      if (!r.ok) throw new Error("Unable to delete match.");
                      setSaved(saved.filter((x) => x.id !== s.id));
                      if (binding?.id === s.id) setBinding(null);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FolderOpen />
              <h3>Your match library starts here.</h3>
              <p>Save the current match to open it on another device.</p>
            </div>
          )}
          {!binding && user && (
            <button
              className="dark-button"
              disabled={busy}
              onClick={async () => {
                await saveCloud();
                setModal(null);
              }}
            >
              <Save size={16} />
              Save current match
            </button>
          )}
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Your matchday, in four steps."
          close={() => setModal(null)}
        >
          <ol className="guide">
            <li>
              <strong>Prepare your teams.</strong>
              <p>
                Use Teams & players to set names, shirt numbers and verified
                player facts. The sample match uses fictional data.
              </p>
            </li>
            <li>
              <strong>Run the clock. Confirm moments.</strong>
              <p>
                Choose a team and player, then add goals, attempts and cards.
                Correct any event to recalculate the score. Shortcuts: G, S, T,
                C, Y, R, U; Space for the clock; Z to undo.
              </p>
            </li>
            <li>
              <strong>Choose your sound and output.</strong>
              <p>
                Studio lets you change language, device voice and sponsor.
                Narration uses structured event templates. It does not watch or
                recognize players automatically. Do not use a shot button again
                for an already recorded goal.
              </p>
            </li>
            <li>
              <strong>Save or take it with you.</strong>
              <p>
                Browser drafts stay on this browser. Sign in and save to sync.
                Export a JSON backup, captions, CSV, report or scorecard.
                Footage stays local; voice playback is not an exported audio
                track.
              </p>
            </li>
          </ol>
          <p className="helper">
            Use footage and player facts you have permission to publish. Live
            overlay viewer access follows the site's hosting audience.
          </p>
          <button className="dark-button" onClick={() => setModal(null)}>
            Let's call the match <ArrowUpRight size={16} />
          </button>
        </Modal>
      )}
      <div className="floating-save">
        {user && !binding && (
          <button className="dark-button" onClick={saveCloud} disabled={busy}>
            <Save size={16} />
            Save match to cloud
          </button>
        )}
      </div>
    </div>
  );
}
function ClockDisplay({ match }: { match: Match }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="clock-digits">
      {formatClock(now ? clockSeconds(match, now) : match.clock.seconds)}
      <span>{match.clock.startedAt ? "RUNNING" : "PAUSED"}</span>
    </div>
  );
}
function Squad({
  match,
  busy,
  onSave,
}: {
  match: Match;
  busy: boolean;
  onSave: (command: Command) => Promise<boolean | undefined>;
}) {
  const [draft, setDraft] = useState(() => structuredClone(match)),
    [notice, setNotice] = useState("");
  function team(s: Side, key: string, value: string) {
    setDraft({ ...draft, [s]: { ...draft[s], [key]: value } });
  }
  return (
    <form
      className="squad-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setNotice("");
        const success = await onSave({
          type: "details",
          title: draft.title,
          competition: draft.competition,
          venue: draft.venue,
          home: draft.home,
          away: draft.away,
        });
        if (success) setNotice("Teams and match details saved.");
      }}
    >
      <section className="card settings-card">
        <h2>Match details</h2>
        <div className="form-columns">
          <label>
            Match name
            <input
              required
              value={draft.title}
              maxLength={100}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Competition
            <input
              value={draft.competition}
              maxLength={100}
              onChange={(e) =>
                setDraft({ ...draft, competition: e.target.value })
              }
            />
          </label>
          <label>
            Venue
            <input
              value={draft.venue}
              maxLength={120}
              onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
            />
          </label>
        </div>
      </section>
      <div className="squad-grid">
        {(["home", "away"] as Side[]).map((s) => (
          <section key={s} className="card settings-card">
            <div className="card-title">
              <h2>
                <span
                  className="team-dot"
                  style={{ background: draft[s].color }}
                />
                {s === "home" ? "Home team" : "Away team"}
              </h2>
              <span className="badge">{draft[s].players.length} players</span>
            </div>
            <label>
              Club name
              <input
                required
                maxLength={100}
                value={draft[s].name}
                onChange={(e) => team(s, "name", e.target.value)}
              />
            </label>
            <div className="form-columns">
              <label>
                Short name
                <input
                  required
                  maxLength={5}
                  value={draft[s].short}
                  onChange={(e) =>
                    team(s, "short", e.target.value.toUpperCase())
                  }
                />
              </label>
              <label>
                Team colour
                <input
                  type="color"
                  value={draft[s].color}
                  onChange={(e) => team(s, "color", e.target.value)}
                />
              </label>
            </div>
            <div className="roster">
              {draft[s].players.map((p, i) => (
                <div className="roster-row" key={p.id}>
                  <div className="roster-identity">
                    <input
                      type="number"
                      aria-label={`Shirt number for ${p.name}`}
                      min={1}
                      max={99}
                      required
                      value={p.number}
                      onChange={(e) => {
                        const ps = [...draft[s].players];
                        ps[i] = { ...p, number: Number(e.target.value) };
                        setDraft({
                          ...draft,
                          [s]: { ...draft[s], players: ps },
                        });
                      }}
                    />
                    <input
                      aria-label="Player name"
                      required
                      maxLength={100}
                      value={p.name}
                      onChange={(e) => {
                        const ps = [...draft[s].players];
                        ps[i] = { ...p, name: e.target.value };
                        setDraft({
                          ...draft,
                          [s]: { ...draft[s], players: ps },
                        });
                      }}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${p.name}`}
                      title="Players referenced by events must remain in the roster."
                      disabled={match.events.some(
                        (e) =>
                          e.side === s &&
                          (e.playerId === p.id || e.secondaryId === p.id),
                      )}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          [s]: {
                            ...draft[s],
                            players: draft[s].players.filter(
                              (x) => x.id !== p.id,
                            ),
                          },
                        })
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <input
                    className="player-fact"
                    aria-label={`Approved fact for ${p.name}`}
                    maxLength={240}
                    placeholder="Approved player fact (optional)"
                    value={p.fact}
                    onChange={(e) => {
                      const ps = [...draft[s].players];
                      ps[i] = { ...p, fact: e.target.value };
                      setDraft({ ...draft, [s]: { ...draft[s], players: ps } });
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="outline-button"
              disabled={draft[s].players.length >= 30}
              onClick={() => {
                const used = new Set(draft[s].players.map((p) => p.number));
                const number = Array.from({ length: 99 }, (_, i) => i + 1).find(
                  (n) => !used.has(n),
                )!;
                setDraft({
                  ...draft,
                  [s]: {
                    ...draft[s],
                    players: [
                      ...draft[s].players,
                      {
                        id: crypto.randomUUID(),
                        number,
                        name: "New player",
                        fact: "",
                      },
                    ],
                  },
                });
              }}
            >
              <Plus size={16} />
              Add player
            </button>
          </section>
        ))}
      </div>
      <div className="squad-save">
        <p className="helper">
          Facts appear verbatim on the overlay. Verify names and obtain
          permission before publishing.
        </p>
        {notice && (
          <span className="success-text" role="status">
            {notice}
          </span>
        )}
        <button className="dark-button" disabled={busy}>
          <Check size={16} />
          Save teams & details
        </button>
      </div>
    </form>
  );
}
