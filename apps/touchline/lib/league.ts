type Team = { id: string; name: string; shortName?: string; score?: number };
type Match = { matchId: string; homeTeam: Team; awayTeam: Team; period: string; kickoff: string; kickoffTimezone: string; clock?: string; ground?: string };
type TableEntry = { team: Team; overall: { position: number; played: number; points: number } };

export const LEAGUE_HOME = "https://www.premierleague.com/en";
export const LEAGUE_API = "https://sdp-prem-prod.premier-league-prod.pulselive.com/api";
export const crest = (id: string) => /^\d+$/.test(id) ? `https://resources.premierleague.com/premierleague25/badges/${id}.svg` : "";

export function discoverSeason(html: string) {
  const season = html.match(/ACTIVE_PL_SEASON_ID\s*=\s*['"](\d+)['"]/)?.[1];
  const week = html.match(/ACTIVE_PL_MATCHWEEK_ID\s*=\s*['"](\d+)['"]/)?.[1];
  const fallback = html.match(/\/en\/matchweek\/(\d{4})_(\d+)\/blog/);
  const seasonId = Number(season ?? fallback?.[1]);
  const matchweek = Number(week ?? fallback?.[2]);
  if (!Number.isInteger(seasonId) || seasonId < 1992 || seasonId > 2100 || !Number.isInteger(matchweek) || matchweek < 1 || matchweek > 38)
    throw new Error("The official page no longer exposes its current season and matchweek.");
  return { seasonId, matchweek };
}

export function normalizeFixture(match: Match) {
  const offset = match.kickoffTimezone === "BST" ? "+01:00" : "Z";
  const instant = new Date(`${match.kickoff.replace(" ", "T")}${offset}`);
  if (![match.homeTeam?.name, match.awayTeam?.name, match.period].every(value => typeof value === "string") || !Number.isFinite(instant.getTime()))
    throw new Error("Unexpected fixture data.");
  return {
    id: String(match.matchId), home: match.homeTeam.name, away: match.awayTeam.name,
    homeBadge: crest(String(match.homeTeam.id)), awayBadge: crest(String(match.awayTeam.id)),
    homeScore: typeof match.homeTeam.score === "number" ? match.homeTeam.score : null,
    awayScore: typeof match.awayTeam.score === "number" ? match.awayTeam.score : null,
    status: match.period, kickoff: instant.toISOString(), clock: match.clock ?? null,
    venue: match.ground ?? null,
    url: `https://www.premierleague.com/en/match/${match.matchId}`,
  };
}

export function normalizeStanding(entry: TableEntry) {
  if (!entry.team?.name || !Number.isFinite(entry.overall?.position) || !Number.isFinite(entry.overall?.points))
    throw new Error("Unexpected standings data.");
  return {
    position: entry.overall.position, team: entry.team.name, shortName: entry.team.shortName ?? entry.team.name,
    badge: crest(String(entry.team.id)), played: entry.overall.played, points: entry.overall.points,
  };
}
