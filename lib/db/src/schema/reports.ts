import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { resources } from "./resources";

export const reportStatusValues = ["pending", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof reportStatusValues)[number];

export const reports = pgTable(
  "reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    resourceId: integer("resource_id")
      .references(() => resources.id, { onDelete: "cascade" })
      .notNull(),
    reason: text("reason").notNull(),
    explanation: text("explanation"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
  },
  (table) => [
    index("reports_status_idx").on(table.status),
    index("reports_resource_id_idx").on(table.resourceId),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

export const reportsRelations = relations(reports, ({ one }) => ({
  resource: one(resources, { fields: [reports.resourceId], references: [resources.id] }),
}));

export const insertReportSchema = createInsertSchema(reports).omit({
  status: true,
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true,
});
export const updateReportSchema = createUpdateSchema(reports).omit({
  createdAt: true,
});
export const selectReportSchema = createSelectSchema(reports);

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
