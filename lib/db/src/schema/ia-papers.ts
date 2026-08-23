import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const iaPapers = pgTable(
  "ia_papers",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    academicYear: text("academic_year").notNull(),
    semester: text("semester").notNull(),
    department: text("department").notNull(),
    iaType: text("ia_type").notNull().default("IA-1"),
    title: text("title").notNull().default(""),
    googleDriveUrl: text("google_drive_url").notNull(),
    isPublished: boolean("is_published").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ia_papers_academic_year_idx").on(table.academicYear),
    index("ia_papers_semester_idx").on(table.semester),
    index("ia_papers_department_idx").on(table.department),
    index("ia_papers_ia_type_idx").on(table.iaType),
    index("ia_papers_is_published_idx").on(table.isPublished),
    index("ia_papers_created_at_idx").on(table.createdAt),
  ],
);

export const insertIaPaperSchema = createInsertSchema(iaPapers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateIaPaperSchema = createUpdateSchema(iaPapers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectIaPaperSchema = createSelectSchema(iaPapers);

export type IaPaper = typeof iaPapers.$inferSelect;
export type InsertIaPaper = typeof iaPapers.$inferInsert;
