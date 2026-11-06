import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { hashPassword, isValidPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { getSettings, SETTINGS_ID } from "@/lib/settings";
import { json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

/** First-run setup: creates the password (only possible when none exists yet). */
export async function POST(req: Request) {
  const body = await readJson(req);
  const password = body.password;
  if (!isValidPassword(password)) {
    return json({ error: "Mật khẩu phải có từ 4 đến 128 ký tự." }, 400);
  }
  const existing = await getSettings();
  if (existing?.passwordHash) {
    return json({ error: "Mật khẩu đã được thiết lập. Hãy đăng nhập." }, 409);
  }
  const passwordHash = hashPassword(password);
  if (existing) {
    await db
      .update(appSettings)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(appSettings.id, SETTINGS_ID));
  } else {
    await db.insert(appSettings).values({ id: SETTINGS_ID, passwordHash });
  }
  await createSession();
  return json({ ok: true });
}
