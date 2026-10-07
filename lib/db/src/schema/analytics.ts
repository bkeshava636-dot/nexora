import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const siteVisits = pgTable(
  "site_visits",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    visitorId: text("visitor_id"),
    sessionId: text("session_id"),
    path: text("path").notNull().default("/"),
    deviceType: text("device_type").notNull().default("desktop"),
    referrer: text("referrer"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("site_visits_created_at_idx").on(table.createdAt),
    index("site_visits_path_idx").on(table.path),
    index("site_visits_visitor_id_idx").on(table.visitorId),
    index("site_visits_device_type_idx").on(table.deviceType),
  ],
);

export const insertSiteVisitSchema = createInsertSchema(siteVisits).omit({
  createdAt: true,
});
export const selectSiteVisitSchema = createSelectSchema(siteVisits);

export type SiteVisit = typeof siteVisits.$inferSelect;
export type InsertSiteVisit = typeof siteVisits.$inferInsert;
