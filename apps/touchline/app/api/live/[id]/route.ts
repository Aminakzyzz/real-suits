import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { matches } from "@/db/schema";
import { failure, json } from "@/lib/api";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || key.length !== 72)
      return json({ error: "Overlay not found." }, 404);
    const [row] = await getDb()
      .select({
        payload: matches.payload,
        version: matches.version,
        readKey: matches.readKey,
      })
      .from(matches)
      .where(eq(matches.id, (await ctx.params).id))
      .limit(1);
    if (!row || key !== row.readKey)
      return json({ error: "Overlay not found." }, 404);
    return json({ match: JSON.parse(row.payload), version: row.version });
  } catch (e) {
    return failure(e);
  }
}
