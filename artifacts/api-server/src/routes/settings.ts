import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appSettings, ensureTables } from "@workspace/db";
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

// ---------------------------------------------------------------------------
// Homepage Feature Announcement Banner
// ---------------------------------------------------------------------------

const FEATURE_BANNER_KEY = "feature_announcement_banner";

export interface FeatureBannerConfig {
  enabled: boolean;
  title: string;
  message: string;
  badge: string;
  linkText: string;
  linkUrl: string;
}

export const DEFAULT_FEATURE_BANNER: FeatureBannerConfig = {
  enabled: true,
  title: "Check out Campus Trade!",
  message: "Buy and sell used textbooks, notes, drafters, calculators, and lab gear directly with fellow students on campus.",
  badge: "New Feature",
  linkText: "Explore Campus Trade",
  linkUrl: "/marketplace",
};

export async function getFeatureBannerSetting(): Promise<FeatureBannerConfig> {
  try {
    const [record] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, FEATURE_BANNER_KEY));

    if (record?.value) {
      const parsed = JSON.parse(record.value);
      return {
        ...DEFAULT_FEATURE_BANNER,
        ...parsed,
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      };
    }
  } catch (err) {
    logger.warn({ err }, "Could not read feature_announcement_banner from database; using default");
  }
  return DEFAULT_FEATURE_BANNER;
}

// GET /api/settings/feature-banner (Public)
router.get("/settings/feature-banner", async (_req, res) => {
  try {
    const config = await getFeatureBannerSetting();
    res.json(config);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// GET /api/admin/settings/feature-banner (Admin only)
router.get("/admin/settings/feature-banner", requireAdmin, async (_req, res) => {
  try {
    const config = await getFeatureBannerSetting();
    res.json(config);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// PATCH /api/admin/settings/feature-banner (Admin only)
router.patch("/admin/settings/feature-banner", requireAdmin, async (req, res) => {
  const { enabled, title, message, badge, linkText, linkUrl } = req.body ?? {};

  if (typeof enabled !== "boolean") {
    res.status(400).json({
      error: "invalid_request",
      message: "'enabled' must be a boolean (true or false).",
    });
    return;
  }

  const current = await getFeatureBannerSetting();
  const updatedConfig: FeatureBannerConfig = {
    enabled,
    title: typeof title === "string" && title.trim() ? title.trim() : current.title,
    message: typeof message === "string" && message.trim() ? message.trim() : current.message,
    badge: typeof badge === "string" && badge.trim() ? badge.trim() : current.badge,
    linkText: typeof linkText === "string" && linkText.trim() ? linkText.trim() : current.linkText,
    linkUrl: typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : current.linkUrl,
  };

  const username = req.admin?.username ?? "admin";

  try {
    const [updated] = await db
      .insert(appSettings)
      .values({
        key: FEATURE_BANNER_KEY,
        value: JSON.stringify(updatedConfig),
        updatedBy: username,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: JSON.stringify(updatedConfig),
          updatedBy: username,
          updatedAt: new Date(),
        },
      })
      .returning();

    logger.info(
      { config: updatedConfig, updatedBy: username },
      "Admin updated feature announcement banner setting.",
    );

    res.json(JSON.parse(updated.value));
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

export default router;
