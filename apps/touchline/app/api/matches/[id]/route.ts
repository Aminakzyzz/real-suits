import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { matches } from "@/db/schema";
import { ApiError, body, failure, identity, json } from "@/lib/api";
import { applyCommand, commandSchema, matchSchema } from "@/lib/match";
type Context = { params: Promise<{ id: string }> };
async function owned(id: string) {
  const owner = await identity();
  const [row] = await getDb()
    .select()
    .from(matches)
    .where(and(eq(matches.id, id), eq(matches.ownerId, owner)))
    .limit(1);
  if (!row) throw new ApiError("Match not found.", 404);
  return row;
}
export async function GET(_: Request, ctx: Context) {
  try {
    const row = await owned((await ctx.params).id);
    return json({
      match: JSON.parse(row.payload),
      version: row.version,
      readKey: row.readKey,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, ctx: Context) {
  try {
    const row = await owned((await ctx.params).id);
    const input = z
      .object({ version: z.number().int().positive(), command: commandSchema })
      .parse(await body(request));
    const current = matchSchema.parse(JSON.parse(row.payload));
    if (input.version !== row.version)
      return json(
        {
          error:
            "This match changed in another tab. Latest version loaded; retry your action.",
          match: current,
          version: row.version,
          readKey: row.readKey,
        },
        409,
      );
    let match;
    try {
      match = applyCommand(current, input.command);
    } catch (e) {
      if (e instanceof z.ZodError) throw e;
      throw new ApiError(
        e instanceof Error ? e.message : "Invalid action.",
        400,
      );
    }
    const updated = await getDb()
      .update(matches)
      .set({
        title: match.title,
        payload: JSON.stringify(match),
        version: row.version + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(matches.id, row.id),
          eq(matches.ownerId, row.ownerId),
          eq(matches.version, row.version),
        ),
      )
      .returning({ id: matches.id });
    if (!updated.length)
      throw new ApiError(
        "Another operator changed this match. Reload it from Saved matches.",
        409,
      );
    return json({ match, version: row.version + 1, readKey: row.readKey });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, ctx: Context) {
  try {
    const row = await owned((await ctx.params).id);
    await body(request);
    await getDb()
      .delete(matches)
      .where(and(eq(matches.id, row.id), eq(matches.ownerId, row.ownerId)));
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
