import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const marketplaceCategoryValues = [
  "Textbooks",
  "Notes & Binders",
  "Lab Equipment",
  "Electronics & Gadgets",
  "Other Campus Items",
] as const;
export type MarketplaceCategory = (typeof marketplaceCategoryValues)[number];

export const marketplaceConditionValues = [
  "Brand New",
  "Like New",
  "Good",
  "Fair",
] as const;
export type MarketplaceCondition = (typeof marketplaceConditionValues)[number];

export const marketplaceItems = pgTable(
  "marketplace_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull().default("Textbooks"),
    price: integer("price").notNull().default(0),
    condition: text("condition").notNull().default("Good"),
    sellerName: text("seller_name").notNull(),
    sellerContact: text("seller_contact").notNull(),
    sellerInstagram: text("seller_instagram"),
    sellerEmail: text("seller_email"),
    campusLocation: text("campus_location").notNull().default("Campus Library"),
    branch: text("branch"),
    semester: text("semester"),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("marketplace_items_category_idx").on(table.category),
    index("marketplace_items_status_idx").on(table.status),
    index("marketplace_items_branch_idx").on(table.branch),
    index("marketplace_items_created_at_idx").on(table.createdAt),
  ],
);

export const insertMarketplaceItemSchema = createInsertSchema(marketplaceItems).omit({
  createdAt: true,
  updatedAt: true,
});

export const selectMarketplaceItemSchema = createSelectSchema(marketplaceItems);
export const updateMarketplaceItemSchema = createUpdateSchema(marketplaceItems).partial();

export type MarketplaceItem = typeof marketplaceItems.$inferSelect;
export type InsertMarketplaceItem = typeof marketplaceItems.$inferInsert;
