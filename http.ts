/** Small helpers shared by API route handlers. */

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

/** Parse a request body as JSON regardless of content-type (works with sendBeacon too). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function asString(value: unknown, max = 100000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function asInt(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

export function asBool(value: unknown): boolean {
  return value === true;
}
