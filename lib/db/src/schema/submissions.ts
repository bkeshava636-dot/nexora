import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { branches } from "./branches";
import { years } from "./years";
import { semesters } from "./semesters";
import { subjects } from "./subjects";
import { resourceTypeEnum, submissionStatusEnum } from "./enums";

export const submissions = pgTable(
  "submissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // Catalog references are nullable and ON DELETE SET NULL: a submission is a
    // historical student record and should survive branch/year/semester/subject
    // reorganization even if the exact catalog entry it referenced is later removed.
    branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
    yearId: integer("year_id").references(() => years.id, { onDelete: "set null" }),
    semesterId: integer("semester_id").references(() => semesters.id, { onDelete: "set null" }),
    subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    resourceType: resourceTypeEnum("resource_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    googleDriveUrl: text("google_drive_url").notNull(),
    iaAcademicYear: text("ia_academic_year"),
    iaSemester: text("ia_semester"),
    iaDepartment: text("ia_department"),
    iaType: text("ia_type"),
    studentName: text("student_name").notNull(),
    studentEmail: text("student_email").notNull(),
    status: submissionStatusEnum("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
  },
  (table) => [
    index("submissions_status_idx").on(table.status),
    index("submissions_branch_id_idx").on(table.branchId),
    index("submissions_subject_id_idx").on(table.subjectId),
    index("submissions_submitted_at_idx").on(table.submittedAt),
  ],
);

export const submissionsRelations = relations(submissions, ({ one }) => ({
  branch: one(branches, { fields: [submissions.branchId], references: [branches.id] }),
  year: one(years, { fields: [submissions.yearId], references: [years.id] }),
  semester: one(semesters, { fields: [submissions.semesterId], references: [semesters.id] }),
  subject: one(subjects, { fields: [submissions.subjectId], references: [subjects.id] }),
}));

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  status: true,
  adminNote: true,
  rejectionReason: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
});
export const updateSubmissionSchema = createUpdateSchema(submissions).omit({
  submittedAt: true,
});
export const selectSubmissionSchema = createSelectSchema(submissions);

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;
