import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appSettings } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SUBMISSION_MODE_KEY = "submission_approval_mode";
export const SUBMISSION_MODES = ["approval_required", "auto_publish"] as const;
export type SubmissionMode = (typeof SUBMISSION_MODES)[number];

export async function getSubmissionApprovalMode(): Promise<SubmissionMode> {
  try {
    const [record] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SUBMISSION_MODE_KEY));

    if (record?.value === "auto_publish" || record?.value === "approval_required") {
      return record.value;
    }
  } catch (err) {
    logger.warn({ err }, "Could not read submission_approval_mode from database; falling back to approval_required");
  }
  return "approval_required";
}

// GET /api/admin/settings/submission-mode (Admin only)
router.get("/admin/settings/submission-mode", requireAdmin, async (_req, res) => {
  try {
    const [record] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SUBMISSION_MODE_KEY));

    res.json({
      mode: (record?.value as SubmissionMode) || "approval_required",
      updatedBy: record?.updatedBy ?? null,
      updatedAt: record?.updatedAt ?? null,
    });
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// PATCH /api/admin/settings/submission-mode (Admin only)
router.patch("/admin/settings/submission-mode", requireAdmin, async (req, res) => {
  const mode = req.body?.mode;
  if (mode !== "approval_required" && mode !== "auto_publish") {
    res.status(400).json({
      error: "invalid_request",
      message: "mode must be either 'approval_required' or 'auto_publish'.",
    });
    return;
  }

  const username = req.admin?.username ?? "admin";

  try {
    const [updated] = await db
      .insert(appSettings)
      .values({
        key: SUBMISSION_MODE_KEY,
        value: mode,
        updatedBy: username,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: mode,
          updatedBy: username,
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info(
      { mode: updated.value, updatedBy: username },
      "Admin updated submission approval mode.",
    );

    res.json({
      mode: updated.value as SubmissionMode,
      updatedBy: updated.updatedBy,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

export default router;
