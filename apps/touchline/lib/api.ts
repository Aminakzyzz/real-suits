import { getChatGPTUser } from "@/app/chatgpt-auth";
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function identity() {
  const u = await getChatGPTUser();
  if (!u) throw new ApiError("Sign in to save and manage matches.", 401);
  return u.userId;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 750000)
    throw new ApiError("This match file is too large.", 413);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError("Cross-origin changes are not allowed.", 403);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 750000)
    throw new ApiError("This match file is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("Invalid JSON.", 400);
  }
}
export function failure(e: unknown) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  if (e && typeof e === "object" && "issues" in e)
    return json(
      {
        error:
          (e as { issues: Array<{ message: string }> }).issues[0]?.message ??
          "Invalid match data.",
      },
      400,
    );
  console.error(
    "Match request failed",
    e instanceof Error ? e.name : "unknown",
  );
  return json(
    { error: "The match could not be saved. Please try again." },
    500,
  );
}
