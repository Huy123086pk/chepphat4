import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Hash a password with scrypt + random salt.
 * Stored format: "<salt_hex>:<hash_hex>" — never plain text.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time verification of a password against a stored "salt:hash". */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 4 && password.length <= 128;
}
