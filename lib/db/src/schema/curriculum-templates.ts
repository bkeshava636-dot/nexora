import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { branches } from "./branches";
import { years } from "./years";
import { semesters } from "./semesters";

export const curriculumTemplates = pgTable(
  "curriculum_templates",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    yearId: integer("year_id")
      .notNull()
      .references(() => years.id, { onDelete: "cascade" }),
    semesterId: integer("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("curriculum_templates_branch_year_semester_unique_idx").on(
      table.branchId,
      table.yearId,
      table.semesterId,
    ),
    index("curriculum_templates_semester_id_idx").on(table.semesterId),
  ],
);

export const curriculumTemplateSubjects = pgTable(
  "curriculum_template_subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    templateId: integer("template_id")
      .notNull()
      .references(() => curriculumTemplates.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull().default(""),
    description: text("description").notNull().default(""),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("curriculum_template_subjects_template_id_idx").on(table.templateId),
  ],
);

export const curriculumTemplatesRelations = relations(curriculumTemplates, ({ one, many }) => ({
  branch: one(branches, { fields: [curriculumTemplates.branchId], references: [branches.id] }),
  year: one(years, { fields: [curriculumTemplates.yearId], references: [years.id] }),
  semester: one(semesters, { fields: [curriculumTemplates.semesterId], references: [semesters.id] }),
  subjects: many(curriculumTemplateSubjects),
}));

export const curriculumTemplateSubjectsRelations = relations(
  curriculumTemplateSubjects,
  ({ one }) => ({
    template: one(curriculumTemplates, {
      fields: [curriculumTemplateSubjects.templateId],
      references: [curriculumTemplates.id],
    }),
  }),
);

export const insertCurriculumTemplateSchema = createInsertSchema(curriculumTemplates).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateCurriculumTemplateSchema = createUpdateSchema(curriculumTemplates).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectCurriculumTemplateSchema = createSelectSchema(curriculumTemplates);

export const insertCurriculumTemplateSubjectSchema = createInsertSchema(curriculumTemplateSubjects).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateCurriculumTemplateSubjectSchema = createUpdateSchema(curriculumTemplateSubjects).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectCurriculumTemplateSubjectSchema = createSelectSchema(curriculumTemplateSubjects);

export type CurriculumTemplate = typeof curriculumTemplates.$inferSelect;
export type InsertCurriculumTemplate = typeof curriculumTemplates.$inferInsert;
export type CurriculumTemplateSubject = typeof curriculumTemplateSubjects.$inferSelect;
export type InsertCurriculumTemplateSubject = typeof curriculumTemplateSubjects.$inferInsert;
