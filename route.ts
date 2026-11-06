import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { hashPassword, isValidPassword, verifyPassword } from "@/lib/password";
import { getValidSession } from "@/lib/session";
import { getSettings, SETTINGS_ID } from "@/lib/settings";
import { json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const body = await readJson(req);
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = body.newPassword;
  if (!isValidPassword(next)) {
    return json({ error: "Mật khẩu mới phải có từ 4 đến 128 ký tự." }, 400);
  }
  const settings = await getSettings();
  if (!settings?.passwordHash || !verifyPassword(current, settings.passwordHash)) {
    return json({ error: "Mật khẩu hiện tại không đúng." }, 401);
  }
  await db
    .update(appSettings)
    .set({ passwordHash: hashPassword(next), updatedAt: new Date() })
    .where(eq(appSettings.id, SETTINGS_ID));
  return json({ ok: true });
}
