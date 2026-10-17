import { env } from "cloudflare:workers";
import { identity, failure, json } from "@/lib/api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context) {
  try {
    const user = await identity();
    const parts = (await context.params).path;
    const path = parts.join("/");
    if (!/^(health|sources|sessions(?:\/[a-f0-9]{32}(?:\/(?:media|captions\.vtt|commentary\.wav|audio\/[a-f0-9]{32}))?)?)$/.test(path))
      return json({ error: "Unknown vision endpoint." }, 404);
    const origin = request.headers.get("origin");
    const here = new URL(request.url);
    if (origin && origin !== here.origin && !["GET", "HEAD"].includes(request.method))
      return json({ error: "Cross-origin changes are not allowed." }, 403);
    const variables = env as unknown as Record<string, unknown>;
    const configured = variables.TOUCHLINE_VISION_URL;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(here.hostname);
    const base = typeof configured === "string" ? configured : local ? "http://127.0.0.1:8788" : null;
    if (!base) return json({ error: "Use browser inference, or connect a separately hosted vision service." }, 503);
    const target = new URL(base);
    if (!["https:", ...(local ? ["http:"] : [])].includes(target.protocol) || target.username || target.password)
      return json({ error: "The vision service URL is not configured correctly." }, 503);
    target.pathname = `${target.pathname.replace(/\/$/, "")}/${path}`;
    target.search = "";
    const headers = new Headers({ "X-Touchline-Owner": user });
    for (const name of ["content-type", "range", "if-range"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const token = variables.TOUCHLINE_SERVICE_TOKEN;
    if (typeof token === "string") headers.set("Authorization", `Bearer ${token}`);
    if (Number(request.headers.get("content-length") || 0) > 257 * 1024 * 1024)
      return json({ error: "Video upload limit is 256 MB." }, 413);
    const response = await fetch(target.href, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
      signal: AbortSignal.timeout(path === "health" ? 5000 : 90000),
    });
    if (response.status >= 300 && response.status < 400)
      return json({ error: "The configured vision service returned an unexpected redirect." }, 502);
    const outgoing = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition"])
      if (response.headers.has(name)) outgoing.set(name, response.headers.get(name)!);
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch (error) {
    console.warn("Vision connection unavailable:", error instanceof Error ? `${error.name}: ${error.message}` : "Unknown connection error");
    if (error instanceof TypeError || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)))
      return json({ error: "The local vision service is offline. Use browser mode or start the Python service on port 8788." }, 503);
    return failure(error);
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
