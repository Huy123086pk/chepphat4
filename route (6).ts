import { asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, type NewDocumentRow } from "@/db/schema";
import { getValidSession } from "@/lib/session";
import { asBool, asInt, asString, json, readJson } from "@/lib/http";
import { computeFromHtml } from "@/lib/text";

export const dynamic = "force-dynamic";

/** Export every document (including trash) as JSON. */
export async function GET() {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const rows = await db.select().from(documents).orderBy(asc(documents.createdAt));
  return json({
    app: "writing-room",
    version: 1,
    exportedAt: new Date().toISOString(),
    documents: rows,
  });
}

/** Restore documents from a previously exported JSON payload. */
export async function POST(req: Request) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const body = await readJson(req);
  const arr = Array.isArray(body.documents) ? body.documents : null;
  if (!arr) return json({ error: "Định dạng bản sao lưu không hợp lệ." }, 400);

  const rows: NewDocumentRow[] = [];
  for (const item of arr.slice(0, 500)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const content = asString(o.content, 2_000_000);
    const computed = computeFromHtml(content);
    const createdAt = parseDate(o.createdAt) ?? new Date();
    const updatedAt = parseDate(o.updatedAt) ?? createdAt;
    rows.push({
      title: asString(o.title, 300).trim() || "Không tiêu đề",
      content,
      plainText: computed.plainText.slice(0, 200_000),
      wordCount: computed.wordCount,
      charCount: computed.charCount,
      lineCount: computed.lineCount,
      writingTimeSec: Math.max(0, asInt(o.writingTimeSec)),
      isDraft: asBool(o.isDraft),
      isFavorite: asBool(o.isFavorite),
      isTrashed: asBool(o.isTrashed),
      createdAt,
      updatedAt,
    });
  }
  if (rows.length > 0) {
    await db.insert(documents).values(rows);
  }
  return json({ ok: true, imported: rows.length });
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
