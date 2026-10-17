import snapshot from "@/lib/data/league-snapshot.json";
import { LEAGUE_API, LEAGUE_HOME, discoverSeason, normalizeFixture, normalizeStanding } from "@/lib/league";

export const dynamic = "force-dynamic";
let current: { expires: number; value: Record<string, unknown> } | null = null;
let inFlight: Promise<Record<string, unknown>> | null = null;

async function official(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { Accept: "application/json, text/html;q=0.9", "User-Agent": "Touchline/0.2 (football hackathon prototype)" } });
  if (!response.ok) throw new Error(`Official source ${new URL(url).pathname} returned ${response.status}.`);
  return response;
}

async function fresh() {
  const homepage = await (await official(LEAGUE_HOME)).text();
  const { seasonId, matchweek } = discoverSeason(homepage);
  const fixtureSourceUrl = `${LEAGUE_API}/v1/competitions/8/seasons/${seasonId}/matchweeks/${matchweek}/matches`;
  const standingsSourceUrl = `${LEAGUE_API}/v5/competitions/8/seasons/${seasonId}/standings`;
  const [matches, standings] = await Promise.all([
    official(fixtureSourceUrl).then(r => r.json()) as Promise<{ data: Parameters<typeof normalizeFixture>[0][] }>,
    official(standingsSourceUrl).then(r => r.json()) as Promise<{ matchweek: number; tables: { entries: Parameters<typeof normalizeStanding>[0][] }[] }>,
  ]);
  if (!Array.isArray(matches.data) || !Array.isArray(standings.tables?.[0]?.entries)) throw new Error("Official feed structure changed.");
  return {
    updatedAt: new Date().toISOString(), sourceUrl: LEAGUE_HOME, fixtureSourceUrl, standingsSourceUrl,
    season: `${seasonId}/${String(seasonId+1).slice(-2)}`, matchweek, standingsMatchweek: standings.matchweek,
    fixtures: matches.data.map(normalizeFixture).sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    standings: standings.tables[0].entries.map(normalizeStanding),
    // Editorial links are sourced, not model-generated headlines. Scores and
    // table rows refresh independently; old news is never relabelled as fresh.
    articles: [{ title: `Matchweek ${matchweek}: follow the latest official updates`, url: `https://www.premierleague.com/en/matchweek/${seasonId}_${matchweek}/blog` }],
    stale: false,
  };
}

function fallback() {
  return {
    updatedAt: snapshot.updatedAtISO, sourceUrl: snapshot.sourceUrl, season: snapshot.season, matchweek: snapshot.matchweek,
    standingsMatchweek: snapshot.standingsMatchweek, stale: true,
    fixtures: snapshot.fixtures.map(item => ({ id: item.id, home: item.home.name, away: item.away.name,
      homeBadge: item.home.badgeUrl, awayBadge: item.away.badgeUrl, homeScore: item.home.score ?? null, awayScore: item.away.score ?? null,
      status: item.status, kickoff: item.kickoff })),
    standings: snapshot.standings.map(item => ({ position: item.position, team: item.team.name,
      shortName: item.team.shortName, badge: item.team.badgeUrl, played: item.played, points: item.points })),
    articles: snapshot.articles, error: "Official feed unavailable. Showing the timestamped saved snapshot.",
  };
}

export async function GET() {
  if (!current || current.expires < Date.now()) {
    if (!inFlight) inFlight = fresh().then(value => { current = { value, expires: Date.now()+30000 }; return value; })
      .catch((error: unknown) => { console.warn("Official league refresh unavailable:", error instanceof Error ? error.message : "Unknown upstream error"); const value = { ...(current?.value ?? fallback()), stale: true }; current = { value, expires: Date.now()+30000 }; return value; })
      .finally(() => { inFlight = null; });
    await inFlight;
  }
  return Response.json(current?.value ?? fallback(), { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30", "X-Content-Type-Options": "nosniff" } });
}
