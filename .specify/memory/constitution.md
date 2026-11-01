# Nexora Constitution

> Academic resources and exam paper portal for engineering students (PES University), offering curriculum notes, past semester papers, IA papers, syllabus tracking, branch/semester navigation, analytics, and student resource contributions.

## Version
1.0.0
Git HEAD: 3f15f0fb83b8c2e0ac8d11abdae0e83ab8204981

---

## Context Detection for AI Agents

This constitution is read by AI agents in two distinct operational contexts:

### 1. Interactive Mode
When the developer is conversing directly outside of an autonomous loop:
- Be concise, conversational, and helpful.
- Clarify requirements when ambiguity exists.
- Assist in drafting specifications in `specs/`.
- Answer architectural questions without making unverified changes.

### 2. Ralph Loop Mode
When running inside an autonomous loop (fed via stdin or CLI):
- Execute commands, run tests, and complete tasks with strict safety constraints.
- Consult `IMPLEMENTATION_PLAN.md` (if present) or inspect `specs/` to identify the highest-priority incomplete spec.
- Complete all functional requirements and acceptance criteria.
- Run the test suite (`pnpm.cmd test`) and type checks (`pnpm.cmd typecheck`).
- Do NOT automatically commit or push to Git (Git Autonomy: DISABLED).
- Do NOT perform destructive operations against databases or external deployments.
- Output `<promise>DONE</promise>` only when the spec is 100% complete and all acceptance criteria are verified.
- Output `<promise>ALL_DONE</promise>` when no incomplete items remain.

**Detection:** If the input prompt refers to `PROMPT_build.md` or instructs implementation of the next spec, Ralph Loop Mode is active.

---

## Core Principles

### I. Documentation & Application Integrity
Preserve existing application functionality. Never break existing navigation, analytics, or resource viewing features. All existing tests must pass before marking any task complete.

### II. Simplicity & YAGNI
Build exactly what is specified, nothing extraneous. Avoid premature abstractions and keep solutions lean and maintainable.

### III. Autonomous Verification
Verify functionality through automated tests and strict acceptance criteria checks before signaling completion. If any test or criterion fails, diagnose and rectify the failure within the loop.

---

## Technical Stack

| Layer | Technology | Location / Command |
|---|---|---|
| Frontend | React 18, Vite, Tailwind CSS, TanStack Query, Radix UI | `artifacts/nexora` |
| Backend API | Node.js Express, esbuild, Drizzle ORM | `artifacts/api-server` |
| Database | PostgreSQL schema via Drizzle ORM | `lib/db` |
| Client SDK | Generated React Query hooks & fetch wrappers | `lib/api-client-react` |
| Package Manager | pnpm (invoke with `pnpm.cmd` on Windows) | Root workspace |
| Test Suite | Node test runner (`node --test test/*.test.mjs`) | `pnpm.cmd test` |
| Typecheck | TypeScript composite build | `pnpm.cmd typecheck` |
| Build | Vite & esbuild bundle | `pnpm.cmd build` |

---

## Autonomy Configuration

- **YOLO Mode**: DISABLED (Unrestricted destructive operations disabled; preserve existing code and data)
- **Git Autonomy**: DISABLED (Automatic Git commits and pushes disabled)

---

## Work Item Sources & Specs

Specs reside in `specs/` as markdown files following the lexicographical numbering scheme (e.g., `specs/001-feature-name.md`).
- Lower numbers represent higher priority.
- A spec is considered complete only when it contains the line `Status: COMPLETE` or `## Status: COMPLETE`.
- If `IMPLEMENTATION_PLAN.md` exists, tasks defined therein take precedence for iteration.

---

## NR_OF_TRIES Tracking

Attempts per spec are tracked using `<!-- NR_OF_TRIES: N -->` at the bottom of the spec file.
- Increment the counter on each attempt.
- If `NR_OF_TRIES` reaches 10, the task is considered overly broad and must be divided into smaller specs.

---

## History & Completion Logging

- Append a concise summary to `history.md` upon completion of each spec.
- Detailed iteration reflections can be added to `history/YYYY-MM-DD--spec-name.md`.
- Completion records are stored in `completion_log/`.

---

## Completion Signal

When all functional criteria are satisfied, test suite passes (`pnpm.cmd test`), and Git commits are completed:
Output `<promise>DONE</promise>`

Never output this string prematurely.
