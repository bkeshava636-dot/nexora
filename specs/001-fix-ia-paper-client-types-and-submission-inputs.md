# Specification: BUG-001-fix-ia-paper-client-types-and-submission-inputs

## Feature: Fix IA Paper Client Types and Submission Inputs

### Overview
Resolve TypeScript compilation failures in the frontend application caused by missing type definitions for `examYear` in IA paper client models and `iaYear` in submission payload types.

### Bug Details
- **Bug ID**: BUG-001
- **Description**: TypeScript compilation fails during `pnpm.cmd typecheck` because client interfaces omit `examYear` and `iaYear` properties required by `artifacts/nexora/src/App.tsx`.
- **Affected Functionality**: Frontend TypeScript compilation, IA paper display by exam year, student IA paper submissions.
- **Exact File or Component**:
  - `lib/api-client-react/src/ia-papers.ts`
  - `lib/api-zod/src/generated/api.ts`
  - `artifacts/nexora/src/App.tsx`
- **Root Cause**:
  - `IaPaperItem`, `CreateIaPaperInput`, and `UpdateIaPaperInput` in `lib/api-client-react/src/ia-papers.ts` omit `examYear?: string | null;`.
  - `SubmissionInput` in `lib/api-zod/src/generated/api.ts` omits `iaYear?: string | null;`.
  - Consequently, `artifacts/nexora/src/App.tsx` encounters TS2339 ("Property 'examYear' does not exist on type 'IaPaperItem'") and TS2353 ("Object literal may only specify known properties, and 'iaYear' does not exist in type 'SubmissionInput'").
- **Steps to Reproduce**:
  1. Open a terminal in the root directory.
  2. Execute `pnpm.cmd typecheck`.
  3. Observe compilation errors at lines 2172, 10335, 12330, 12613, and 12681 of `artifacts/nexora/src/App.tsx`.
- **Expected Behavior**: Type definitions accurately reflect database schema capabilities and allow `pnpm.cmd typecheck` to pass without diagnostic errors.
- **Actual Behavior**: Compilation terminates with exit code 2 and 5 type errors.
- **Severity**: Critical
- **Suggested Fix**:
  - Add `examYear?: string | null;` to `IaPaperItem`, `CreateIaPaperInput`, and `UpdateIaPaperInput` in `lib/api-client-react/src/ia-papers.ts`.
  - Add `iaYear?: string | null;` to `SubmissionInput` and `CreateSubmissionBody` in `lib/api-zod/src/generated/api.ts`.
- **Test Required to Verify the Fix**:
  - Run `pnpm.cmd typecheck` to confirm zero TypeScript compilation errors across all packages.

### User Stories
- As a student, I want to submit IA papers with their associated exam year without encountering client-side type rejection.
- As an administrator, I want to view and manage IA papers with their designated exam year without frontend interface breakages.

---

## Status: DRAFT

---

## Functional Requirements

### FR-1: Client Model Property Alignment
Add `examYear` to IA paper client interfaces in `lib/api-client-react/src/ia-papers.ts`.

**Acceptance Criteria:**
- [ ] `IaPaperItem` interface includes `examYear?: string | null`.
- [ ] `CreateIaPaperInput` interface includes `examYear?: string | null`.
- [ ] `UpdateIaPaperInput` interface includes `examYear?: string | null`.

### FR-2: Submission Model Property Alignment
Add `iaYear` to submission input schemas and types in `lib/api-zod/src/generated/api.ts`.

**Acceptance Criteria:**
- [ ] `CreateSubmissionBody` schema accepts optional nullable `iaYear`.
- [ ] `SubmissionInput` interface reflects `iaYear?: string | null`.
- [ ] `artifacts/nexora/src/App.tsx` compiles cleanly when referencing `paper.examYear` and submitting `submissionData.iaYear`.

---

## Success Criteria

- `pnpm.cmd typecheck` passes with 0 errors across the entire repository.
- No regression to existing client build workflows (`pnpm.cmd build`).

---

## Completion Signal

### Implementation Checklist
- [ ] Update `lib/api-client-react/src/ia-papers.ts` with `examYear` definitions.
- [ ] Update `lib/api-zod/src/generated/api.ts` with `iaYear` definitions.
- [ ] Verify `artifacts/nexora/src/App.tsx` compiles with zero diagnostics.

### Testing Requirements
The agent MUST complete all checks prior to outputting the completion phrase:
- [ ] All test cases pass (`pnpm.cmd test`)
- [ ] Type checks pass (`pnpm.cmd typecheck`)
- [ ] All functional criteria verified

### Completion Output
When all checks pass and changes are committed:
`<promise>DONE</promise>`

<!-- NR_OF_TRIES: 0 -->
