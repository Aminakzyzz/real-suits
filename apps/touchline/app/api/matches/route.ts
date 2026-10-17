import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { matches } from "@/db/schema";
import { body, failure, identity, json } from "@/lib/api";
import { matchSchema } from "@/lib/match";
export async function GET() {
  try {
    const owner = await identity();
    const rows = await getDb()
      .select({
        id: matches.id,
        title: matches.title,
        updatedAt: matches.updatedAt,
      })
      .from(matches)
      .where(eq(matches.ownerId, owner))
      .orderBy(desc(matches.updatedAt))
      .limit(100);
    return json({ matches: rows });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const owner = await identity();
    const input = matchSchema.parse(await body(request));
    const id = crypto.randomUUID(),
      readKey = crypto.randomUUID() + crypto.randomUUID(),
      now = new Date().toISOString();
    const match = { ...input, id };
    await getDb()
      .insert(matches)
      .values({
        id,
        ownerId: owner,
        title: match.title,
        payload: JSON.stringify(match),
        version: 1,
        readKey,
        createdAt: now,
        updatedAt: now,
      });
    return json({ match, version: 1, readKey }, 201);
  } catch (e) {
    return failure(e);
  }
}
