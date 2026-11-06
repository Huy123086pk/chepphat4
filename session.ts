import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";

export const SESSION_COOKIE = "wr_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a new session row and set the HttpOnly cookie. Returns the raw token. */
export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), expiresAt });
  // opportunistic cleanup of expired sessions
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return token;
}

/** Destroy the current session (DB row + cookie). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Returns the session row when the cookie maps to a valid, unexpired session. */
export async function getValidSession() {
  const token = await getSessionToken();
  if (!token) return null;
  return db.query.sessions.findFirst({
    where: and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())),
  });
}
