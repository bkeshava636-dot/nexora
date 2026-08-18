# Nexora — Production Deployment Guide

This document describes what's required to deploy Nexora to production. It does
not deploy anything itself — use it as a checklist/reference when you do.

Nexora is three separate deployables:

1. **`artifacts/api-server`** — Express API (Node.js, serves `/api/*`)
2. **`artifacts/nexora`** — the frontend (static build, served by any static host / CDN)
3. **PostgreSQL** — a hosted instance (e.g. Supabase Postgres)

The frontend and API are independent services that may live on different
hosts/domains. Everything below accounts for that.

---

## 1. Environment variables

### API server (`artifacts/api-server`) — server-only, never expose these

See `artifacts/api-server/.env.example` for the authoritative, commented list.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | ✅ | Must be `production`. Controls cookie `Secure`/`SameSite`, CORS strictness, and log format. |
| `DATABASE_URL` | ✅ | Postgres connection string. For Supabase, use the pooled connection string with `?sslmode=require`. |
| `SESSION_SECRET` | ✅ | Long random value signing admin session cookies. Generate with `openssl rand -hex 32`. Rotating it logs out every admin session. |
| `ADMIN_USERNAME` | ✅ | Admin login username. |
| `ADMIN_PASSWORD_HASH` | ✅ (production) | `salt:hash` string from `hashPassword()` in `src/lib/password.ts`. Preferred over `ADMIN_PASSWORD` in production. |
| `CORS_ORIGIN` | ✅ (production) | Comma-separated exact origin(s) of the deployed frontend, e.g. `https://nexora.example.com`. Requests from any other origin are rejected once `NODE_ENV=production`. |
| `PORT` | ✅ | Port the server listens on (set by most hosts automatically). |
| `LOG_LEVEL` | optional | Defaults to `info`. |

Do **not** set `ADMIN_PASSWORD` (plaintext) in production — it's a dev-only
convenience that's hashed in memory on every request. Use
`ADMIN_PASSWORD_HASH` instead.

### Frontend (`artifacts/nexora`) — compiled into the public bundle

See `artifacts/nexora/.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ (if API is on a different origin) | Full origin of the deployed API, e.g. `https://api.nexora.example.com`. Leave empty only if the frontend and API share one origin behind a reverse proxy. |
| `PORT`, `BASE_PATH` | build-time only | Not embedded in the bundle's runtime env; used by Vite's dev/build tooling. |

**Verified:** no localhost URL is hardcoded anywhere in the frontend source —
`grep -rn "localhost" artifacts/nexora/src` returns nothing. The only place a
host is configured is `VITE_API_BASE_URL` (falls back to relative `/api/...`
paths, not a hardcoded localhost).

**Verified:** no `VITE_`-prefixed secret exists. The only `VITE_*` variables
in the codebase are `VITE_API_BASE_URL` and `VITE_DEV_API_PROXY_TARGET` (dev
only) — both are plain URLs, not credentials.

---

## 2. Database: versioned migrations

The project now uses **`drizzle-kit generate` + `drizzle-kit migrate`**
instead of `drizzle-kit push`. `push`/`push-force` still exist as scripts for
fast local iteration, but must not be used against production.

- Migration files live in `lib/db/drizzle/` (SQL + JSON snapshots), committed to git.
- The initial migration (`0000_wild_wind_dancer.sql`) was generated from the
  current schema and captures all 6 tables, every foreign key/cascade rule,
  and every index exactly as defined in `lib/db/src/schema/`.

**To generate a new migration after changing the schema:**
```bash
cd lib/db
DATABASE_URL=<any-reachable-postgres-url> pnpm run generate
```
(`generate` reads the TypeScript schema, not the database — the URL just
needs to be a valid connection for drizzle-kit to run, but no schema changes
are applied by this command.)

**Exact production migration command:**
```bash
cd lib/db
DATABASE_URL=<production-database-url> pnpm run migrate
```
This applies any migrations not yet recorded in the database's
`drizzle.__drizzle_migrations` tracking table. It is idempotent — running it
again with nothing new to apply is a safe no-op (verified in this pass: ran
twice against a fresh database, second run applied zero additional
statements).

**What was verified in this pass:**
- Generated the migration from the current schema (`pnpm run generate`).
- Created a brand-new, separate local database (`nexora_migration_test`) —
  the existing local test database (`nexora`) was left untouched.
- Ran `pnpm run migrate` against the fresh database — all 6 tables, FKs,
  cascades, and indexes came out identical to the schema definition (verified
  via `\d` on each table).
- Ran `migrate` a second time to confirm idempotency (no duplicate rows in
  the migrations table).
- Booted the API server against the freshly-migrated database and exercised
  real reads/writes (login, create branch, create resource, trigger a unique
  constraint conflict, trigger a foreign-key violation) — all behaved
  correctly.
- Dropped the temporary test database afterward; did not touch `nexora`.

**Do not use `push-force` in production** — it applies schema changes
directly without a reviewable migration file or history, and can silently
accept destructive changes (e.g. dropped columns) without asking.

---

## 3. Cookie / CORS behavior across origins

Admin auth is a signed, `httpOnly` session cookie. When the frontend and API
are on **different origins** (the expected production setup — e.g.
`nexora.example.com` and `api.nexora.example.com`), the following must all be
true simultaneously or the browser will refuse to store/send the cookie:

| Requirement | Where it's enforced |
|---|---|
| Cookie has `Secure` | `session.ts` → `sessionCookieOptions()`, tied to `NODE_ENV=production` |
| Cookie has `SameSite=None` | same function, same condition |
| Both origins served over **HTTPS** | infrastructure — `Secure` cookies are dropped outright over plain HTTP |
| `CORS_ORIGIN` lists the frontend's **exact** origin | `app.ts` CORS `origin()` callback — production rejects any origin not in this list |
| Frontend sends `credentials: include` on every request | already the default in `lib/api-client-react/src/custom-fetch.ts` — every generated hook goes through this |

None of this was weakened to make CORS/cookies easier — the production
behavior is strictly more restrictive than development (which reflects any
origin and allows `SameSite=Lax` since it's typically same-machine HTTP).

**Before deploying, double check:** `CORS_ORIGIN` must match the frontend's
origin **exactly** (scheme + host, e.g. `https://nexora.example.com`, no
trailing slash, no wildcard). A mismatch here is the most common cause of
"login works but nothing else does" in production.

---

## 4. SPA routing (frontend hosting)

The frontend is a client-side-routed single-page app (wouter). Routes like
`/branch/3`, `/resources`, `/admin`, `/login` only exist in JavaScript — they
are **not real files** on the static host. Without a rewrite rule, a direct
visit or refresh on any of those URLs will 404 at the host level before
React ever loads.

**Requirement:** the static host must serve `index.html` (with a 200, not a
redirect) for any path that doesn't match a real static asset file.

This is a standard SPA fallback rule, configured differently per host — a
couple of common examples for reference (adjust for whichever platform you
actually deploy to):

- **Nginx:** `try_files $uri $uri/ /index.html;`
- **Netlify/Vercel/Cloudflare Pages:** typically a built-in "SPA fallback" or
  a `_redirects`/`vercel.json` rewrite of `/*` → `/index.html` (200, not 301).
- **S3 + CloudFront:** set the CloudFront custom error response for 403/404
  to return `/index.html` with a 200.

No platform-specific config file has been added to the repo — the actual
hosting platform isn't chosen yet, and the rule is a one-line host setting on
most platforms rather than application code.

---

## 5. Pre-deploy checklist

- [ ] `DATABASE_URL` points at the real production Postgres, with `sslmode=require`
- [ ] `lib/db && pnpm run migrate` has been run against it
- [ ] `SESSION_SECRET` is a fresh random value (not the dev placeholder)
- [ ] `ADMIN_PASSWORD_HASH` is set (not `ADMIN_PASSWORD`)
- [ ] `CORS_ORIGIN` exactly matches the deployed frontend origin
- [ ] `NODE_ENV=production` on the API server
- [ ] Both frontend and API are served over HTTPS
- [ ] `VITE_API_BASE_URL` is set to the deployed API's origin
- [ ] Static host has an SPA fallback/rewrite rule configured (see §4)
- [ ] `.env` files are not committed (already gitignored) and were not shared anywhere
