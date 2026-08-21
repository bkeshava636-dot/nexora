import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { GetCurrentAdminResponse, LoginBody, LoginResponse } from "@workspace/api-zod";
import { db, adminUsers, passwordResetTokens } from "@workspace/db";
import { verifyAdminCredentials, setAdminPassword } from "../lib/admin-credentials";
import { createSessionToken, sessionCookieName, sessionCookieOptions } from "../lib/session";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendPasswordResetEmail } from "../lib/email";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "username and password are required." });
    return;
  }

  const { username, password } = parsed.data;
  const isValid = await verifyAdminCredentials(username, password);
  if (!isValid) {
    res.status(401).json({ error: "invalid_credentials", message: "Incorrect username or password." });
    return;
  }

  const { token, expiresAt } = createSessionToken(username);
  res.cookie(sessionCookieName, token, sessionCookieOptions(expiresAt));
  res.json(LoginResponse.parse({ authenticated: true, username }));
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(sessionCookieName, sessionCookieOptions());
  res.status(204).end();
});

router.get("/auth/me", (req, res) => {
  if (req.admin) {
    res.json(GetCurrentAdminResponse.parse({ authenticated: true, username: req.admin.username }));
    return;
  }
  res.json(GetCurrentAdminResponse.parse({ authenticated: false }));
});

router.post("/auth/change-password", requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({
      error: "invalid_request",
      message: "Current password and new password are required.",
    });
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({
      error: "invalid_password",
      message: "New password must be at least 8 characters long.",
    });
    return;
  }

  const isValidCurrent = await verifyAdminCredentials(req.admin!.username, currentPassword);
  if (!isValidCurrent) {
    res.status(400).json({
      error: "invalid_current_password",
      message: "Current password is incorrect.",
    });
    return;
  }

  try {
    await setAdminPassword(req.admin!.username, newPassword);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    logger.error({ err }, "Failed to update admin password");
    res.status(500).json({
      error: "internal_error",
      message: "An error occurred while updating the password.",
    });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({
      error: "invalid_email",
      message: "Please enter a valid email address.",
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    let targetUsername: string | null = null;

    // Check database for matching admin email
    const [dbUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, normalizedEmail));

    if (dbUser) {
      targetUsername = dbUser.username;
    } else {
      // Check environment ADMIN_EMAIL fallback
      const envEmail = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
      const envUsername = process.env["ADMIN_USERNAME"];
      if (envEmail && envUsername && envEmail === normalizedEmail) {
        targetUsername = envUsername;
      }
    }

    if (targetUsername) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      await db.insert(passwordResetTokens).values({
        username: targetUsername,
        tokenHash,
        expiresAt,
      });

      // Generate secure reset URL
      const originHeader = req.get("origin") || req.get("referer");
      let baseUrl =
        process.env["APP_BASE_URL"] ||
        process.env["CLIENT_URL"] ||
        process.env["FRONTEND_URL"];

      if (!baseUrl && originHeader) {
        try {
          const parsed = new URL(originHeader);
          baseUrl = `${parsed.protocol}//${parsed.host}`;
        } catch {
          // Ignore parse errors
        }
      }

      if (!baseUrl) {
        const proto = req.secure || req.get("x-forwarded-proto") === "https" ? "https" : "http";
        const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5173";
        baseUrl = `${proto}://${host}`;
      }

      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      const resetUrl = `${cleanBaseUrl}/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail({
        to: normalizedEmail,
        resetUrl,
        username: targetUsername,
      });

      logger.info(
        { username: targetUsername },
        "Password reset token generated and email dispatch requested for admin account.",
      );
    }
  } catch (err) {
    logger.error({ err }, "Error processing forgot-password request");
  }

  // Always return the exact same generic message to prevent account enumeration
  res.json({
    message: "If an account exists for this email, you'll receive a password reset link.",
  });
});

router.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || typeof token !== "string") {
    res.status(400).json({
      error: "invalid_token",
      message: "Password reset token is required.",
    });
    return;
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({
      error: "invalid_password",
      message: "Password must be at least 8 characters long.",
    });
    return;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  try {
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      );

    if (!tokenRecord) {
      res.status(400).json({
        error: "invalid_or_expired_token",
        message: "Password reset link is invalid or has expired.",
      });
      return;
    }

    // Set new password
    await setAdminPassword(tokenRecord.username, newPassword);

    // Invalidate token immediately
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenRecord.id));

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    logger.error({ err }, "Error during password reset");
    res.status(500).json({
      error: "internal_error",
      message: "An error occurred while resetting the password.",
    });
  }
});

export default router;

