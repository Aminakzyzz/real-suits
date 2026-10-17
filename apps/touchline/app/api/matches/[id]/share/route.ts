import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { matches } from "@/db/schema";
import { ApiError, body, failure, identity, json } from "@/lib/api";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const owner = await identity();
    await body(request);
    const id = (await ctx.params).id;
    const readKey = crypto.randomUUID() + crypto.randomUUID();
    const result = await getDb()
      .update(matches)
      .set({ readKey })
      .where(and(eq(matches.id, id), eq(matches.ownerId, owner)))
      .returning({ version: matches.version });
    if (!result.length) throw new ApiError("Match not found.", 404);
    return json({ readKey });
  } catch (e) {
    return failure(e);
  }
}
