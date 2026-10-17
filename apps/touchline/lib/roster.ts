import { z } from "zod";

const name = z.string().trim().min(1).max(100).regex(/^[^\u0000-\u001f]+$/);
const player = z.object({ id: z.string().min(1).max(80), name, number: z.number().int().min(1).max(99) });
const team = z.object({ name, color: z.string().regex(/^#[0-9a-fA-F]{6}$/), players: z.array(player).max(30) });

// Deliberately extracts only lineup/kit fields from a producer-desk backup.
// Its existing event log, scores and future match outcomes never enter vision.
export const rosterSchema = z.object({ home: team, away: team }).superRefine((roster, context) => {
  const ids = new Set<string>();
  for (const side of ["home", "away"] as const) {
    const numbers = new Set<number>();
    for (const entry of roster[side].players) {
      if (ids.has(entry.id) || numbers.has(entry.number))
        context.addIssue({ code: "custom", message: "Use unique player IDs and shirt numbers within each team." });
      ids.add(entry.id);
      numbers.add(entry.number);
    }
  }
  if (roster.home.color.toLowerCase() === roster.away.color.toLowerCase())
    context.addIssue({ code: "custom", message: "Choose distinct visible kit colours for the two teams." });
});

export type MatchRoster = z.infer<typeof rosterSchema>;
