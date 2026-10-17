import test from "node:test";
import assert from "node:assert/strict";
import { rosterSchema } from "../lib/roster.ts";

const fixture = () => ({
  home: {
    name: "Home",
    color: "#0000ff",
    players: [
      { id: "home-27", name: "Demo", number: 27, fact: "Unused future fact" },
    ],
  },
  away: {
    name: "Away",
    color: "#ff0000",
    players: [{ id: "away-27", name: "Other", number: 27 }],
  },
  events: [{ kind: "goal", seconds: 90 }],
  score: [5, 1],
});

test("producer backup import extracts roster fields without events, scores or facts", () => {
  const parsed = rosterSchema.parse(fixture());
  assert.equal(parsed.home.players[0].name, "Demo");
  assert.equal("events" in parsed, false);
  assert.equal("score" in parsed, false);
  assert.equal("fact" in parsed.home.players[0], false);
});

test("roster rejects ambiguous kits, duplicate identities and duplicate team shirt numbers", () => {
  const sameKit = fixture();
  sameKit.away.color = sameKit.home.color;
  assert.equal(rosterSchema.safeParse(sameKit).success, false);
  const sameId = fixture();
  sameId.away.players[0].id = "home-27";
  assert.equal(rosterSchema.safeParse(sameId).success, false);
  const sameNumber = fixture();
  sameNumber.home.players.push({
    id: "other",
    name: "Another",
    number: 27,
    fact: "",
  });
  assert.equal(rosterSchema.safeParse(sameNumber).success, false);
});
