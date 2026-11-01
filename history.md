# Execution History

## 2026-11-01: First Autonomous Bug-Fixing Experiment

### Completed Specifications

1. **BUG-001**: [`specs/001-fix-ia-paper-client-types-and-submission-inputs.md`](file:///c:/Users/bhrao/Downloads/nexora-local-windows-fixed/specs/001-fix-ia-paper-client-types-and-submission-inputs.md)
   - Status: COMPLETE
   - Summary: Resolved client type interface definitions in `lib/api-client-react` and schemas in `lib/api-zod` for `examYear` and `iaYear`. `pnpm.cmd typecheck` passed with 0 errors.

2. **BUG-002**: [`specs/002-preserve-ia-year-in-submissions-approval-pipeline.md`](file:///c:/Users/bhrao/Downloads/nexora-local-windows-fixed/specs/002-preserve-ia-year-in-submissions-approval-pipeline.md)
   - Status: COMPLETE
   - Summary: Added `iaYear: submissions.iaYear` to `submissionSelectFields` in `artifacts/api-server/src/routes/submissions.ts` and updated response schemas. Added end-to-end regression test in `test/submissions-ia-year.test.mjs`.

3. **BUG-003**: [`specs/003-enable-exam-year-query-filtering-in-ia-papers-api.md`](file:///c:/Users/bhrao/Downloads/nexora-local-windows-fixed/specs/003-enable-exam-year-query-filtering-in-ia-papers-api.md)
   - Status: COMPLETE
   - Summary: Enabled `examYear` query parsing and SQL filtering on `GET /api/ia-papers` and updated client query helper serialization in `lib/api-client-react/src/ia-papers.ts`. Added tests in `test/ia-papers-query.test.mjs`.

4. **BUG-004**: [`specs/004-prevent-orphaned-primary-subject-on-resource-unlink.md`](file:///c:/Users/bhrao/Downloads/nexora-local-windows-fixed/specs/004-prevent-orphaned-primary-subject-on-resource-unlink.md)
   - Status: COMPLETE
   - Summary: Updated `DELETE /resources/:id/links/:subjectId` in `artifacts/api-server/src/routes/resources.ts` to reassign `resources.subjectId` to an existing alternate subject when the primary subject is unlinked, and reject removing the sole remaining link. Added unit tests in `test/resource-unlink.test.mjs`.

5. **BUG-005**: [`specs/005-unref-ai-rate-limiter-cleanup-interval.md`](file:///c:/Users/bhrao/Downloads/nexora-local-windows-fixed/specs/005-unref-ai-rate-limiter-cleanup-interval.md)
   - Status: COMPLETE
   - Summary: Confirmed process hang independently (`hasRef() === true` on 300,000ms timer). Stored the timer handle and invoked `.unref()`. Added unit tests in `test/ai-rate-limiter.test.mjs`.

### Verification
- `pnpm.cmd test`: 62 tests passing, 0 failing.
- `pnpm.cmd typecheck`: Passed with 0 errors across all workspaces.
- `pnpm.cmd build`: Successfully built all frontend and backend artifacts.
