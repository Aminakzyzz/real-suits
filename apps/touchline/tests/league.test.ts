import test from "node:test";
import assert from "node:assert/strict";
import { discoverSeason, normalizeFixture, normalizeStanding } from "../lib/league.ts";

test("season follows official configuration and rejects missing discovery", () => {
  assert.deepEqual(discoverSeason("ACTIVE_PL_SEASON_ID='2026'; ACTIVE_PL_MATCHWEEK_ID = '7'"), { seasonId: 2026, matchweek: 7 });
  assert.deepEqual(discoverSeason('<a href="/en/matchweek/2027_1/blog">'), { seasonId: 2027, matchweek: 1 });
  assert.throws(() => discoverSeason("An unavailable homepage"));
});

test("fixtures preserve scheduled unknown scores and convert supplied timezone", () => {
  const fixture = normalizeFixture({ matchId: "123", homeTeam: { id: "3", name: "Arsenal" }, awayTeam: { id: "14", name: "Liverpool" }, period: "PreMatch", kickoff: "2026-10-17 15:00:00", kickoffTimezone: "BST" });
  assert.equal(fixture.kickoff, "2026-10-17T14:00:00.000Z");
  assert.equal(fixture.homeScore, null);
  assert.equal(fixture.awayScore, null);
  assert.equal(fixture.status, "PreMatch");
  assert.equal(fixture.homeBadge, "https://resources.premierleague.com/premierleague25/badges/3.svg");
});

test("standings stay sourced rather than inferred from an incomplete matchweek", () => {
  const row = normalizeStanding({ team: { id: "43", name: "Manchester City" }, overall: { position: 1, played: 6, points: 18 } });
  assert.equal(row.played, 6);
  assert.equal(row.points, 18);
  assert.throws(() => normalizeStanding({ team: { id: "43", name: "Manchester City" }, overall: { position: Number.NaN, played: 6, points: 18 } }));
});
