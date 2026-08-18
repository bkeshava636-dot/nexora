import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { semesters } from "./semesters";
import { resources } from "./resources";

export const subjects = pgTable(
  "subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    semesterId: integer("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("subjects_semester_id_name_unique_idx").on(table.semesterId, table.name),
    index("subjects_semester_id_idx").on(table.semesterId),
  ],
);

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  semester: one(semesters, { fields: [subjects.semesterId], references: [semesters.id] }),
  resources: many(resources),
}));

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateSubjectSchema = createUpdateSchema(subjects).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectSubjectSchema = createSelectSchema(subjects);

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = typeof subjects.$inferInsert;
