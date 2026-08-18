import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE_NAME = "nexora_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface SessionPayload {
  username: string;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required but was not provided.",
    );
  }
  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSessionSecret()).update(payloadB64).digest("base64url");
}

/**
 * Creates a signed session token of the form `<payload>.<signature>`.
 * The payload is base64url JSON; the signature is an HMAC-SHA256 over the
 * payload, so the token cannot be forged or tampered with without the
 * server's SESSION_SECRET.
 */
export function createSessionToken(username: string): { token: string; expiresAt: Date } {
  const now = Date.now();
  const payload: SessionPayload = { username, iat: now, exp: now + SESSION_TTL_MS };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return { token: `${payloadB64}.${signature}`, expiresAt: new Date(payload.exp) };
}

/**
 * Verifies a session token's signature and expiry. Returns the decoded
 * payload when valid, or null when the token is missing, malformed,
 * tampered with, or expired.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const payloadB64 = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = sign(payloadB64);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
    return null;
  }

  return payload;
}

export const sessionCookieName = SESSION_COOKIE_NAME;

export function sessionCookieOptions(expiresAt?: Date) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    // Cross-origin deployments (frontend/api-server on different hosts, as
    // Replit "artifacts" often are) need SameSite=None + Secure. Local HTTP
    // dev can't set Secure cookies, so fall back to Lax there.
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    secure: isProduction,
    ...(expiresAt ? { expires: expiresAt } : {}),
    path: "/",
  };
}
