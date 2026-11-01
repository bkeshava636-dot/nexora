# Specification: BUG-004-prevent-orphaned-primary-subject-on-resource-unlink

## Feature: Prevent Orphaned Primary Subject on Resource Unlink

### Overview
Prevent catalog visibility loss and foreign key corruption when removing subject associations from resources by ensuring `resources.subjectId` is safely updated or validated.

### Bug Details
- **Bug ID**: BUG-004
- **Description**: When an administrator unlinks a subject that corresponds to `resources.subjectId`, the primary pointer is left referencing the unlinked subject. Because catalog queries employ an `INNER JOIN` against `subjects` on `resources.subjectId`, unlinking can render resources invisible or retain stale subject associations.
- **Affected Functionality**: Resource catalog display, subject reassignment, admin resource moderation.
- **Exact File or Component**:
  - `artifacts/api-server/src/routes/resources.ts`
  - `artifacts/api-server/src/lib/catalog.ts`
- **Root Cause**:
  - `DELETE /api/resources/:id/subjects/:subjectId` removes a record from `resource_subjects` but does not verify whether `subjectId` equals `resources.subjectId`.
  - `resourceCatalogSelect()` in `artifacts/api-server/src/lib/catalog.ts` depends on `innerJoin(subjects, eq(resources.subjectId, subjects.id))`. If the subject is subsequently deleted or unlinked, queries fail to return the resource.
- **Steps to Reproduce**:
  1. Associate a resource with Subject A (primary) and Subject B (secondary).
  2. Call `DELETE /api/resources/:id/subjects/:subjectAId` to remove Subject A.
  3. Inspect `resources.subjectId`. It still references Subject A instead of updating to Subject B.
- **Expected Behavior**: When unlinking the current primary subject, `resources.subjectId` is updated to point to the next available linked subject, preserving catalog visibility. If no subjects remain, an appropriate validation error is returned or fallback handling is applied.
- **Actual Behavior**: The primary subject pointer remains unchanged, leaving stale references and causing catalog query anomalies.
- **Severity**: Medium
- **Suggested Fix**:
  - In `artifacts/api-server/src/routes/resources.ts`, check if the removed subject matches `resources.subjectId`.
  - If it matches, look for remaining subjects in `resource_subjects`. If another subject exists, update `resources.subjectId` to that subject's ID within the same transaction.
  - Reject removal if attempting to remove the lone subject without designating an alternative.
- **Test Required to Verify the Fix**:
  - Automated test verifying that removing the primary subject correctly reassigns `resources.subjectId` to an existing alternate subject.

### User Stories
- As an administrator, I want to manage subject associations freely without leaving broken references in the resource catalog.
- As a student, I want resources to remain accessible under their valid remaining subjects when subject links are modified.

---

## Status: COMPLETE

---

## Functional Requirements

### FR-1: Reassign Primary Subject on Link Deletion
Ensure primary subject pointer is preserved or cleanly updated when removing subject associations.

**Acceptance Criteria:**
- [x] When `DELETE /api/resources/:id/subjects/:subjectId` removes the primary subject, the platform reassigns `resources.subjectId` to the next linked subject if one exists.
- [x] If no other subject is associated, an explanatory error (e.g., 400 Bad Request) is returned to prevent catalog orphan state.
- [x] The updated resource remains visible in `GET /api/resources` catalog listings.

---

## Success Criteria

- Zero orphaned primary subject pointers.
- Consistent resource visibility in catalog listings across subject link modifications.

---

## Completion Signal

### Implementation Checklist
- [x] Update `DELETE /api/resources/:id/subjects/:subjectId` handler in `artifacts/api-server/src/routes/resources.ts`.
- [x] Add primary subject reassignment transaction logic.
- [x] Add integration test verifying reassignment upon primary subject removal.

### Testing Requirements
The agent MUST complete all checks prior to outputting the completion phrase:
- [x] All test cases pass (`pnpm.cmd test`)
- [x] Type checks pass (`pnpm.cmd typecheck`)
- [x] All functional criteria verified

### Completion Output
When all checks pass and changes are committed:
`<promise>DONE</promise>`

<!-- NR_OF_TRIES: 1 -->
