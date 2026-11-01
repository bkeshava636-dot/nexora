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
  if (!dept || dept.length < 2 || /click\s+to\s+view/i.test(dept)) {
    const filename = href.split("/").pop()?.replace(/\.(zip|pdf)$/i, "") || "General";
    dept = filename;
  }
  return dept;
}

function isBePaper(rowTitle, department, downloadUrl) {
  const combined = `${rowTitle} ${department} ${downloadUrl}`.toLowerCase();

  // Strictly reject "Click to view" links/titles/departments
  if (
    /click\s+to\s+view/i.test(rowTitle) ||
    /click\s+to\s+view/i.test(department) ||
    /click\s+to\s+view/i.test(downloadUrl) ||
    combined.includes("click to view")
  ) {
    return false;
  }

  const nonBePatterns = [
    /\bmba\b/i,
    /\bm\.b\.a\b/i,
    /\bmca\b/i,
    /\bm\.c\.a\b/i,
    /\bbca\b/i,
    /\bb\.c\.a\b/i,
    /\bm\.?tech\b/i,
    /\bm\.?sc\b/i,
    /\bph\.?d\b/i,
    /\bdiploma\b/i,
    /\bpolytechnic\b/i,
    /\bbba\b/i,
    /\bb\.?com\b/i,
    /\bb\.?ed\b/i,
    /\bm\.?ed\b/i,
    /\bpharm\b/i,
    /\/mba\b/i,
    /\/mca\b/i,
    /\/bca\b/i,
    /\/mtech\b/i,
    /\/m-tech\b/i,
    /\bmmc\d*/i,
    /\b\d*mca\w*/i,
    /\b\d*mba\w*/i,
    /\b\d*bca\w*/i,
    /\bfor managers\b/i,
    /\bfor computer applications\b/i,
    /\bclick\s+to\s+view\b/i,
  ];

  for (const pattern of nonBePatterns) {
    if (pattern.test(combined)) {
      return false;
    }
  }

  return true;
}

function extractBeSectionHtml(html) {
  const beButtonMatch = /<button[^>]*>[^<]*\bBE\b[^<]*<\/button>/i.exec(html);
  if (beButtonMatch) {
    const targetMatch = /data-bs-target=["']#([^"']+)["']/i.exec(beButtonMatch[0]);
    if (targetMatch) {
      const collapseId = targetMatch[1];
      const startIdx = html.indexOf(`id="${collapseId}"`);
      if (startIdx !== -1) {
        const nextItemIdx = html.indexOf('class="accordion-item"', startIdx + 30);
        return html.slice(startIdx, nextItemIdx !== -1 ? nextItemIdx : undefined);
      }
    }
    const startIdx = beButtonMatch.index;
    const nextAccordionIdx = html.indexOf('class="accordion-item"', startIdx + 50);
    return html.slice(startIdx, nextAccordionIdx !== -1 ? nextAccordionIdx : undefined);
  }

  return html;
}

function parseCollegeHtml(html, baseUrl = "https://www.bitm.edu.in") {
  const scopeHtml = extractBeSectionHtml(html);
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  const parsedItems = [];
  const seenUrls = new Set();

  while ((trMatch = trRegex.exec(scopeHtml)) !== null) {
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

          // Strictly filter out non-BE papers
          if (!isBePaper(rowTitle, dept, href)) {
            continue;
          }

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

  await t.test("Strictly accepts B.E. papers and rejects non-BE (MBA, MCA, BCA, M.Tech)", () => {
    // Should accept B.E. degree and engineering subjects
    assert.equal(isBePaper("Seventh Semester B.E. Degree Examinations", "CSE", "https://bitm.edu.in/zip/cse.zip"), true);
    assert.equal(isBePaper("Third/Fourth Semester B.E. Degree Examinations", "BIOLOGY FOR ENGINEERS", "https://bitm.edu.in/zip/bio.zip"), true);
    assert.equal(isBePaper("First/Second Semester B.E. Examinations", "BEE13-23-SS", "https://bitm.edu.in/pdf/bee.pdf"), true);
    assert.equal(isBePaper("BE 4th Sem Civil Model Question Paper", "CIVIL", "https://bitm.edu.in/zip/cv.zip"), true);

    // Should reject MBA
    assert.equal(isBePaper("Fourth Semester MBA Degree Examinations", "MBA-IV SEMESTER", "https://bitm.edu.in/zip/mba-iv.zip"), false);
    assert.equal(isBePaper("SERVICES MARKETING", "Click To View", "https://bitm.edu.in/pdf/mba-service-marketing.pdf"), false);
    assert.equal(isBePaper("MBA201-Aug-Sept 2025", "Click To View", "https://bitm.edu.in/pdf/mba201.pdf"), false);
    assert.equal(isBePaper("PYTHON PROGRAMMING FOR MANAGERS", "Click To View", "https://bitm.edu.in/pdf/22mbada401.pdf"), false);

    // Should reject MCA
    assert.equal(isBePaper("Second Semester MCA Degree Examinations", "MCA-II-Sem", "https://bitm.edu.in/zip/mca-II-sem.zip"), false);
    assert.equal(isBePaper("DATA MINING & DATA WAREHOUSING", "Click To View", "https://bitm.edu.in/zip/mca/23mca11.pdf"), false);
    assert.equal(isBePaper("Mathematical Foundation For Computer Applications", "Click To View", "https://bitm.edu.in/pdf/mmc102.pdf"), false);

    // Should reject Click To View titles and departments
    assert.equal(isBePaper("COMPUTER VISION • Click To View", "Click To View", "https://bitm.edu.in/zip/computer-vision.pdf"), false);
    assert.equal(isBePaper("PHYS12-22-SS-September 2025 • Click To View", "Click To View", "https://bitm.edu.in/pdf/phys.pdf"), false);
    assert.equal(isBePaper("MACHINE LEARNING", "Click To View", "https://bitm.edu.in/zip/ml.pdf"), false);

    // Should reject BCA, M.Tech, M.Sc, Ph.D, etc.
    assert.equal(isBePaper("Second Semester BCA Degree Examinations", "BCA", "https://bitm.edu.in/zip/bca.zip"), false);
    assert.equal(isBePaper("M.Tech Digital Communication", "MTech", "https://bitm.edu.in/zip/mtech.zip"), false);
  });

  await t.test("Filters out non-BE papers from mixed HTML tables", () => {
    const mixedHtml = `
      <table>
        <tr>
          <td>Seventh Semester B.E. Degree Examinations, December 2025/January 2026</td>
          <td>
            <a href="/assets/frontend/zip/be-vii-cse.zip">CSE</a>
          </td>
        </tr>
        <tr>
          <td>Fourth Semester MBA Degree Examinations, August 2026</td>
          <td>
            <a href="/assets/frontend/zip/mba-iv-semester.zip">MBA-IV SEMESTER</a>
          </td>
        </tr>
        <tr>
          <td>SERVICES MARKETING</td>
          <td>
            <a href="/assets/frontend/pdf/mba-service-marketing-2026.pdf">Click To View</a>
          </td>
        </tr>
        <tr>
          <td>Second Semester MCA Degree Examinations, August 2026</td>
          <td>
            <a href="/assets/frontend/zip/mca-II-sem.zip">MCA-II-Sem</a>
          </td>
        </tr>
        <tr>
          <td>Third/Fourth Semester B.E. Degree Examinations, January/February 2026</td>
          <td>
            <a href="/assets/frontend/zip/be-biology.zip">BIOLOGY FOR ENGINEERS</a>
          </td>
        </tr>
      </table>
    `;

    const items = parseCollegeHtml(mixedHtml, "https://www.bitm.edu.in");
    assert.equal(items.length, 2, "Only the 2 B.E. papers must be extracted");
    assert.equal(items[0].department, "CSE");
    assert.equal(items[1].department, "BIOLOGY FOR ENGINEERS");
    assert.ok(items.every(it => !it.downloadUrl.includes("mba") && !it.downloadUrl.includes("mca")));
  });

  await t.test("Validates 1-month sync duration check", () => {
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    function isDue(lastSyncIso) {
      if (!lastSyncIso) return true;
      const last = new Date(lastSyncIso).getTime();
      if (Number.isNaN(last)) return true;
      return now - last >= ONE_MONTH_MS;
    }

    // 5 days ago -> false
    const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isDue(fiveDaysAgo), false);

    // 29 days ago -> false
    const twentyNineDaysAgo = new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isDue(twentyNineDaysAgo), false);

    // 30 days ago -> true
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isDue(thirtyDaysAgo), true);

    // 35 days ago -> true
    const thirtyFiveDaysAgo = new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(isDue(thirtyFiveDaysAgo), true);

    // No prior sync -> true
    assert.equal(isDue(null), true);
  });
});
