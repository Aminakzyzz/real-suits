import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommand,
  clockSeconds,
  commentary,
  csvCell,
  exportSrt,
  matchSchema,
  newMatch,
  stats,
  type Command,
} from "../lib/match.ts";
const goal = (id = "goal-1", side: "home" | "away" = "home"): Command => ({
  type: "event",
  event: {
    id,
    kind: "goal",
    side,
    playerId: null,
    secondaryId: null,
    note: "",
    sourceSeconds: null,
  },
});

test("correcting an earlier event recalculates the scoreboard without rewriting later history", () => {
  let m = newMatch();
  m = applyCommand(m, goal("h1"));
  m = applyCommand(m, goal("a1", "away"));
  m = applyCommand(m, goal("h2"));
  assert.deepEqual([stats(m).home.goals, stats(m).away.goals], [2, 1]);
  m = applyCommand(m, { type: "remove", eventId: "h1" });
  assert.deepEqual([stats(m).home.goals, stats(m).away.goals], [1, 1]);
  assert.deepEqual(
    m.events.map((e) => e.id),
    ["a1", "h2"],
  );
});
test("event retry is idempotent and does not mutate the original", () => {
  const base = newMatch();
  const m = applyCommand(base, goal());
  assert.equal(base.events.length, 0);
  assert.equal(applyCommand(m, goal()).events.length, 1);
});
test("an own goal is awarded to the opposition without inventing a shot", () => {
  const m = applyCommand(newMatch(), {
    type: "event",
    event: {
      ...(goal() as Extract<Command, { type: "event" }>).event,
      kind: "own_goal",
    },
  });
  assert.equal(stats(m).away.goals, 1);
  assert.equal(stats(m).home.shots, 0);
});
test("narration uses the score at the time of each event, not the latest score", () => {
  let m = applyCommand(newMatch(), goal("h1"));
  m = applyCommand(m, goal("h2"));
  assert.match(commentary(m, m.events[0]), /HOME 1–0 AWAY/);
  assert.doesNotMatch(commentary(m, m.events[0]), /2–0/);
});
test("all three narration languages preserve known names and do not introduce player statistics", () => {
  const m = newMatch(true);
  const e = m.events[0];
  assert.match(commentary(m, e, "en"), /Jamie Miller scores/);
  assert.match(commentary(m, e, "es"), /Jamie Miller marca/);
  assert.match(commentary(m, e, "fr"), /Jamie Miller marque/);
  assert.doesNotMatch(commentary(m, e), /season|career|record|possession/);
});
test("clock start, pause and resumed time are deterministic", () => {
  let m = newMatch();
  m = applyCommand(m, { type: "clock", action: "toggle" }, 10000);
  assert.equal(clockSeconds(m, 14000), 4);
  m = applyCommand(m, { type: "clock", action: "toggle" }, 14500);
  assert.equal(clockSeconds(m, 99999), 4);
  m = applyCommand(m, { type: "clock", action: "toggle" }, 20000);
  assert.equal(clockSeconds(m, 23000), 7);
  m = applyCommand(m, { type: "clock", action: "second" }, 23000);
  assert.equal(clockSeconds(m, 24000), 2700);
});
test("ended matches reject new events, and half-time cannot run as a playing period", () => {
  let m = applyCommand(newMatch(), { type: "clock", action: "full" });
  assert.throws(() => applyCommand(m, goal()), /match has ended/);
  m = applyCommand(m, { type: "clock", action: "half" });
  assert.throws(
    () => applyCommand(m, { type: "clock", action: "toggle" }),
    /playing period/,
  );
});
test("imports reject duplicate numbers and events with players outside their team", () => {
  const m = newMatch(true);
  m.home.players[1].number = m.home.players[0].number;
  assert.equal(matchSchema.safeParse(m).success, false);
  const valid = newMatch(true);
  valid.events[0].playerId = "a-1";
  assert.equal(matchSchema.safeParse(valid).success, false);
});
test("substitutions require two distinct players from the same team", () => {
  const m = newMatch(true);
  const cmd: Command = {
    type: "event",
    event: {
      ...(goal() as Extract<Command, { type: "event" }>).event,
      kind: "substitution",
      playerId: "h-1",
      secondaryId: "h-1",
    },
  };
  assert.throws(() => applyCommand(m, cmd));
  cmd.event.secondaryId = "h-2";
  assert.match(
    commentary(applyCommand(m, cmd), applyCommand(m, cmd).events.at(-1)!),
    /Oliver Reed comes off, Leo Bennett comes on/,
  );
});
test("CSV escapes quotes and guards spreadsheet formula prefixes including whitespace", () => {
  assert.equal(csvCell("=SUM(1,2)"), '"\'=SUM(1,2)"');
  assert.equal(csvCell(" \t@value"), '"\' \t@value"');
  assert.equal(csvCell('Sam "Ace"'), '"Sam ""Ace"""');
});
test("SRT follows source media time when available and has valid hour/minute padding", () => {
  const m = newMatch(true);
  m.events = [{ ...m.events[0], sourceSeconds: 65.125 }];
  assert.match(exportSrt(m), /00:01:05,125 --> 00:01:10,125/);
  m.events[0].sourceSeconds = 3601;
  assert.match(exportSrt(m), /01:00:01,000/);
});
test("empty notes and unsupported backup versions are rejected", () => {
  assert.throws(() =>
    applyCommand(newMatch(), {
      type: "event",
      event: {
        ...(goal() as Extract<Command, { type: "event" }>).event,
        kind: "note",
      },
    }),
  );
  assert.equal(
    matchSchema.safeParse({ ...newMatch(), schemaVersion: 2 }).success,
    false,
  );
});

test("events sharing a paused clock timestamp produce one caption, not overlaps", () => {
  let m = applyCommand(newMatch(), goal("one"));
  m = applyCommand(m, goal("two"));
  const output = exportSrt(m);
  assert.equal((output.match(/ --> /g) ?? []).length, 1);
  assert.match(output, /HOME 1–0 AWAY/);
  assert.match(output, /HOME 2–0 AWAY/);
});
