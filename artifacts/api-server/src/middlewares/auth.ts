import type { NextFunction, Request, Response } from "express";
import { sessionCookieName, verifySessionToken } from "../lib/session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: { username: string };
    }
  }
}

/**
 * Reads and verifies the admin session cookie on every request, attaching
 * `req.admin` when valid. Does not reject the request by itself — routes
 * that are public but behave differently for admins (e.g. branch listing
 * honoring `includeInactive`) can read `req.admin`, while routes that are
 * admin-only should also apply `requireAdmin` below.
 */
export function readSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookieName] as string | undefined;
  const payload = verifySessionToken(token);
  if (payload) {
    req.admin = { username: payload.username };
  }
  next();
}

/**
 * Rejects the request with 401 unless a valid admin session is present.
 * This is enforced server-side regardless of what the frontend shows or
 * hides, so admin routes cannot be reached by unauthenticated requests
 * even if a client bypasses the UI.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin) {
    res.status(401).json({ error: "unauthorized", message: "Admin authentication is required." });
    return;
  }
  next();
}
