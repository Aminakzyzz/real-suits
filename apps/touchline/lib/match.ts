import { z } from "zod";

export const eventKinds = [
  "goal",
  "own_goal",
  "shot",
  "on_target",
  "save",
  "corner",
  "yellow",
  "red",
  "substitution",
  "note",
] as const;
export type EventKind = (typeof eventKinds)[number];
export type Side = "home" | "away";
export type Language = "en" | "es" | "fr";
export type Style = "radio" | "concise" | "analyst";
const label = z.string().trim().min(1).max(100);
const playerSchema = z.object({
  id: z.string().min(1).max(80),
  number: z.number().int().min(1).max(99),
  name: label,
  fact: z.string().max(240).default(""),
});
const teamSchema = z.object({
  name: label,
  short: z.string().trim().min(1).max(5),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  players: z.array(playerSchema).max(30),
});
export const matchSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(80),
    title: label,
    competition: z.string().max(100),
    venue: z.string().max(120),
    demo: z.boolean(),
    home: teamSchema,
    away: teamSchema,
    clock: z.object({
      period: z.enum(["PRE", "1H", "HT", "2H", "FT"]),
      seconds: z.number().int().min(0).max(14400),
      startedAt: z.number().finite().nonnegative().nullable(),
    }),
    settings: z.object({
      language: z.enum(["en", "es", "fr"]),
      style: z.enum(["radio", "concise", "analyst"]),
      sponsor: z.string().max(100),
      tagline: z.string().max(180),
    }),
    events: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          kind: z.enum(eventKinds),
          side: z.enum(["home", "away"]),
          playerId: z.string().max(80).nullable(),
          secondaryId: z.string().max(80).nullable(),
          seconds: z.number().int().min(0).max(14400),
          sourceSeconds: z.number().finite().min(0).max(86400).nullable(),
          note: z.string().max(350),
          createdAt: z.number().finite().nonnegative(),
        }),
      )
      .max(1000),
  })
  .superRefine((m, ctx) => {
    for (const side of ["home", "away"] as const) {
      const ids = new Set<string>(),
        numbers = new Set<number>();
      for (const p of m[side].players) {
        if (ids.has(p.id) || numbers.has(p.number))
          ctx.addIssue({
            code: "custom",
            message: "Each team needs unique player IDs and shirt numbers.",
          });
        ids.add(p.id);
        numbers.add(p.number);
      }
    }
    const ids = new Set<string>();
    for (const e of m.events) {
      if (ids.has(e.id))
        ctx.addIssue({ code: "custom", message: "Event IDs must be unique." });
      ids.add(e.id);
      for (const id of [e.playerId, e.secondaryId])
        if (id && !m[e.side].players.some((p) => p.id === id))
          ctx.addIssue({
            code: "custom",
            message: "An event references a player outside its team.",
          });
      if (
        e.kind === "substitution" &&
        (!e.playerId || !e.secondaryId || e.playerId === e.secondaryId)
      )
        ctx.addIssue({
          code: "custom",
          message: "A substitution needs two different players.",
        });
      if (e.kind === "note" && !e.note.trim())
        ctx.addIssue({ code: "custom", message: "A note cannot be empty." });
    }
  });
export type Match = z.infer<typeof matchSchema>;
export type MatchEvent = Match["events"][number];
export type Player = Match["home"]["players"][number];
export const eventLabels: Record<EventKind, string> = {
  goal: "Goal",
  own_goal: "Own goal",
  shot: "Shot off target",
  on_target: "Shot on target",
  save: "Save",
  corner: "Corner",
  yellow: "Yellow card",
  red: "Red card",
  substitution: "Substitution",
  note: "Match note",
};
export function clockSeconds(m: Match, now = Date.now()) {
  return Math.min(
    14400,
    Math.max(
      0,
      Math.floor(
        m.clock.seconds +
          (m.clock.startedAt === null
            ? 0
            : Math.max(0, now - m.clock.startedAt) / 1000),
      ),
    ),
  );
}
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
export function stats(m: Match, events = m.events) {
  const r = {
    home: {
      goals: 0,
      shots: 0,
      onTarget: 0,
      corners: 0,
      yellow: 0,
      red: 0,
      saves: 0,
    },
    away: {
      goals: 0,
      shots: 0,
      onTarget: 0,
      corners: 0,
      yellow: 0,
      red: 0,
      saves: 0,
    },
  };
  for (const e of events) {
    const t = r[e.side];
    if (e.kind === "goal") {
      t.goals++;
      t.shots++;
      t.onTarget++;
    }
    if (e.kind === "own_goal") r[e.side === "home" ? "away" : "home"].goals++;
    if (e.kind === "shot") t.shots++;
    if (e.kind === "on_target") {
      t.shots++;
      t.onTarget++;
    }
    if (e.kind === "corner") t.corners++;
    if (e.kind === "yellow") t.yellow++;
    if (e.kind === "red") t.red++;
    if (e.kind === "save") t.saves++;
  }
  return r;
}

export function commentary(
  m: Match,
  e: MatchEvent,
  language: Language = m.settings.language,
  style: Style = m.settings.style,
) {
  const team = m[e.side],
    p = team.players.find((p) => p.id === e.playerId),
    other = team.players.find((p) => p.id === e.secondaryId),
    player = p?.name ?? team.name;
  const i = m.events.findIndex((v) => v.id === e.id),
    t = stats(m, i < 0 ? [...m.events, e] : m.events.slice(0, i + 1));
  const score = `${m.home.short} ${t.home.goals}–${t.away.goals} ${m.away.short}`;
  const copy: Record<Language, Record<EventKind, string>> = {
    en: {
      goal: `${style === "radio" ? "GOAL! " : ""}${player} scores for ${team.name}. ${score}.`,
      own_goal: `Own goal by ${player}. ${score}.`,
      shot: `${player} tries a shot for ${team.name}, but it misses the target.`,
      on_target: `${player} puts an effort on target for ${team.name}.`,
      save: `${player} makes a save for ${team.name}.`,
      corner: `A corner for ${team.name}. An opportunity from the set piece.`,
      yellow: `A yellow card for ${player} of ${team.name}.`,
      red: `A red card for ${player} of ${team.name}.`,
      substitution: `A change for ${team.name}: ${player} comes off, ${other?.name ?? "a substitute"} comes on.`,
      note: e.note,
    },
    es: {
      goal: `${style === "radio" ? "¡GOL! " : ""}${player} marca para ${team.name}. ${score}.`,
      own_goal: `Gol en propia puerta de ${player}. ${score}.`,
      shot: `${player} remata para ${team.name}, pero el balón sale fuera.`,
      on_target: `${player} remata a puerta para ${team.name}.`,
      save: `${player} realiza una parada para ${team.name}.`,
      corner: `Córner para ${team.name}. Oportunidad a balón parado.`,
      yellow: `Tarjeta amarilla para ${player}, de ${team.name}.`,
      red: `Tarjeta roja para ${player}, de ${team.name}.`,
      substitution: `Cambio en ${team.name}: sale ${player} y entra ${other?.name ?? "un suplente"}.`,
      note: e.note,
    },
    fr: {
      goal: `${style === "radio" ? "BUT ! " : ""}${player} marque pour ${team.name}. ${score}.`,
      own_goal: `But contre son camp de ${player}. ${score}.`,
      shot: `${player} tente sa chance pour ${team.name}, mais le tir n'est pas cadré.`,
      on_target: `${player} cadre son tir pour ${team.name}.`,
      save: `${player} réalise un arrêt pour ${team.name}.`,
      corner: `Corner pour ${team.name}. Une occasion sur coup de pied arrêté.`,
      yellow: `Carton jaune pour ${player}, de ${team.name}.`,
      red: `Carton rouge pour ${player}, de ${team.name}.`,
      substitution: `Changement pour ${team.name} : ${player} sort et ${other?.name ?? "un remplaçant"} entre.`,
      note: e.note,
    },
  };
  let line = copy[language][e.kind];
  if (style === "analyst" && e.kind === "goal") {
    const total = t[e.side].goals;
    line +=
      language === "es"
        ? ` El equipo lleva ${total} goles en este partido.`
        : language === "fr"
          ? ` L'équipe totalise ${total} buts dans ce match.`
          : ` The team has now scored ${total} ${total === 1 ? "goal" : "goals"} in this match.`;
  }
  if (e.note && e.kind !== "note") line += ` ${e.note}`;
  return line;
}

export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("event"),
    event: z.object({
      id: z.string().min(1).max(80),
      kind: z.enum(eventKinds),
      side: z.enum(["home", "away"]),
      playerId: z.string().max(80).nullable(),
      secondaryId: z.string().max(80).nullable(),
      note: z.string().max(350),
      sourceSeconds: z.number().finite().min(0).max(86400).nullable(),
    }),
  }),
  z.object({ type: z.literal("remove"), eventId: z.string().min(1).max(80) }),
  z.object({
    type: z.literal("clock"),
    action: z.enum(["toggle", "first", "half", "second", "full", "set"]),
    seconds: z.number().int().min(0).max(14400).optional(),
  }),
  z.object({
    type: z.literal("settings"),
    settings: z.object({
      language: z.enum(["en", "es", "fr"]),
      style: z.enum(["radio", "concise", "analyst"]),
      sponsor: z.string().max(100),
      tagline: z.string().max(180),
    }),
  }),
  z.object({
    type: z.literal("details"),
    title: label,
    competition: z.string().max(100),
    venue: z.string().max(120),
    home: teamSchema,
    away: teamSchema,
  }),
]);
export type Command = z.infer<typeof commandSchema>;
export function applyCommand(
  original: Match,
  command: Command,
  now = Date.now(),
): Match {
  const m = structuredClone(original);
  if (command.type === "event") {
    if (m.events.some((e) => e.id === command.event.id)) return m;
    if (m.clock.period === "FT")
      throw new Error(
        "The match has ended. Reopen a period before adding events.",
      );
    m.events.push({
      ...command.event,
      seconds: clockSeconds(m, now),
      createdAt: now,
    });
  } else if (command.type === "remove") {
    if (!m.events.some((e) => e.id === command.eventId))
      throw new Error("This event no longer exists.");
    m.events = m.events.filter((e) => e.id !== command.eventId);
  } else if (command.type === "settings") m.settings = command.settings;
  else if (command.type === "details") {
    m.title = command.title;
    m.competition = command.competition;
    m.venue = command.venue;
    m.home = command.home;
    m.away = command.away;
  } else {
    const seconds = clockSeconds(m, now);
    switch (command.action) {
      case "toggle":
        if (["HT", "FT"].includes(m.clock.period))
          throw new Error("Choose a playing period before starting the clock.");
        m.clock = {
          period: m.clock.period === "PRE" ? "1H" : m.clock.period,
          seconds,
          startedAt: m.clock.startedAt === null ? now : null,
        };
        break;
      case "first":
        m.clock = { period: "1H", seconds: 0, startedAt: null };
        break;
      case "half":
        m.clock = { period: "HT", seconds, startedAt: null };
        break;
      case "second":
        m.clock = { period: "2H", seconds: 2700, startedAt: null };
        break;
      case "full":
        m.clock = { period: "FT", seconds, startedAt: null };
        break;
      case "set":
        if (command.seconds === undefined)
          throw new Error("Enter a match time.");
        m.clock = {
          ...m.clock,
          seconds: command.seconds,
          startedAt: m.clock.startedAt === null ? null : now,
        };
        break;
    }
  }
  return matchSchema.parse(m);
}

export function newMatch(demo = false): Match {
  const players = (side: string, names: string[]) =>
    names.map((name, i) => ({
      id: `${side}-${i + 1}`,
      number: [1, 4, 6, 8, 9, 10, 11, 14][i],
      name,
      fact:
        i === 4
          ? "Club academy graduate. Fact supplied by the match producer."
          : "",
    }));
  const m: Match = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: demo ? "Northbridge vs Eastford" : "Untitled match",
    competition: demo ? "Community Cup · Semi-final" : "Friendly",
    venue: demo ? "Riverside Ground" : "",
    demo,
    home: {
      name: demo ? "Northbridge FC" : "Home team",
      short: demo ? "NFC" : "HOME",
      color: "#ddf47c",
      players: demo
        ? players("h", [
            "Oliver Reed",
            "Leo Bennett",
            "Adam Cole",
            "Noah Ellis",
            "Jamie Miller",
            "Ethan Brooks",
            "Ryan Hayes",
            "Lucas Gray",
          ])
        : [],
    },
    away: {
      name: demo ? "Eastford Athletic" : "Away team",
      short: demo ? "EAS" : "AWAY",
      color: "#a9bce8",
      players: demo
        ? players("a", [
            "Theo Ward",
            "Finn Lewis",
            "Oscar Hart",
            "Hugo Clark",
            "Daniel James",
            "Max Stone",
            "Ben Taylor",
            "Sam Wilson",
          ])
        : [],
    },
    clock: {
      period: demo ? "2H" : "PRE",
      seconds: demo ? 3734 : 0,
      startedAt: null,
    },
    settings: {
      language: "en",
      style: "radio",
      sponsor: "",
      tagline: "Every match has a story.",
    },
    events: [],
  };
  if (demo) {
    const base = Date.now() - 3600000;
    const items: Array<[EventKind, Side, number, string | null]> = [
      ["goal", "home", 1080, "h-5"],
      ["on_target", "away", 1470, "a-6"],
      ["corner", "home", 1930, null],
      ["goal", "away", 2340, "a-5"],
      ["yellow", "away", 3010, "a-3"],
      ["goal", "home", 3480, "h-6"],
    ];
    m.events = items.map(([kind, side, seconds, playerId], i) => ({
      id: `demo-${i}`,
      kind,
      side,
      seconds,
      playerId,
      secondaryId: null,
      sourceSeconds: null,
      note: "",
      createdAt: base + i * 60000,
    }));
  }
  return m;
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"', '""')}"`;
}
export function exportCsv(m: Match) {
  return [
    ["Time", "Team", "Event", "Player", "Commentary"],
    ...m.events.map((e) => [
      formatClock(e.seconds),
      m[e.side].name,
      eventLabels[e.kind],
      m[e.side].players.find((p) => p.id === e.playerId)?.name ?? "",
      commentary(m, e),
    ]),
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");
}
function srtTime(s: number) {
  const ms = Math.max(0, Math.round(s * 1000));
  return (
    [
      Math.floor(ms / 3600000),
      Math.floor(ms / 60000) % 60,
      Math.floor(ms / 1000) % 60,
    ]
      .map((n) => String(n).padStart(2, "0"))
      .join(":") + `,${String(ms % 1000).padStart(3, "0")}`
  );
}
export function exportSrt(m: Match) {
  const list = m.events
    .map((e, i) => ({
      e,
      i,
      start: Math.round((e.sourceSeconds ?? e.seconds) * 1000) / 1000,
    }))
    .sort((a, b) => a.start - b.start || a.i - b.i);
  // A paused clock can give several events the same timestamp. Keep them in
  // one caption rather than creating overlapping or zero-length subtitles.
  const groups: Array<{ start: number; events: MatchEvent[] }> = [];
  for (const item of list) {
    const last = groups.at(-1);
    if (last?.start === item.start) last.events.push(item.e);
    else groups.push({ start: item.start, events: [item.e] });
  }
  return groups
    .map((item, i) => {
      const next = groups[i + 1]?.start;
      const end = Math.min(item.start + 5, next ?? Infinity);
      return `${i + 1}\n${srtTime(item.start)} --> ${srtTime(end)}\n${item.events.map((e) => commentary(m, e).replace(/\r?\n/g, " ")).join("\n")}\n`;
    })
    .join("\n");
}
export function exportReport(m: Match) {
  const t = stats(m);
  return `# ${m.title}\n\n${m.home.name} ${t.home.goals}–${t.away.goals} ${m.away.name}\n${m.competition} · ${m.venue}\nStatus: ${m.clock.period}\n\n## Match log\n\n${m.events.map((e) => `${formatClock(e.seconds)} — ${commentary(m, e)}`).join("\n\n")}\n\nRecorded events only. A goal includes a shot on target; do not log the same attempt twice.\n`;
}
