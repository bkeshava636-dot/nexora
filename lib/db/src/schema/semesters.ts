import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { years } from "./years";
import { subjects } from "./subjects";

export const semesters = pgTable(
  "semesters",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    yearId: integer("year_id")
      .notNull()
      .references(() => years.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("semesters_year_id_name_unique_idx").on(table.yearId, table.name),
    index("semesters_year_id_idx").on(table.yearId),
  ],
);

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  year: one(years, { fields: [semesters.yearId], references: [years.id] }),
  subjects: many(subjects),
}));

export const insertSemesterSchema = createInsertSchema(semesters).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateSemesterSchema = createUpdateSchema(semesters).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectSemesterSchema = createSelectSchema(semesters);

export type Semester = typeof semesters.$inferSelect;
export type InsertSemester = typeof semesters.$inferInsert;
