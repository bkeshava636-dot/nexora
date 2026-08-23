import app from "./app";
import { logger } from "./lib/logger";
import { ensureTables } from "@workspace/db";
import { seedSemesterQps } from "./lib/seed-qps";

const rawPort = process.env["PORT"] || "5050";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Automatically ensure tables exist and seed initial QPs on startup
ensureTables()
  .then(async () => {
    logger.info("Database tables verified");
    await seedSemesterQps();
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
    });
  });

