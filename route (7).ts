import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getValidSession } from "@/lib/session";
import { asBool, asInt, asString, json, readJson } from "@/lib/http";
import { computeFromHtml } from "@/lib/text";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function findDoc(id: string) {
  return db.query.documents.findFirst({ where: eq(documents.id, id) });
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  const row = await findDoc(id);
  if (!row) return json({ error: "Không tìm thấy bài viết." }, 404);
  return json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  const existing = await findDoc(id);
  if (!existing) return json({ error: "Không tìm thấy bài viết." }, 404);

  const body = await readJson(req);
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.title === "string") {
    patch.title = body.title.trim().slice(0, 300) || "Không tiêu đề";
  }
  if (typeof body.content === "string") {
    const content = body.content.slice(0, 2_000_000);
    patch.content = content;
    // server-side recompute so stats/search stay consistent
    const computed = computeFromHtml(content);
    patch.plainText = computed.plainText.slice(0, 200_000);
    patch.wordCount = computed.wordCount;
    patch.charCount = computed.charCount;
    patch.lineCount = computed.lineCount;
  }
  if (typeof body.plainText === "string") {
    patch.plainText = body.plainText.slice(0, 200_000);
  }
  if (typeof body.wordCount === "number") patch.wordCount = asInt(body.wordCount);
  if (typeof body.charCount === "number") patch.charCount = asInt(body.charCount);
  if (typeof body.lineCount === "number") patch.lineCount = asInt(body.lineCount);
  if (typeof body.writingTimeSec === "number") {
    patch.writingTimeSec = Math.max(0, asInt(body.writingTimeSec));
  }
  if (typeof body.isDraft === "boolean") patch.isDraft = asBool(body.isDraft);
  if (typeof body.isFavorite === "boolean") patch.isFavorite = asBool(body.isFavorite);
  if (typeof body.isTrashed === "boolean") patch.isTrashed = asBool(body.isTrashed);

  const [row] = await db.update(documents).set(patch).where(eq(documents.id, id)).returning();
  return json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const { id } = await ctx.params;
  const existing = await findDoc(id);
  if (!existing) return json({ error: "Không tìm thấy bài viết." }, 404);

  if (existing.isTrashed) {
    // already in trash -> permanent delete
    await db.delete(documents).where(eq(documents.id, id));
    return json({ ok: true, deleted: true });
  }
  // move to trash
  await db
    .update(documents)
    .set({ isTrashed: true, updatedAt: new Date() })
    .where(eq(documents.id, id));
  return json({ ok: true, trashed: true });
}
