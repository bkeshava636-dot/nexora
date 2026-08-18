import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { subjects } from "./subjects";
import { resourceTypeEnum } from "./enums";

export const resources = pgTable(
  "resources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    resourceType: resourceTypeEnum("resource_type").notNull(),
    googleDriveUrl: text("google_drive_url").notNull(),
    isNew: boolean("is_new").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("resources_subject_id_idx").on(table.subjectId),
    index("resources_resource_type_idx").on(table.resourceType),
    index("resources_is_featured_idx").on(table.isFeatured),
    index("resources_is_verified_idx").on(table.isVerified),
    index("resources_is_new_idx").on(table.isNew),
    index("resources_created_at_idx").on(table.createdAt),
  ],
);

export const resourcesRelations = relations(resources, ({ one }) => ({
  subject: one(subjects, { fields: [resources.subjectId], references: [subjects.id] }),
}));

export const insertResourceSchema = createInsertSchema(resources).omit({
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  verifiedBy: true,
});
export const updateResourceSchema = createUpdateSchema(resources).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectResourceSchema = createSelectSchema(resources);

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
