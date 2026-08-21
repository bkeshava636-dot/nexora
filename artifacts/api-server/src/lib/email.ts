import nodemailer from "nodemailer";
import { logger } from "./logger";

export interface SendPasswordResetOptions {
  to: string;
  resetUrl: string;
  username: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env["RESEND_API_KEY"] ||
      process.env["SENDGRID_API_KEY"] ||
      process.env["POSTMARK_SERVER_TOKEN"] ||
      process.env["BREVO_API_KEY"] ||
      (process.env["SMTP_HOST"] && process.env["SMTP_USER"] && process.env["SMTP_PASS"]) ||
      process.env["SMTP_HOST"],
  );
}

export function getEmailProviderName(): string {
  if (process.env["RESEND_API_KEY"]) return "Resend";
  if (process.env["SENDGRID_API_KEY"]) return "SendGrid";
  if (process.env["POSTMARK_SERVER_TOKEN"]) return "Postmark";
  if (process.env["BREVO_API_KEY"]) return "Brevo";
  if (process.env["SMTP_HOST"]) return "SMTP";
  return "None (unconfigured)";
}

function getFromAddress(): string {
  return (
    process.env["EMAIL_FROM"] ||
    process.env["RESEND_FROM"] ||
    process.env["SENDGRID_FROM"] ||
    "Nexora <noreply@nexora.edu>"
  );
}

function buildResetEmailHtml(resetUrl: string, username: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Nexora admin password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td>
              <div style="margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a;">Nexora</span>
                <span style="font-size: 12px; font-weight: 700; background-color: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; margin-left: 8px;">Admin Desk</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; line-height: 1.3; margin: 0 0 16px 0; color: #0f172a;">
                Reset your admin password
              </h1>
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #475569;">
                Hello <strong>${escapeHtml(username)}</strong>,<br>
                We received a request to reset your password for the Nexora admin portal. Click the button below to choose a new password:
              </p>
              <div style="margin: 28px 0;">
                <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px;">
                  Reset Password &rarr;
                </a>
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 16px 0;">
                Or copy and paste this link into your browser:<br>
                <a href="${escapeHtml(resetUrl)}" style="color: #2563eb; word-break: break-all; font-size: 12px;">${escapeHtml(resetUrl)}</a>
              </p>
              <div style="border-top: 1px solid #f1f5f9; margin-top: 28px; padding-top: 20px;">
                <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  This link will expire in <strong>60 minutes</strong> and can only be used once.<br>
                  If you didn't request a password reset, you can safely ignore this email — your account remains secure.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildResetEmailText(resetUrl: string, username: string): string {
  return `Reset your Nexora admin password

Hello ${username},

We received a request to reset your password for the Nexora admin portal.
Open the link below to choose a new password:

${resetUrl}

This link is valid for 60 minutes and can only be used once.
If you didn't request a password reset, you can safely ignore this message.
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  username,
}: SendPasswordResetOptions): Promise<{ success: boolean; provider: string; error?: string }> {
  const subject = "Reset your Nexora admin password";
  const from = getFromAddress();
  const html = buildResetEmailHtml(resetUrl, username);
  const text = buildResetEmailText(resetUrl, username);

  // 1. Resend API
  if (process.env["RESEND_API_KEY"]) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env["RESEND_API_KEY"].trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Resend API returned error response");
        return { success: false, provider: "Resend", error: `Resend HTTP ${response.status}` };
      }

      logger.info({ provider: "Resend", recipient: to }, "Password reset email dispatched successfully via Resend");
      return { success: true, provider: "Resend" };
    } catch (err) {
      logger.error({ err }, "Failed to send email via Resend API");
      return { success: false, provider: "Resend", error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 2. SendGrid API
  if (process.env["SENDGRID_API_KEY"]) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env["SENDGRID_API_KEY"].trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from.includes("<") ? from.replace(/.*<([^>]+)>.*/, "$1") : from },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "SendGrid API returned error response");
        return { success: false, provider: "SendGrid", error: `SendGrid HTTP ${response.status}` };
      }

      logger.info({ provider: "SendGrid", recipient: to }, "Password reset email dispatched successfully via SendGrid");
      return { success: true, provider: "SendGrid" };
    } catch (err) {
      logger.error({ err }, "Failed to send email via SendGrid API");
      return { success: false, provider: "SendGrid", error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 3. Postmark API
  if (process.env["POSTMARK_SERVER_TOKEN"]) {
    try {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": process.env["POSTMARK_SERVER_TOKEN"].trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: from,
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Postmark API returned error response");
        return { success: false, provider: "Postmark", error: `Postmark HTTP ${response.status}` };
      }

      logger.info({ provider: "Postmark", recipient: to }, "Password reset email dispatched successfully via Postmark");
      return { success: true, provider: "Postmark" };
    } catch (err) {
      logger.error({ err }, "Failed to send email via Postmark API");
      return { success: false, provider: "Postmark", error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 4. Brevo API
  if (process.env["BREVO_API_KEY"]) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env["BREVO_API_KEY"].trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: from.includes("<") ? from.replace(/.*<([^>]+)>.*/, "$1") : from },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Brevo API returned error response");
        return { success: false, provider: "Brevo", error: `Brevo HTTP ${response.status}` };
      }

      logger.info({ provider: "Brevo", recipient: to }, "Password reset email dispatched successfully via Brevo");
      return { success: true, provider: "Brevo" };
    } catch (err) {
      logger.error({ err }, "Failed to send email via Brevo API");
      return { success: false, provider: "Brevo", error: err instanceof Error ? err.message : String(err) };
    }
  }

  // 5. Standard SMTP via Nodemailer
  if (process.env["SMTP_HOST"]) {
    try {
      const port = Number(process.env["SMTP_PORT"]) || 587;
      const secure = process.env["SMTP_SECURE"] === "true" || port === 465;
      const transporter = nodemailer.createTransport({
        host: process.env["SMTP_HOST"].trim(),
        port,
        secure,
        auth:
          process.env["SMTP_USER"] && process.env["SMTP_PASS"]
            ? {
                user: process.env["SMTP_USER"].trim(),
                pass: process.env["SMTP_PASS"].trim(),
              }
            : undefined,
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      logger.info({ provider: "SMTP", recipient: to }, "Password reset email dispatched successfully via SMTP");
      return { success: true, provider: "SMTP" };
    } catch (err) {
      logger.error({ err }, "Failed to send email via SMTP");
      return { success: false, provider: "SMTP", error: err instanceof Error ? err.message : String(err) };
    }
  }

  // No email provider configured
  logger.warn(
    {
      requiredEnvOptions: [
        "RESEND_API_KEY (with optional EMAIL_FROM)",
        "SENDGRID_API_KEY (with optional EMAIL_FROM)",
        "POSTMARK_SERVER_TOKEN (with optional EMAIL_FROM)",
        "BREVO_API_KEY (with optional EMAIL_FROM)",
        "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM",
      ],
    },
    "Password reset email delivery skipped: No email provider configured on the server.",
  );

  return { success: false, provider: "None", error: "email_not_configured" };
}
