import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { getSettings, SETTINGS_ID } from "@/lib/settings";
import { json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return json({ error: "Vui lòng nhập mật khẩu." }, 400);
  }
  const settings = await getSettings();
  if (!settings?.passwordHash) {
    // No password configured yet -> suggest setup flow
    await db.insert(appSettings).values({ id: SETTINGS_ID }).onConflictDoNothing();
    return json({ needsSetup: true }, 400);
  }
  if (!verifyPassword(password, settings.passwordHash)) {
    return json({ error: "Sai mật khẩu. Vui lòng thử lại." }, 401);
  }
  await createSession();
  return json({ ok: true });
}
