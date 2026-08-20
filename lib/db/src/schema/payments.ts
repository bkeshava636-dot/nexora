import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const paymentStatusValues = ["created", "verified", "failed"] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

export const payments = pgTable(
  "payments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    razorpayOrderId: text("razorpay_order_id").notNull(),
    razorpayPaymentId: text("razorpay_payment_id"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("created"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payments_razorpay_order_id_unique_idx").on(table.razorpayOrderId),
    index("payments_status_idx").on(table.status),
    index("payments_created_at_idx").on(table.createdAt),
  ],
);

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});
export const selectPaymentSchema = createSelectSchema(payments);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
