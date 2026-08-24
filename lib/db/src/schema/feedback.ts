import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const feedbackCategoryValues = ["improvement", "bug", "content", "other"] as const;
export type FeedbackCategory = (typeof feedbackCategoryValues)[number];

export const feedbackStatusValues = ["pending", "reviewed", "archived"] as const;
export type FeedbackStatus = (typeof feedbackStatusValues)[number];

export const feedback = pgTable(
  "feedback",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    category: text("category").notNull().default("improvement"),
    message: text("message").notNull(),
    name: text("name"),
    email: text("email"),
    pageUrl: text("page_url"),
    status: text("status").notNull().default("pending"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("feedback_status_idx").on(table.status),
    index("feedback_category_idx").on(table.category),
    index("feedback_created_at_idx").on(table.createdAt),
  ],
);

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  status: true,
  adminNotes: true,
  createdAt: true,
});
export const updateFeedbackSchema = createUpdateSchema(feedback).omit({
  createdAt: true,
});
export const selectFeedbackSchema = createSelectSchema(feedback);

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;
