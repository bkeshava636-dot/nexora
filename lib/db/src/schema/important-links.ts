import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const quickLinkCategoryValues = [
  "WhatsApp Groups",
  "Results",
  "Exams",
  "Notices",
  "Academic",
  "College",
  "VTU",
  "Other",
] as const;
export type QuickLinkCategory = (typeof quickLinkCategoryValues)[number] | (string & {});

export const importantLinks = pgTable(
  "important_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    category: text("category").notNull().default("Other"),
    icon: text("icon"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("important_links_category_idx").on(table.category),
    index("important_links_is_active_idx").on(table.isActive),
    index("important_links_display_order_idx").on(table.displayOrder),
    index("important_links_created_at_idx").on(table.createdAt),
  ],
);

export const insertImportantLinkSchema = createInsertSchema(importantLinks).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateImportantLinkSchema = createUpdateSchema(importantLinks).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectImportantLinkSchema = createSelectSchema(importantLinks);

export type ImportantLink = typeof importantLinks.$inferSelect;
export type InsertImportantLink = typeof importantLinks.$inferInsert;
