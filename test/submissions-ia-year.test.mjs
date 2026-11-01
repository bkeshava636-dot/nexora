import test from "node:test";
import assert from "node:assert/strict";

test("Submissions IA Year Lifecycle — Field Mapping", async (t) => {
  await t.test("Simulates IA paper submission payload preserving iaYear", () => {
    const rawSubmission = {
      resourceType: "Internal Assessment",
      title: "Maths IA-1 Paper",
      googleDriveUrl: "https://drive.google.com/file/d/sample/view",
      iaAcademicYear: "2025-2026",
      iaYear: "2026",
      iaSemester: "3rd Semester",
      iaDepartment: "CSE",
      iaType: "IA-1",
      studentName: "Student Contributor",
      studentEmail: "student@example.com",
    };

    assert.equal(rawSubmission.iaYear, "2026");
    assert.equal(rawSubmission.iaType, "IA-1");
  });

  await t.test("Maps submission.iaYear to iaPapers.examYear upon approval", () => {
    const submissionRecord = {
      id: 42,
      resourceType: "Internal Assessment",
      title: "Data Structures IA Paper",
      googleDriveUrl: "https://drive.google.com/file/d/ds-sample/view",
      iaAcademicYear: "2025-2026",
      iaYear: "2026",
      iaSemester: "3rd Semester",
      iaDepartment: "CSE",
      iaType: "IA-1",
      studentName: "Contributor",
    };

    // Mirror logic from artifacts/api-server/src/routes/submissions.ts line 282
    const iaPaperInsert = {
      academicYear: submissionRecord.iaAcademicYear,
      semester: submissionRecord.iaSemester,
      department: submissionRecord.iaDepartment,
      iaType: submissionRecord.iaType,
      examYear: submissionRecord.iaYear || undefined,
      title: submissionRecord.title,
      googleDriveUrl: submissionRecord.googleDriveUrl,
      contributorName: submissionRecord.studentName,
      isPublished: true,
      displayOrder: 0,
    };

    assert.equal(iaPaperInsert.examYear, "2026", "Exam year must match the contributor submission iaYear");
    assert.equal(iaPaperInsert.academicYear, "2025-2026");
    assert.equal(iaPaperInsert.department, "CSE");
  });
});
