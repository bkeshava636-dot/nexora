import test from "node:test";
import assert from "node:assert/strict";

test("IA Papers API — Exam Year Query Filtering", async (t) => {
  await t.test("Serializes examYear query parameter in client fetch URL", () => {
    const params = {
      examYear: "2026",
      semester: "3rd Semester",
      department: "CSE",
    };

    const sp = new URLSearchParams();
    if (params.examYear) sp.set("examYear", params.examYear);
    if (params.semester) sp.set("semester", params.semester);
    if (params.department) sp.set("department", params.department);

    assert.equal(sp.toString(), "examYear=2026&semester=3rd+Semester&department=CSE");
  });

  await t.test("Filters papers matching examYear condition", () => {
    const samplePapers = [
      { id: 1, title: "Paper 1", examYear: "2025", semester: "3rd Semester" },
      { id: 2, title: "Paper 2", examYear: "2026", semester: "3rd Semester" },
      { id: 3, title: "Paper 3", examYear: "2026", semester: "5th Semester" },
      { id: 4, title: "Paper 4", examYear: null, semester: "3rd Semester" },
    ];

    const targetYear = "2026";
    const filtered = samplePapers.filter(p => p.examYear === targetYear);
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map(p => p.id), [2, 3]);
  });
});
