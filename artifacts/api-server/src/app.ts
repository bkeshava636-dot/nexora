import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Admin sessions rely on a cookie, so CORS must allow credentials. That means
// the wildcard "*" origin (the default) can't be used — the origin has to be
// echoed back explicitly for each allowed origin. CORS_ORIGIN accepts a
// comma-separated allow-list (e.g. the deployed frontend URL); in
// development, any origin is reflected so the Vite dev server (on its own
// port) can be used without extra configuration.
const configuredOrigins = (process.env["CORS_ORIGIN"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        // Same-origin requests, curl, healthchecks, etc. have no Origin header.
        callback(null, true);
        return;
      }
      if (process.env.NODE_ENV !== "production" || configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "not_found", message: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "internal_error", message: "Something went wrong." });
});

export default app;
