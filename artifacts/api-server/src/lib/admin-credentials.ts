import { hashPassword, verifyPassword } from "./password";
import { logger } from "./logger";

/**
 * Admin credentials come from the environment rather than a database table:
 * this first build has exactly one admin account (see replit.md — a full
 * `admin_users` table with roles/invites is future work, not required by
 * the current product scope).
 *
 * Preferred: set ADMIN_PASSWORD_HASH to a `salt:hash` string produced by
 * hashPassword() (see lib/password.ts). For local/dev convenience,
 * ADMIN_PASSWORD (plaintext) is also accepted and hashed in memory at
 * startup; prefer ADMIN_PASSWORD_HASH in production.
 */
export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env["ADMIN_USERNAME"];
  const passwordHash = process.env["ADMIN_PASSWORD_HASH"];
  const plaintextPassword = process.env["ADMIN_PASSWORD"];

  if (!expectedUsername || (!passwordHash && !plaintextPassword)) {
    logger.error(
      "Admin login attempted but ADMIN_USERNAME and ADMIN_PASSWORD_HASH (or ADMIN_PASSWORD) are not configured.",
    );
    return false;
  }

  if (username !== expectedUsername) {
    return false;
  }

  const effectiveHash = passwordHash ?? hashPassword(plaintextPassword as string);
  return verifyPassword(password, effectiveHash);
}
