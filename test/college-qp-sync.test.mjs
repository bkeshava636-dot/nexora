import test from "node:test";
import assert from "node:assert/strict";

// Mirror logic from artifacts/api-server/src/lib/college-qp-sync.ts
function parseSemesterFromText(text) {
  const t = text.toLowerCase();
  if (t.includes("first/second") || t.includes("1st/2nd") || t.includes("i/ii") || t.includes("i & ii") || t.includes("first & second")) {
    return "1st Semester";
  }
  if (t.includes("third/fourth") || t.includes("3rd/4th") || t.includes("iii/iv") || t.includes("iii & iv")) {
    return "3rd Semester";
  }
  if (t.includes("eighth") || t.includes("8th") || t.includes("viii")) return "8th Semester";
  if (t.includes("seventh") || t.includes("7th") || t.includes("vii")) return "7th Semester";
  if (t.includes("sixth") || t.includes("6th") || t.includes("vi")) return "6th Semester";
  if (t.includes("fifth") || t.includes("5th") || t.includes("v")) return "5th Semester";
  if (t.includes("fourth") || t.includes("4th") || t.includes("iv")) return "4th Semester";
  if (t.includes("third") || t.includes("3rd") || t.includes("iii")) return "3rd Semester";
  if (t.includes("second") || t.includes("2nd") || t.includes("ii")) return "2nd Semester";
  if (t.includes("first") || t.includes("1st") || t.includes("i sem")) return "1st Semester";
  return "All Semesters";
}

function parseExamYearFromText(text) {
  const matches = text.match(/\b(20\d{2})\b/g);
  if (matches && matches.length > 0) {
    const nums = matches.map(Number);
    return Math.max(...nums).toString();
  }
  return new Date().getFullYear().toString();
}

function cleanDepartmentFromAnchor(text, href) {
  let dept = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!dept || dept.length < 2) {
    const filename = href.split("/").pop()?.replace(/\.(zip|pdf)$/i, "") || "General";
    dept = filename;
  }
  return dept;
}

function parseCollegeHtml(html, baseUrl = "https://www.bitm.edu.in") {
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  const parsedItems = [];
  const seenUrls = new Set();

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    if (trContent.includes(".zip") || trContent.includes(".pdf")) {
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const tds = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(trContent)) !== null) {
        tds.push(tdMatch[1]);
      }
      if (tds.length >= 2) {
        const rowTitle = tds[0].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        const semester = parseSemesterFromText(rowTitle);
        const examYear = parseExamYearFromText(rowTitle);

        const aRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let aMatch;
        while ((aMatch = aRegex.exec(tds[1])) !== null) {
          let href = aMatch[1].trim();
          if (href.startsWith("/")) {
            href = `${baseUrl}${href}`;
          }
          if (!href.startsWith("http")) continue;
          if (!href.toLowerCase().endsWith(".zip") && !href.toLowerCase().endsWith(".pdf")) continue;

          const normHref = href.toLowerCase().trim();
          if (seenUrls.has(normHref)) continue;
          seenUrls.add(normHref);

          const rawDept = aMatch[2];
          const dept = cleanDepartmentFromAnchor(rawDept, href);
          const ext = href.toLowerCase().endsWith(".pdf") ? "pdf" : "zip";
          const title = `${rowTitle} • ${dept}`;

          parsedItems.push({
            examYear,
            semester,
            department: dept,
            title,
            downloadUrl: href,
            resourceType: ext,
          });
        }
      }
    }
  }

  return parsedItems;
}

test("College QP Sync — Semester & Year Extraction", async (t) => {
  await t.test("Extracts semester from text variations", () => {
    assert.equal(parseSemesterFromText("Seventh Semester B.E. Degree Examinations"), "7th Semester");
    assert.equal(parseSemesterFromText("Fourth Semester B.E. Degree Examinations, July 2026"), "4th Semester");
    assert.equal(parseSemesterFromText("Sixth Semester B.E. Degree Examinations"), "6th Semester");
    assert.equal(parseSemesterFromText("Third/Fourth Semester B.E. Examinations"), "3rd Semester");
    assert.equal(parseSemesterFromText("First/Second Semester B.E. Examinations"), "1st Semester");
    assert.equal(parseSemesterFromText("B.E. VIII SEMESTER Examination"), "8th Semester");
  });

  await t.test("Extracts concluding exam year from date ranges", () => {
    assert.equal(parseExamYearFromText("Examinations, December 2025/January 2026"), "2026");
    assert.equal(parseExamYearFromText("Examinations, July 2026"), "2026");
    assert.equal(parseExamYearFromText("Examinations, May/June 2025"), "2025");
    assert.equal(parseExamYearFromText("March-April 2023"), "2023");
  });

  await t.test("Cleans department name and falls back to filename if empty", () => {
    assert.equal(cleanDepartmentFromAnchor("CSE-AIML", "https://bitm.edu.in/zip/cse.zip"), "CSE-AIML");
    assert.equal(cleanDepartmentFromAnchor("", "https://bitm.edu.in/zip/mech-sample.zip"), "mech-sample");
  });

  await t.test("Parses HTML rows with deduplication and absolute URLs", () => {
    const sampleHtml = `
      <table>
        <tr>
          <td>Seventh Semester B.E. Degree Examinations, December 2025/January 2026</td>
          <td>
            <a href="/assets/frontend/zip/be-vii-cse.zip">CSE</a>
            <a href="https://www.bitm.edu.in/assets/frontend/zip/be-vii-ece.zip">ECE</a>
            <a href="/assets/frontend/zip/be-vii-cse.zip">CSE Duplicate</a>
          </td>
        </tr>
      </table>
    `;

    const items = parseCollegeHtml(sampleHtml, "https://www.bitm.edu.in");
    assert.equal(items.length, 2, "Duplicate link must be deduplicated");
    assert.equal(items[0].downloadUrl, "https://www.bitm.edu.in/assets/frontend/zip/be-vii-cse.zip");
    assert.equal(items[0].examYear, "2026");
    assert.equal(items[0].semester, "7th Semester");
    assert.equal(items[0].department, "CSE");
    assert.equal(items[0].resourceType, "zip");

    assert.equal(items[1].downloadUrl, "https://www.bitm.edu.in/assets/frontend/zip/be-vii-ece.zip");
    assert.equal(items[1].department, "ECE");
  });
});
