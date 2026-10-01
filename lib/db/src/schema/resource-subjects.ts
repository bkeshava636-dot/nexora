import { relations } from "drizzle-orm";
import { index, integer, pgTable, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { resources } from "./resources";
import { subjects } from "./subjects";

export const resourceSubjects = pgTable(
  "resource_subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("resource_subjects_resource_subject_unique_idx").on(table.resourceId, table.subjectId),
    index("resource_subjects_resource_id_idx").on(table.resourceId),
    index("resource_subjects_subject_id_idx").on(table.subjectId),
  ],
);

export const resourceSubjectsRelations = relations(resourceSubjects, ({ one }) => ({
  resource: one(resources, { fields: [resourceSubjects.resourceId], references: [resources.id] }),
  subject: one(subjects, { fields: [resourceSubjects.subjectId], references: [subjects.id] }),
}));

export const insertResourceSubjectSchema = createInsertSchema(resourceSubjects).omit({
  createdAt: true,
});
export const selectResourceSubjectSchema = createSelectSchema(resourceSubjects);

export type ResourceSubject = typeof resourceSubjects.$inferSelect;
export type InsertResourceSubject = typeof resourceSubjects.$inferInsert;
