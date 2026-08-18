import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { branches } from "./branches";
import { semesters } from "./semesters";

export const years = pgTable(
  "years",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("years_branch_id_name_unique_idx").on(table.branchId, table.name),
    index("years_branch_id_idx").on(table.branchId),
  ],
);

export const yearsRelations = relations(years, ({ one, many }) => ({
  branch: one(branches, { fields: [years.branchId], references: [branches.id] }),
  semesters: many(semesters),
}));

export const insertYearSchema = createInsertSchema(years).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateYearSchema = createUpdateSchema(years).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectYearSchema = createSelectSchema(years);

export type Year = typeof years.$inferSelect;
export type InsertYear = typeof years.$inferInsert;
