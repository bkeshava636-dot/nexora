# Specification: BUG-003-enable-exam-year-query-filtering-in-ia-papers-api

## Feature: Enable Exam Year Query Filtering in IA Papers API

### Overview
Enable server-side filtering by `examYear` on the `GET /api/ia-papers` endpoint so that clients can query IA papers filtered by specific examination years.

### Bug Details
- **Bug ID**: BUG-003
- **Description**: The `GET /api/ia-papers` endpoint ignores the `examYear` query parameter, returning papers across all years even when a client requests a specific examination year filter.
- **Affected Functionality**: IA paper browsing, year-specific exam paper searches, administrative paper filtering.
- **Exact File or Component**:
  - `artifacts/api-server/src/routes/ia-papers.ts`
  - `lib/api-client-react/src/ia-papers.ts`
- **Root Cause**:
  - `artifacts/api-server/src/routes/ia-papers.ts` unpacks query parameters `{ academicYear, semester, department, iaType, search, isPublished }` but omits `examYear`.
  - No SQL condition (`eq(iaPapers.examYear, examYear)`) is added to the Drizzle query builder when `examYear` is supplied in the request.
- **Steps to Reproduce**:
  1. Seed or create IA papers with exam years "2025" and "2026".
  2. Send a request to `GET /api/ia-papers?examYear=2026`.
  3. Observe that both "2025" and "2026" papers are returned in the response array.
- **Expected Behavior**: When `?examYear=2026` is present in the query string, only IA papers with `examYear === "2026"` are returned.
- **Actual Behavior**: The server returns unfiltered records regardless of the `examYear` parameter.
- **Severity**: High
- **Suggested Fix**:
  - Extract `examYear` from `req.query` in `artifacts/api-server/src/routes/ia-papers.ts`.
  - Validate and append `eq(iaPapers.examYear, String(examYear))` to the query conditions array when `examYear` is provided.
  - Update `listIaPapers` in `lib/api-client-react/src/ia-papers.ts` to include `examYear` in query parameters.
- **Test Required to Verify the Fix**:
  - Automated test querying `GET /api/ia-papers?examYear=2026` verifying that only records matching the specified year are returned.

### User Stories
- As a student, I want to filter IA papers by examination year so that I can practice with papers from my exact target year.
- As an administrator, I want to filter the IA papers list by exam year to audit papers cataloged for each cycle.

---

## Status: DRAFT

---

## Functional Requirements

### FR-1: Query Parameter Parsing
Extract `examYear` from incoming query parameters on `GET /api/ia-papers`.

**Acceptance Criteria:**
- [ ] Route handler extracts `examYear` from `req.query`.
- [ ] When `examYear` is provided, the SQL query builder appends an equality condition matching `iaPapers.examYear`.
- [ ] When `examYear` is omitted, all records matching other criteria are returned without year restriction.

### FR-2: Client Query Support
Support passing `examYear` in client list queries.

**Acceptance Criteria:**
- [ ] `listIaPapers` in `lib/api-client-react/src/ia-papers.ts` serializes `examYear` onto the request URL if present.

---

## Success Criteria

- Precise query filtering by exam year on the IA papers API endpoint.
- Correct isolation of exam papers per year without leaking unrelated years.

---

## Completion Signal

### Implementation Checklist
- [ ] Add `examYear` query parsing and condition to `artifacts/api-server/src/routes/ia-papers.ts`.
- [ ] Update client query helper in `lib/api-client-react/src/ia-papers.ts`.
- [ ] Add integration test verifying exam year filtering behavior.

### Testing Requirements
The agent MUST complete all checks prior to outputting the completion phrase:
- [ ] All test cases pass (`pnpm.cmd test`)
- [ ] Type checks pass (`pnpm.cmd typecheck`)
- [ ] All functional criteria verified

### Completion Output
When all checks pass and changes are committed:
`<promise>DONE</promise>`

<!-- NR_OF_TRIES: 0 -->
