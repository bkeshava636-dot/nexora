import crypto from "node:crypto";
import { logger } from "./logger";

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

export function getRazorpayCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env["RAZORPAY_KEY_ID"]?.trim();
  const keySecret = process.env["RAZORPAY_KEY_SECRET"]?.trim();

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return getRazorpayCredentials() !== null;
}

export async function createRazorpayOrder({
  amountInPaise,
  receipt,
  notes,
}: {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResponse> {
  const credentials = getRazorpayCredentials();
  if (!credentials) {
    throw new Error("Razorpay credentials are not configured");
  }

  const { keyId, keySecret } = credentials;
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: notes ?? { purpose: "Buy Me Paneer - Nexora support" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ status: response.status, errorBody }, "Razorpay order creation failed");
    throw new Error(`Razorpay API error: ${response.status}`);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const credentials = getRazorpayCredentials();
  if (!credentials) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", credentials.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const signatureBuffer = Buffer.from(signature, "utf-8");

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    logger.error({ err }, "Error verifying Razorpay signature");
    return false;
  }
}
