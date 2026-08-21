import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appSettings, ensureTables, pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const TOTAL_VISITS_KEY = "total_site_visits";
const BASELINE_SEED_VISITS = 12450;

async function getStoredTotalVisits(): Promise<number> {
  try {
    const [record] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, TOTAL_VISITS_KEY));

    if (record && record.value) {
      const parsed = parseInt(record.value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
    } else {
      logger.warn({ err }, "Could not fetch total_site_visits from DB");
    }
  }
  return BASELINE_SEED_VISITS;
}

// 1. GET /api/analytics/total-visits (Public read-only)
// Returns only the aggregated total count
router.get("/analytics/total-visits", async (_req, res) => {
  try {
    const totalVisits = await getStoredTotalVisits();
    res.json({ totalVisits });
  } catch (err) {
    logger.error({ err }, "Error getting total visits");
    res.status(500).json({ error: "internal_error", message: "Failed to get visit statistics." });
  }
});

// 2. POST /api/analytics/visit (Public visit ping)
// Increments the aggregate counter atomically
router.post("/analytics/visit", async (_req, res) => {
  try {
    const client = await pool.connect();
    try {
      const current = await getStoredTotalVisits();
      const nextVal = (current + 1).toString();

      await client.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE
         SET value = (COALESCE(NULLIF(app_settings.value, ''), '${BASELINE_SEED_VISITS}')::bigint + 1)::text,
             updated_at = now()`,
        [TOTAL_VISITS_KEY, nextVal],
      );

      const [updated] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, TOTAL_VISITS_KEY));

      const totalVisits = updated?.value ? parseInt(updated.value, 10) : current + 1;
      res.json({ totalVisits });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      res.json({ totalVisits: BASELINE_SEED_VISITS + 1 });
      return;
    }
    logger.warn({ err }, "Error recording visit ping");
    res.json({ totalVisits: BASELINE_SEED_VISITS });
  }
});

export default router;
