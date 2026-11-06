import { and, asc, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getValidSession } from "@/lib/session";
import { asString, json, readJson } from "@/lib/http";
import { computeFromHtml } from "@/lib/text";

export const dynamic = "force-dynamic";

type View = "all" | "favorites" | "drafts" | "trash";

export async function GET(req: Request) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const view = (url.searchParams.get("view") ?? "all") as View;
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const sort = url.searchParams.get("sort") ?? "updated_desc";

  const where: SQL[] = [];
  if (view === "trash") {
    where.push(eq(documents.isTrashed, true));
  } else {
    where.push(eq(documents.isTrashed, false));
    if (view === "favorites") where.push(eq(documents.isFavorite, true));
    if (view === "drafts") where.push(eq(documents.isDraft, true));
  }
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(or(ilike(documents.title, like), ilike(documents.plainText, like)) as SQL);
  }

  const order =
    sort === "created_asc"
      ? asc(documents.createdAt)
      : sort === "created_desc"
        ? desc(documents.createdAt)
        : sort === "updated_asc"
          ? asc(documents.updatedAt)
          : desc(documents.updatedAt);

  const rows = await db.select().from(documents).where(and(...where)).orderBy(order);
  const list = rows.map(({ content, plainText, ...rest }) => ({
    ...rest,
    excerpt: plainText.slice(0, 240),
  }));
  return json({ documents: list });
}

export async function POST(req: Request) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const body = await readJson(req);
  const title = asString(body.title, 300).trim() || "Không tiêu đề";
  const [row] = await db.insert(documents).values({ title }).returning();
  return json(row, 201);
}
