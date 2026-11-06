import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Single-row table holding app-level settings (password hash, auto-lock...).
 */
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey(), // always "main"
  // scrypt hash in the form "salt:hash" — never plain text
  passwordHash: text("password_hash"),
  autoLockMinutes: integer("auto_lock_minutes").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // sha256(token) — raw token only lives in the HttpOnly cookie
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("Không tiêu đề"),
  // rich text HTML (bold/italic/underline/alignment preserved)
  content: text("content").notNull().default(""),
  // plain text used for search & excerpts
  plainText: text("plain_text").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  charCount: integer("char_count").notNull().default(0),
  lineCount: integer("line_count").notNull().default(0),
  writingTimeSec: integer("writing_time_sec").notNull().default(0),
  isDraft: boolean("is_draft").notNull().default(true),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isTrashed: boolean("is_trashed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppSettings = typeof appSettings.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
