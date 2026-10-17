"use client";
import { useEffect, useState } from "react";
import { Match, clockSeconds, formatClock, stats } from "@/lib/match";
export default function Scoreboard({
  match,
  large = false,
}: {
  match: Match;
  large?: boolean;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const tally = stats(match);
  return (
    <div
      className={`scorebug ${large ? "scorebug-large" : ""}`}
      aria-label={`${match.home.name} ${tally.home.goals}, ${match.away.name} ${tally.away.goals}`}
    >
      <div className="score-team" style={{ borderColor: match.home.color }}>
        <span>{match.home.short}</span>
        <b>{tally.home.goals}</b>
      </div>
      <span className="score-divider">:</span>
      <div
        className="score-team away"
        style={{ borderColor: match.away.color }}
      >
        <b>{tally.away.goals}</b>
        <span>{match.away.short}</span>
      </div>
      <div className="score-clock">
        <strong>
          {formatClock(now ? clockSeconds(match, now) : match.clock.seconds)}
        </strong>
        <span>{match.clock.period}</span>
      </div>
    </div>
  );
}
