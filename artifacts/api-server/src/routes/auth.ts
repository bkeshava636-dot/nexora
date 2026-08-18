import { Router, type IRouter } from "express";
import { GetCurrentAdminResponse, LoginBody, LoginResponse } from "@workspace/api-zod";
import { verifyAdminCredentials } from "../lib/admin-credentials";
import { createSessionToken, sessionCookieName, sessionCookieOptions } from "../lib/session";

const router: IRouter = Router();

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "username and password are required." });
    return;
  }

  const { username, password } = parsed.data;
  if (!verifyAdminCredentials(username, password)) {
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

export default router;
