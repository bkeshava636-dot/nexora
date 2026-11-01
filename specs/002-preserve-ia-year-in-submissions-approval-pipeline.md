# Specification: BUG-002-preserve-ia-year-in-submissions-approval-pipeline

## Feature: Preserve IA Year in Submissions Approval Pipeline

### Overview
Ensure student-contributed IA paper submissions preserve the exam year (`iaYear`) from submission ingestion through administrative approval and publication into the `ia_papers` catalog.

### Bug Details
- **Bug ID**: BUG-002
- **Description**: Student IA paper contributions lose their exam year metadata because the backend submission route omits `iaYear` from query projection selections and fails to map `submission.iaYear` to `iaPapers.examYear` upon approval.
- **Affected Functionality**: Student IA paper submissions, admin moderation queue, approved IA paper catalog records.
- **Exact File or Component**:
  - `artifacts/api-server/src/routes/submissions.ts`
  - `lib/api-zod/src/generated/api.ts`
- **Root Cause**:
  - `submissionSelectFields` in `artifacts/api-server/src/routes/submissions.ts` omits `iaYear: submissions.iaYear`.
  - `POST /api/submissions` creation endpoint does not parse and insert `iaYear` into the `submissions` table.
  - When an administrator approves an IA submission via `POST /api/submissions/:id/approve`, the transaction populates `iaPapers` but fails to populate `examYear` from the submission data, permanently losing the student's specified exam year.
- **Steps to Reproduce**:
  1. Issue a `POST /api/submissions` request with `type: "ia_paper"` and `iaYear: "2026"`.
  2. Inspect the created submission record in database or via `GET /api/submissions`. Note that `iaYear` is absent or null.
  3. Approve the submission via `POST /api/submissions/:id/approve`.
  4. Query `GET /api/ia-papers`. The generated paper has `examYear: null`.
- **Expected Behavior**: The submission retains `iaYear: "2026"` throughout its lifecycle, and upon approval, the published IA paper record contains `examYear: "2026"`.
- **Actual Behavior**: `iaYear` is dropped during creation and approval, leaving approved IA papers without exam year attribution.
- **Severity**: High
- **Suggested Fix**:
  - Update `submissionSelectFields` in `artifacts/api-server/src/routes/submissions.ts` to include `iaYear: submissions.iaYear`.
  - Update `POST /api/submissions` handler to extract `iaYear` and persist it in the database insertion payload.
  - In `POST /api/submissions/:id/approve`, assign `examYear: submission.iaYear ?? null` when inserting into `iaPapers`.
- **Test Required to Verify the Fix**:
  - Execute automated tests verifying an IA submission with `iaYear` persists in database and translates to `examYear` upon administrative approval.

### User Stories
- As a student, I want my submitted IA paper's exam year to be stored so that other students can discover papers by year.
- As an administrator, I want approved IA papers to retain the exam year submitted by the contributor without manual re-entry.

---

## Status: DRAFT

---

## Functional Requirements

### FR-1: Submission Record Ingestion and Selection
Include `iaYear` in the creation and retrieval flows for submissions.

**Acceptance Criteria:**
- [ ] `submissionSelectFields` contains `iaYear: submissions.iaYear`.
- [ ] `POST /api/submissions` persists `iaYear` in the `submissions` table when provided.
- [ ] `GET /api/submissions` and `GET /api/submissions/:id` return `iaYear`.

### FR-2: Exam Year Mapping on Approval
Map `submission.iaYear` to `iaPapers.examYear` during submission approval.

**Acceptance Criteria:**
- [ ] In `POST /api/submissions/:id/approve`, the insert statement for `iaPapers` sets `examYear: submission.iaYear ?? null`.
- [ ] The newly created IA paper contains the correct exam year matching the initial submission.

---

## Success Criteria

- Complete preservation of exam year metadata from submission to publication.
- Zero data loss for student IA paper contributions.

---

## Completion Signal

### Implementation Checklist
- [ ] Update `submissionSelectFields` in `artifacts/api-server/src/routes/submissions.ts`.
- [ ] Update submission creation logic to store `iaYear`.
- [ ] Update approval logic to forward `iaYear` to `iaPapers.examYear`.
- [ ] Add regression test in `test/` verifying the end-to-end pipeline.

### Testing Requirements
The agent MUST complete all checks prior to outputting the completion phrase:
- [ ] All test cases pass (`pnpm.cmd test`)
- [ ] Type checks pass (`pnpm.cmd typecheck`)
- [ ] All functional criteria verified

### Completion Output
When all checks pass and changes are committed:
`<promise>DONE</promise>`

<!-- NR_OF_TRIES: 0 -->
