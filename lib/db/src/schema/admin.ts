import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const selectAdminUserSchema = createSelectSchema(adminUsers);
export const insertAdminUserSchema = createInsertSchema(adminUsers);

export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);

export type AdminUser = InferSelectModel<typeof adminUsers>;
export type InsertAdminUser = InferInsertModel<typeof adminUsers>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;
export type InsertPasswordResetToken = InferInsertModel<typeof passwordResetTokens>;
