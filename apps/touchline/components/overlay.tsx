"use client";
import { useEffect, useState } from "react";
import Scoreboard from "./scoreboard";
import { Match, commentary, matchSchema } from "@/lib/match";
export default function Overlay({ id }: { id: string }) {
  const [match, setMatch] = useState<Match | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    document.body.classList.add("overlay-body");
    let active = true;
    const q = new URLSearchParams(location.search);
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        let data;
        if (id === "local") {
          const key = q.get("draft") ?? "touchline.draft.guest";
          data = JSON.parse(localStorage.getItem(key) ?? "null")?.match;
          if (!data) throw new Error("Open the desk on this browser first.");
        } else {
          const response = await fetch(
            `/api/live/${encodeURIComponent(id)}?key=${encodeURIComponent(q.get("key") ?? "")}`,
            { cache: "no-store" },
          );
          if (!response.ok)
            throw new Error(
              response.status === 404
                ? "This overlay link is invalid or has been revoked."
                : "Connection interrupted. Reconnecting…",
            );
          data = ((await response.json()) as { match: unknown }).match;
        }
        const parsed = matchSchema.parse(data);
        if (active) {
          setMatch(parsed);
          setError("");
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to connect.");
      } finally {
        pending = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 1500);
    return () => {
      active = false;
      clearInterval(timer);
      document.body.classList.remove("overlay-body");
    };
  }, [id]);
  const last = match?.events.at(-1),
    player = last
      ? match?.[last.side].players.find((p) => p.id === last.playerId)
      : null;
  return (
    <main className="overlay-output">
      {match && (
        <>
          <Scoreboard match={match} />
          {last && (
            <div className="overlay-caption">
              <span>{commentary(match, last)}</span>
              {player?.fact && <small>{player.fact}</small>}
            </div>
          )}
          {match.settings.sponsor && (
            <div className="overlay-sponsor">
              Match partner <strong>{match.settings.sponsor}</strong>
            </div>
          )}
        </>
      )}
      {error && (
        <div className="overlay-error" role="status">
          {error}
        </div>
      )}
    </main>
  );
}
