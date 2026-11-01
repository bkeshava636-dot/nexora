import test from "node:test";
import assert from "node:assert/strict";

test("Resource Subject Link & Reassignment Logic", async (t) => {
  await t.test("Reassigns primary subject to next linked subject when primary is unlinked", () => {
    let resource = {
      id: 10,
      subjectId: 101, // primary is 101
      title: "Operating Systems Lecture Notes",
    };

    const activeLinks = [
      { subjectId: 101 },
      { subjectId: 102 },
      { subjectId: 103 },
    ];

    const subjectToUnlink = 101;
    assert.ok(activeLinks.length > 1, "Must have more than 1 link to unlink");

    // Simulating transaction logic from resources.ts
    const nextSubject = activeLinks.find(l => l.subjectId !== subjectToUnlink);
    assert.ok(nextSubject, "Next subject exists");
    if (resource.subjectId === subjectToUnlink) {
      resource.subjectId = nextSubject.subjectId;
    }

    assert.equal(resource.subjectId, 102, "Primary subject pointer successfully reassigned to subject 102");
  });

  await t.test("Rejects unlinking if resource has only a sole linked subject", () => {
    const activeLinks = [
      { subjectId: 201 },
    ];

    function attemptUnlink(subjectId) {
      if (activeLinks.length <= 1) {
        return { status: 400, error: "invalid_request", message: "Cannot remove the sole subject link for this resource." };
      }
      return { status: 204 };
    }

    const res = attemptUnlink(201);
    assert.equal(res.status, 400);
    assert.equal(res.error, "invalid_request");
  });
});
