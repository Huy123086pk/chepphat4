import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { getValidSession } from "@/lib/session";
import { DEFAULT_AUTO_LOCK_MINUTES, getSettings, SETTINGS_ID } from "@/lib/settings";
import { asInt, json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const settings = await getSettings();
  return json({ autoLockMinutes: settings?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES });
}

export async function PATCH(req: Request) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const body = await readJson(req);
  let minutes = asInt(body.autoLockMinutes, DEFAULT_AUTO_LOCK_MINUTES);
  if (minutes < 0) minutes = 0;
  if (minutes > 24 * 60) minutes = 24 * 60;
  const existing = await getSettings();
  if (existing) {
    await db
      .update(appSettings)
      .set({ autoLockMinutes: minutes, updatedAt: new Date() })
      .where(eq(appSettings.id, SETTINGS_ID));
  } else {
    await db.insert(appSettings).values({ id: SETTINGS_ID, autoLockMinutes: minutes });
  }
  return json({ ok: true, autoLockMinutes: minutes });
}
