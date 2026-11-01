import app from "./app";
import { logger } from "./lib/logger";
import { ensureTables } from "@workspace/db";
import { seedSemesterQps } from "./lib/seed-qps";

const rawPort = process.env["PORT"] || "5050";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Automatically ensure tables exist, seed initial QPs, and clean non-BE QPs on startup
ensureTables()
  .then(async () => {
    logger.info("Database tables verified");
    await seedSemesterQps();
    const { cleanupNonBeSemesterQps } = await import("./lib/college-qp-sync");
    await cleanupNonBeSemesterQps();
  })
  .catch((err) => {
    logger.warn({ err }, "Database table check warning");
  })
  .finally(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");

      // Start automated recurring college question papers sync (checks college library portal)
      // Runs initial check 2 minutes after startup, then every 7 days
      const SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
      setTimeout(() => {
        import("./lib/college-qp-sync").then(({ syncCollegeSemesterQps }) => {
          syncCollegeSemesterQps().catch((err) => {
            logger.warn({ err }, "Initial background college QP sync warning");
          });
        });
      }, 120000);

      const syncTimer = setInterval(() => {
        import("./lib/college-qp-sync").then(({ syncCollegeSemesterQps }) => {
          syncCollegeSemesterQps().catch((err) => {
            logger.warn({ err }, "Recurring background college QP sync warning");
          });
        });
      }, SYNC_INTERVAL_MS);
      syncTimer.unref();
    });
  });

