import { Router, type IRouter } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, appSettings, siteVisits, ensureTables, pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const TOTAL_VISITS_KEY = "total_site_visits";
const BASELINE_SEED_VISITS = 0;

async function getStoredTotalVisits(): Promise<number> {
  try {
    const [record] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, TOTAL_VISITS_KEY));

    if (record && record.value) {
      const parsed = parseInt(record.value, 10);
      if (!isNaN(parsed)) {
        // Auto-clean any legacy 12k placeholder seed value from database
        if (parsed >= 12400) {
          await db
            .update(appSettings)
            .set({ value: "1", updatedAt: new Date() })
            .where(eq(appSettings.key, TOTAL_VISITS_KEY));
          return 1;
        }
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
router.get("/analytics/total-visits", async (_req, res) => {
  try {
    const totalVisits = await getStoredTotalVisits();
    res.json({ totalVisits });
  } catch (err) {
    logger.error({ err }, "Error getting total visits");
    res.status(500).json({ error: "internal_error", message: "Failed to get visit statistics." });
  }
});

// 2. POST /api/analytics/visit (Public visit ping with rich visitor info)
router.post("/analytics/visit", async (req, res) => {
  try {
    const { visitorId, sessionId, path = "/", deviceType = "desktop", referrer } = req.body || {};
    const rawIp = req.ip || req.headers["x-forwarded-for"] || "";
    const ipHash = rawIp ? crypto.createHash("sha256").update(String(rawIp)).digest("hex").slice(0, 16) : null;
    const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]).slice(0, 255) : null;

    const normalizedPath = String(path || "/").slice(0, 255);
    const validDevice = (deviceType === "mobile" || deviceType === "tablet") ? deviceType : "desktop";

    // 1. Log site visit record
    try {
      await db.insert(siteVisits).values({
        visitorId: visitorId ? String(visitorId).slice(0, 64) : null,
        sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
        path: normalizedPath,
        deviceType: validDevice,
        referrer: referrer ? String(referrer).slice(0, 255) : null,
        ipHash,
        userAgent,
      });
    } catch (insertErr: unknown) {
      const pgErr = (insertErr as { cause?: { code?: string }; code?: string })?.cause || (insertErr as { code?: string });
      if (pgErr?.code === "42P01") {
        await ensureTables();
        await db.insert(siteVisits).values({
          visitorId: visitorId ? String(visitorId).slice(0, 64) : null,
          sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
          path: normalizedPath,
          deviceType: validDevice,
          referrer: referrer ? String(referrer).slice(0, 255) : null,
          ipHash,
          userAgent,
        }).catch(() => {});
      } else {
        logger.warn({ err: insertErr }, "Non-fatal: failed to insert site visit row");
      }
    }

    // 2. Increment aggregate counter atomically
    const client = await pool.connect();
    try {
      const current = await getStoredTotalVisits();
      const nextVal = (current + 1).toString();

      await client.query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE
         SET value = CASE
           WHEN COALESCE(NULLIF(app_settings.value, ''), '0')::bigint >= 12400 THEN '1'
           ELSE (COALESCE(NULLIF(app_settings.value, ''), '0')::bigint + 1)::text
         END,
         updated_at = now()`,
        [TOTAL_VISITS_KEY, nextVal],
      );

      const [updated] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, TOTAL_VISITS_KEY));

      const totalVisits = updated?.value ? parseInt(updated.value, 10) : current + 1;
      res.json({ totalVisits, recorded: true });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      res.json({ totalVisits: 1, recorded: true });
      return;
    }
    logger.warn({ err }, "Error recording visit ping");
    res.json({ totalVisits: 1, recorded: false });
  }
});

// 3. GET /api/admin/analytics/stats (Admin analytics dashboard data)
router.get("/admin/analytics/stats", requireAdmin, async (req, res) => {
  try {
    const daysParam = parseInt(String(req.query.days || "30"), 10);
    const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30;

    const client = await pool.connect();
    try {
      const totalVisitsStored = await getStoredTotalVisits();

      // Summary KPIs
      const summaryResult = await client.query(`
        SELECT
          COUNT(*)::int AS "totalLoggedVisits",
          COUNT(DISTINCT COALESCE(visitor_id, ip_hash))::int AS "totalUniqueVisitors",
          COUNT(CASE WHEN created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') THEN 1 END)::int AS "todayVisits",
          COUNT(DISTINCT CASE WHEN created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') THEN COALESCE(visitor_id, ip_hash) END)::int AS "todayUniqueVisitors",
          COUNT(CASE WHEN created_at >= ((date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - interval '1 day') AT TIME ZONE 'Asia/Kolkata')
                      AND created_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') THEN 1 END)::int AS "yesterdayVisits",
          COUNT(CASE WHEN created_at >= (now() - interval '7 days') THEN 1 END)::int AS "last7DaysVisits",
          COUNT(CASE WHEN created_at >= (now() - interval '30 days') THEN 1 END)::int AS "last30DaysVisits"
        FROM site_visits;
      `);

      const summary = summaryResult.rows[0] || {};
      const totalVisits = Math.max(totalVisitsStored, summary.totalLoggedVisits || 0);

      // Daily breakdown
      const dailyResult = await client.query(`
        SELECT
          to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS visits,
          COUNT(DISTINCT COALESCE(visitor_id, ip_hash))::int AS "uniqueVisitors"
        FROM site_visits
        WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - ($1 || ' days')::interval)
        GROUP BY 1
        ORDER BY 1 ASC;
      `, [days - 1]);

      const dailyMap = new Map<string, { visits: number; uniqueVisitors: number }>();
      for (const row of dailyResult.rows) {
        dailyMap.set(row.date, {
          visits: Number(row.visits),
          uniqueVisitors: Number(row.uniqueVisitors),
        });
      }

      const dailyBreakdown: { date: string; label: string; visits: number; uniqueVisitors: number }[] = [];
      const now = new Date();
      // IST offset (UTC+5.5)
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(istTime);
        d.setDate(d.getDate() - i);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const dateKey = `${yyyy}-${mm}-${dd}`;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const label = `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;

        const found = dailyMap.get(dateKey) || { visits: 0, uniqueVisitors: 0 };
        dailyBreakdown.push({
          date: dateKey,
          label,
          visits: found.visits,
          uniqueVisitors: found.uniqueVisitors,
        });
      }

      const totalPeriodVisits = dailyBreakdown.reduce((sum, item) => sum + item.visits, 0);

      // Top paths
      const topPathsResult = await client.query(`
        SELECT
          path,
          COUNT(*)::int AS count
        FROM site_visits
        WHERE created_at >= (now() - ($1 || ' days')::interval)
        GROUP BY path
        ORDER BY count DESC
        LIMIT 10;
      `, [days]);

      const topPaths = topPathsResult.rows.map((r) => {
        const count = Number(r.count);
        let label = r.path;
        if (r.path === "/") label = "Home";
        else if (r.path === "/resources") label = "Resources Shelf";
        else if (r.path === "/pyqs") label = "PYQs Library";
        else if (r.path === "/quick-links") label = "Quick Links";
        else if (r.path === "/contribute") label = "Contribute Material";
        else if (r.path.startsWith("/branch/")) label = `Branch: ${r.path.replace("/branch/", "")}`;
        else if (r.path.startsWith("/subject/")) label = `Subject: ${r.path.replace("/subject/", "")}`;

        return {
          path: r.path,
          label,
          count,
          percentage: totalPeriodVisits > 0 ? Math.round((count / totalPeriodVisits) * 100) : 0,
        };
      });

      // Device breakdown
      const deviceResult = await client.query(`
        SELECT
          device_type AS device,
          COUNT(*)::int AS count
        FROM site_visits
        WHERE created_at >= (now() - ($1 || ' days')::interval)
        GROUP BY device_type
        ORDER BY count DESC;
      `, [days]);

      const deviceBreakdown = deviceResult.rows.map((r) => ({
        device: r.device.charAt(0).toUpperCase() + r.device.slice(1),
        count: Number(r.count),
        percentage: totalPeriodVisits > 0 ? Math.round((Number(r.count) / totalPeriodVisits) * 100) : 0,
      }));

      // Hourly breakdown
      const hourlyResult = await client.query(`
        SELECT
          extract(hour from created_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
          COUNT(*)::int AS count
        FROM site_visits
        WHERE created_at >= (now() - ($1 || ' days')::interval)
        GROUP BY 1
        ORDER BY 1 ASC;
      `, [days]);

      const hourlyMap = new Map<number, number>();
      for (const row of hourlyResult.rows) {
        hourlyMap.set(Number(row.hour), Number(row.count));
      }

      const hourlyBreakdown = Array.from({ length: 24 }, (_, h) => {
        const period = h < 12 ? "AM" : "PM";
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return {
          hour: h,
          label: `${displayH} ${period}`,
          count: hourlyMap.get(h) || 0,
        };
      });

      // Top Referrers
      const referrersResult = await client.query(`
        SELECT
          COALESCE(NULLIF(referrer, ''), 'Direct / Bookmark') AS referrer,
          COUNT(*)::int AS count
        FROM site_visits
        WHERE created_at >= (now() - ($1 || ' days')::interval)
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 6;
      `, [days]);

      const topReferrers = referrersResult.rows.map((r) => ({
        referrer: r.referrer,
        count: Number(r.count),
        percentage: totalPeriodVisits > 0 ? Math.round((Number(r.count) / totalPeriodVisits) * 100) : 0,
      }));

      const avgVisitsPerDay = days > 0 ? Math.round(totalPeriodVisits / days) : 0;
      const todayVisits = Number(summary.todayVisits || 0);
      const yesterdayVisits = Number(summary.yesterdayVisits || 0);
      const todayGrowth = yesterdayVisits > 0
        ? Math.round(((todayVisits - yesterdayVisits) / yesterdayVisits) * 100)
        : (todayVisits > 0 ? 100 : 0);

      res.json({
        days,
        totalVisits,
        todayVisits,
        yesterdayVisits,
        todayGrowth,
        todayUniqueVisitors: Number(summary.todayUniqueVisitors || 0),
        last7DaysVisits: Number(summary.last7DaysVisits || 0),
        last30DaysVisits: Number(summary.last30DaysVisits || 0),
        totalPeriodVisits,
        avgVisitsPerDay,
        dailyBreakdown,
        topPaths,
        deviceBreakdown,
        hourlyBreakdown,
        topReferrers,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      res.json({
        days: 30,
        totalVisits: await getStoredTotalVisits(),
        todayVisits: 0,
        yesterdayVisits: 0,
        todayGrowth: 0,
        todayUniqueVisitors: 0,
        last7DaysVisits: 0,
        last30DaysVisits: 0,
        totalPeriodVisits: 0,
        avgVisitsPerDay: 0,
        dailyBreakdown: [],
        topPaths: [],
        deviceBreakdown: [],
        hourlyBreakdown: [],
        topReferrers: [],
      });
      return;
    }
    logger.error({ err }, "Error fetching admin analytics stats");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch analytics statistics." });
  }
});

export default router;
