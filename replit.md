# Nexora

Nexora is a modern academic resource hub for engineering students to find verified notes, question papers, lab materials, and assignments by branch, year, semester, and subject.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/nexora run dev` — run the frontend (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate a versioned migration from schema changes
- `pnpm --filter @workspace/db run migrate` — apply migrations (production-safe)
- `pnpm --filter @workspace/db run push` — push DB schema changes directly (local/dev iteration only — see `DEPLOYMENT.md`)
- Required env: see `artifacts/api-server/.env.example` and `artifacts/nexora/.env.example`; full production guide in `DEPLOYMENT.md`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (versioned migrations in `lib/db/drizzle/`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nexora/src/App.tsx` — routed student and admin experience
- `artifacts/nexora/src/data.ts` — shared types (re-exported from the generated API client) and display helpers; no hardcoded/local data
- `artifacts/nexora/src/index.css` — Nexora visual tokens, typography, and responsive styles
- `artifacts/api-server/` — the Express API — auth, catalog CRUD, submissions review, all backed by PostgreSQL
- `lib/api-spec/openapi.yaml` — shared API contract source of truth
- `lib/db/src/schema/` — database schema package (Drizzle table + Zod validation definitions)
- `lib/db/drizzle/` — versioned SQL migrations generated from the schema

## Architecture decisions

- The catalog (branches → years → semesters → subjects → resources) and
  submissions are backed by PostgreSQL via Drizzle ORM, served through the
  Express API in `artifacts/api-server` and consumed by the frontend via
  generated React Query hooks (`lib/api-client-react`). There is no
  browser-local/mock data path left in production code.
- Google Drive remains an external file destination; the app stores and
  validates links (both client-side for UX and server-side as the
  authoritative check — see `lib/google-drive.ts` in the API server) rather
  than proxying or downloading academic files.
- Admin auth is a signed session cookie (HMAC, `node:crypto`) tied to a
  single env-configured admin account; enforcement is server-side
  (`requireAdmin` middleware) on every admin/mutating route, not just a
  hidden UI.
- The visual language uses deep ink, saffron actions, and mint verification
  cues to make trust and navigation distinct.

## Product

- Students can discover engineering branches, browse academic paths,
  search/filter resources, open linked materials, and contribute resources
  for review.
- Admins can log in, manage the full branch/year/semester/subject/resource
  catalog (add/edit/delete/reorder), and review/approve/reject student
  submissions — all changes persist in PostgreSQL.

## User preferences

- Keep the experience mobile-first, fast, organized, and professional for
  engineering students.

## Gotchas

- Artifact workflows provide `PORT` and `BASE_PATH`; use the managed Nexora
  workflow for previews.
- The frontend and API server are independent deployables that may live on
  different origins in production — see `DEPLOYMENT.md` for required env
  vars, CORS/cookie behavior across origins, and SPA routing/rewrite rules.
- Database schema changes go through versioned migrations
  (`lib/db/drizzle/`, `pnpm run generate` / `pnpm run migrate`), not
  `drizzle-kit push`, once any real data exists — see `DEPLOYMENT.md` §2.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
