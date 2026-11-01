# Specification: BUG-005-unref-ai-rate-limiter-cleanup-interval

## Feature: Unref AI Assistant Rate Limiter Background Interval

### Overview
Prevent Node.js process termination hangs by calling `.unref()` on the active `setInterval` timer in the AI assistant route module.

### Bug Details
- **Bug ID**: BUG-005
- **Description**: The AI assistant route instantiates an unreferenced background interval for rate limiter cache eviction that prevents the Node.js event loop from draining, causing automated test suites and CLI processes importing the module to hang indefinitely.
- **Affected Functionality**: Server shutdown, automated test execution, process lifecycle management.
- **Exact File or Component**:
  - `artifacts/api-server/src/routes/ai.ts`
- **Root Cause**:
  - Line 46 of `artifacts/api-server/src/routes/ai.ts` executes `setInterval(...)` with a 60,000ms period to prune stale rate limit buckets.
  - Because `.unref()` is not called on the returned `Timeout` object, the Node event loop considers the process actively engaged, preventing natural teardown when all other work completes.
- **Steps to Reproduce**:
  1. Create a script that imports `artifacts/api-server/src/routes/ai.ts`.
  2. Execute the script using `node`.
  3. Observe that the process remains hanging indefinitely instead of terminating.
- **Expected Behavior**: Background maintenance tasks for in-memory caches allow the Node.js runtime to terminate naturally when primary operations conclude.
- **Actual Behavior**: The process remains suspended in the event loop until forcibly killed.
- **Severity**: Medium
- **Suggested Fix**:
  - Store the handle returned by `setInterval(...)` and invoke `.unref()` on it:
    ```typescript
    const rateLimitCleanupTimer = setInterval(() => {
      // eviction logic
    }, 60_000);
    rateLimitCleanupTimer.unref();
    ```
- **Test Required to Verify the Fix**:
  - Automated test script loading `artifacts/api-server/src/routes/ai.ts` and confirming clean exit without hanging.

### User Stories
- As a developer, I want backend services and automated test runners to shut down cleanly without orphaned event loop timers.

---

## Status: DRAFT

---

## Functional Requirements

### FR-1: Background Timer Unreferencing
Ensure the cleanup interval in `artifacts/api-server/src/routes/ai.ts` does not hold the event loop open.

**Acceptance Criteria:**
- [ ] The `setInterval` instance for rate limit eviction calls `.unref()`.
- [ ] Processes importing the module can terminate cleanly without hanging.

---

## Success Criteria

- Zero event loop stalls during test execution or server teardown.
- Immediate, clean process exits when test runner jobs finish.

---

## Completion Signal

### Implementation Checklist
- [ ] Update `setInterval` instantiation in `artifacts/api-server/src/routes/ai.ts` to call `.unref()`.
- [ ] Verify test runner exits promptly without lingering timer handles.

### Testing Requirements
The agent MUST complete all checks prior to outputting the completion phrase:
- [ ] All test cases pass (`pnpm.cmd test`)
- [ ] Type checks pass (`pnpm.cmd typecheck`)
- [ ] All functional criteria verified

### Completion Output
When all checks pass and changes are committed:
`<promise>DONE</promise>`

<!-- NR_OF_TRIES: 0 -->
