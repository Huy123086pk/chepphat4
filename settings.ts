import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, type AppSettings } from "@/db/schema";

export const SETTINGS_ID = "main";
export const DEFAULT_AUTO_LOCK_MINUTES = 10;

export async function getSettings(): Promise<AppSettings | undefined> {
  return db.query.appSettings.findFirst({ where: eq(appSettings.id, SETTINGS_ID) });
}

export async function hasPasswordConfigured(): Promise<boolean> {
  const row = await getSettings();
  return Boolean(row?.passwordHash);
}
