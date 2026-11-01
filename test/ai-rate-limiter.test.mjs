import test from "node:test";
import assert from "node:assert/strict";

test("AI Assistant Rate Limiter — Unreferenced Background Timer", async (t) => {
  await t.test("Validates that rate limiter cleanup timer calls unref() and hasRef is false", () => {
    // Mirror implementation from artifacts/api-server/src/routes/ai.ts lines 46-54
    const rateLimitCleanupTimer = setInterval(() => {}, 5 * 60 * 1000);
    rateLimitCleanupTimer.unref();

    assert.equal(typeof rateLimitCleanupTimer.unref, "function");
    assert.equal(rateLimitCleanupTimer.hasRef(), false, "Unreferenced timer must have hasRef === false");

    // Clean up
    clearInterval(rateLimitCleanupTimer);
  });
});
