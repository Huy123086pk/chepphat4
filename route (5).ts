import { verifyPassword } from "@/lib/password";
import { getValidSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { json, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Verify the password while a session is active (used to leave the writing room). */
export async function POST(req: Request) {
  const session = await getValidSession();
  if (!session) return json({ error: "Unauthorized" }, 401);
  const body = await readJson(req);
  const password = typeof body.password === "string" ? body.password : "";
  const settings = await getSettings();
  if (!settings?.passwordHash || !verifyPassword(password, settings.passwordHash)) {
    return json({ ok: false, error: "Sai mật khẩu." }, 401);
  }
  return json({ ok: true });
}
