import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { years } from "./years";

export const branches = pgTable(
  "branches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    description: text("description").notNull().default(""),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("branches_short_name_unique_idx").on(table.shortName),
    uniqueIndex("branches_name_unique_idx").on(table.name),
  ],
);

export const branchesRelations = relations(branches, ({ many }) => ({
  years: many(years),
}));

export const insertBranchSchema = createInsertSchema(branches).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateBranchSchema = createUpdateSchema(branches).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectBranchSchema = createSelectSchema(branches);

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;
