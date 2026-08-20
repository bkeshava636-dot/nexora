import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, payments } from "@workspace/db";
import {
  createRazorpayOrder,
  getRazorpayCredentials,
  isRazorpayConfigured,
  verifyRazorpaySignature,
} from "../lib/razorpay";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MIN_AMOUNT_INR = 1;
const MAX_AMOUNT_INR = 100000;

router.get("/payments/config", (_req, res) => {
  const credentials = getRazorpayCredentials();
  res.json({
    configured: credentials !== null,
    keyId: credentials?.keyId ?? null,
  });
});

router.post("/payments/create-order", async (req, res) => {
  const { amount } = req.body ?? {};

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || !Number.isInteger(amountNum) || amountNum < MIN_AMOUNT_INR || amountNum > MAX_AMOUNT_INR) {
    res.status(400).json({
      error: "invalid_amount",
      message: `Please enter a valid amount between ₹${MIN_AMOUNT_INR} and ₹${MAX_AMOUNT_INR.toLocaleString("en-IN")}.`,
    });
    return;
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) {
    res.status(503).json({
      error: "payment_not_configured",
      message: "Razorpay payment integration is not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
    });
    return;
  }

  const amountInPaise = amountNum * 100;
  const receipt = `nex_pan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const order = await createRazorpayOrder({
      amountInPaise,
      receipt,
      notes: {
        purpose: "Buy Me Paneer support",
      },
    });

    try {
      await db.insert(payments).values({
        razorpayOrderId: order.id,
        amount: amountInPaise,
        currency: order.currency || "INR",
        status: "created",
      });
    } catch (dbErr) {
      logger.error({ dbErr, orderId: order.id }, "Failed to record payment order in database");
      // Continue so payment can still proceed even if initial DB log failed
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: credentials.keyId,
    });
  } catch (err) {
    logger.error({ err }, "Error creating Razorpay order");
    res.status(500).json({
      error: "order_creation_failed",
      message: "Could not create payment order with Razorpay. Please try again later.",
    });
  }
});

router.post("/payments/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};

  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string" ||
    !razorpay_order_id.trim() ||
    !razorpay_payment_id.trim() ||
    !razorpay_signature.trim()
  ) {
    res.status(400).json({
      error: "invalid_parameters",
      message: "Missing or invalid payment verification parameters.",
    });
    return;
  }

  if (!isRazorpayConfigured()) {
    res.status(503).json({
      error: "payment_not_configured",
      message: "Razorpay is not configured on the server.",
    });
    return;
  }

  const isValid = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    try {
      await db
        .update(payments)
        .set({
          status: "failed",
          razorpayPaymentId: razorpay_payment_id,
        })
        .where(eq(payments.razorpayOrderId, razorpay_order_id));
    } catch (dbErr) {
      logger.error({ dbErr, orderId: razorpay_order_id }, "Failed to update payment status to failed in DB");
    }

    res.status(400).json({
      error: "invalid_signature",
      message: "Payment signature verification failed.",
    });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpay_order_id));

    if (existing.length > 0) {
      await db
        .update(payments)
        .set({
          status: "verified",
          razorpayPaymentId: razorpay_payment_id,
          verifiedAt: new Date(),
        })
        .where(eq(payments.razorpayOrderId, razorpay_order_id));
    } else {
      // In case initial order insert wasn't completed, create record with verified status
      await db.insert(payments).values({
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: 0,
        currency: "INR",
        status: "verified",
        verifiedAt: new Date(),
      });
    }
  } catch (dbErr) {
    logger.error({ dbErr, orderId: razorpay_order_id }, "Failed to update verified payment record in DB");
  }

  res.json({
    success: true,
    message: "Payment verified successfully.",
  });
});

export default router;
