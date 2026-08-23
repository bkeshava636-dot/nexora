import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const semesterQps = pgTable(
  "semester_qps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    examYear: text("exam_year").notNull(),
    semester: text("semester").notNull(),
    department: text("department").notNull(),
    title: text("title").notNull().default(""),
    downloadUrl: text("download_url").notNull(),
    resourceType: text("resource_type").notNull().default("zip"),
    isPublished: boolean("is_published").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("semester_qps_exam_year_idx").on(table.examYear),
    index("semester_qps_semester_idx").on(table.semester),
    index("semester_qps_department_idx").on(table.department),
    index("semester_qps_resource_type_idx").on(table.resourceType),
    index("semester_qps_is_published_idx").on(table.isPublished),
    index("semester_qps_created_at_idx").on(table.createdAt),
  ],
);

export const insertSemesterQpSchema = createInsertSchema(semesterQps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateSemesterQpSchema = createUpdateSchema(semesterQps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSemesterQpSchema = createSelectSchema(semesterQps);

export type SemesterQp = typeof semesterQps.$inferSelect;
export type InsertSemesterQp = typeof semesterQps.$inferInsert;
