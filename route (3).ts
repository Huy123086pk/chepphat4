import { getValidSession } from "@/lib/session";
import { DEFAULT_AUTO_LOCK_MINUTES, getSettings } from "@/lib/settings";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const [session, settings] = await Promise.all([getValidSession(), getSettings()]);
  return json({
    authenticated: Boolean(session),
    hasPassword: Boolean(settings?.passwordHash),
    autoLockMinutes: settings?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES,
  });
}
