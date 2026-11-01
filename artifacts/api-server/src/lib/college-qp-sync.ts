import { db, semesterQps, appSettings } from "@workspace/db";
import { eq, or, ilike } from "drizzle-orm";
import { logger } from "./logger";

export const DEFAULT_COLLEGE_LIBRARY_URL = "https://www.bitm.edu.in/library";
export const LAST_SYNC_KEY = "last_college_qp_sync_at";
export const LAST_SYNC_SUMMARY_KEY = "last_college_qp_sync_summary";

export interface ParsedCollegeQp {
  examYear: string;
  semester: string;
  department: string;
  title: string;
  downloadUrl: string;
  resourceType: "zip" | "pdf";
}

export interface CollegeSyncResult {
  sourceUrl: string;
  scanned: number;
  newAdded: number;
  alreadyExisting: number;
  itemsAdded: Array<{
    id?: number;
    title: string;
    examYear: string;
    semester: string;
    department: string;
    downloadUrl: string;
  }>;
  syncedAt: string;
}

export function parseSemesterFromText(text: string): string {
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

export function parseExamYearFromText(text: string): string {
  const matches = text.match(/\b(20\d{2})\b/g);
  if (matches && matches.length > 0) {
    // If multiple years mentioned (e.g. Dec 2025/Jan 2026), pick the concluding exam year (2026)
    const nums = matches.map(Number);
    return Math.max(...nums).toString();
  }
  return new Date().getFullYear().toString();
}

export function cleanDepartmentFromAnchor(text: string, href: string): string {
  let dept = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!dept || dept.length < 2 || /click\s+to\s+view/i.test(dept)) {
    const filename = href.split("/").pop()?.replace(/\.(zip|pdf)$/i, "") || "General";
    dept = filename;
  }
  return dept;
}

/**
 * Validates whether a paper belongs to Bachelor of Engineering (B.E.)
 * and strictly rejects non-BE degrees (MBA, MCA, BCA, M.Tech, M.Sc, Ph.D, etc.)
 */
export function isBePaper(rowTitle: string, department: string, downloadUrl: string): boolean {
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

/**
 * Extracts the B.E. accordion or section if the page organizes downloads by degree (e.g. BE, MBA, MCA).
 * If no specific BE section is identified, returns the full HTML for row-level filtering.
 */
export function extractBeSectionHtml(html: string): string {
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

export function parseCollegeHtml(html: string, baseUrl: string = "https://www.bitm.edu.in"): ParsedCollegeQp[] {
  const scopeHtml = extractBeSectionHtml(html);
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  const parsedItems: ParsedCollegeQp[] = [];
  const seenUrls = new Set<string>();

  while ((trMatch = trRegex.exec(scopeHtml)) !== null) {
    const trContent = trMatch[1];
    if (trContent.includes(".zip") || trContent.includes(".pdf")) {
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const tds: string[] = [];
      let tdMatch: RegExpExecArray | null;
      while ((tdMatch = tdRegex.exec(trContent)) !== null) {
        tds.push(tdMatch[1]);
      }
      if (tds.length >= 2) {
        const rowTitle = tds[0].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        const semester = parseSemesterFromText(rowTitle);
        const examYear = parseExamYearFromText(rowTitle);

        const aRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let aMatch: RegExpExecArray | null;
        while ((aMatch = aRegex.exec(tds[1])) !== null) {
          let href = aMatch[1].trim();
          if (href.startsWith("/")) {
            href = `${baseUrl}${href}`;
          }
          if (!href.startsWith("http")) continue;
          if (!href.toLowerCase().endsWith(".zip") && !href.toLowerCase().endsWith(".pdf")) continue;

          // Deduplicate intra-page repeat links
          const normHref = href.toLowerCase().trim();
          if (seenUrls.has(normHref)) continue;
          seenUrls.add(normHref);

          const rawDept = aMatch[2];
          const dept = cleanDepartmentFromAnchor(rawDept, href);

          // Strictly filter out non-BE papers (MCA, MBA, BCA, M.Tech, etc.)
          if (!isBePaper(rowTitle, dept, href)) {
            continue;
          }

          const ext: "zip" | "pdf" = href.toLowerCase().endsWith(".pdf") ? "pdf" : "zip";
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

/**
 * Permanently removes any non-BE (MBA, MCA, BCA, M.Tech, etc.) records from the database
 */
export async function cleanupNonBeSemesterQps(): Promise<{ removedCount: number }> {
  try {
    const allRows = await db
      .select({
        id: semesterQps.id,
        title: semesterQps.title,
        department: semesterQps.department,
        downloadUrl: semesterQps.downloadUrl,
      })
      .from(semesterQps);

    const nonBeIds = allRows
      .filter((r) => !isBePaper(r.title, r.department, r.downloadUrl || ""))
      .map((r) => r.id);

    if (nonBeIds.length > 0) {
      logger.info({ count: nonBeIds.length }, "Removing non-BE (MBA, MCA, etc.) semester QPs from database");
      for (const id of nonBeIds) {
        await db.delete(semesterQps).where(eq(semesterQps.id, id));
      }
      return { removedCount: nonBeIds.length };
    }
    return { removedCount: 0 };
  } catch (err) {
    logger.warn({ err }, "Error during cleanup of non-BE semester QPs");
    return { removedCount: 0 };
  }
}

export async function fetchAndParseCollegeQps(sourceUrl: string = DEFAULT_COLLEGE_LIBRARY_URL): Promise<ParsedCollegeQp[]> {
  logger.info({ sourceUrl }, "Fetching college library question paper page");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NexoraAcademicBot/1.0 (+https://nexora.app)",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch college page: HTTP ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const urlObj = new URL(sourceUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return parseCollegeHtml(html, baseUrl);
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncCollegeSemesterQps(options: {
  sourceUrl?: string;
  autoPublish?: boolean;
} = {}): Promise<CollegeSyncResult> {
  const sourceUrl = options.sourceUrl || DEFAULT_COLLEGE_LIBRARY_URL;
  const autoPublish = options.autoPublish !== false;

  logger.info({ sourceUrl, autoPublish }, "Starting automated college semester QPs sync");

  // First, purge any non-BE items (MBA, MCA, BCA, etc.) from existing data
  await cleanupNonBeSemesterQps();

  const parsedItems = await fetchAndParseCollegeQps(sourceUrl);

  // Load all existing download URLs from database for strict deduplication
  const existingRows = await db
    .select({
      id: semesterQps.id,
      downloadUrl: semesterQps.downloadUrl,
      title: semesterQps.title,
      examYear: semesterQps.examYear,
      semester: semesterQps.semester,
      department: semesterQps.department,
    })
    .from(semesterQps);

  const existingUrlSet = new Set<string>();
  const existingKeySet = new Set<string>();

  for (const row of existingRows) {
    if (row.downloadUrl) {
      existingUrlSet.add(row.downloadUrl.toLowerCase().trim());
    }
    // Also track compound key (year + sem + dept)
    const key = `${row.examYear.toLowerCase()}_${row.semester.toLowerCase()}_${row.department.toLowerCase()}`;
    existingKeySet.add(key);
  }

  let newAdded = 0;
  let alreadyExisting = 0;
  const itemsAdded: CollegeSyncResult["itemsAdded"] = [];

  for (const item of parsedItems) {
    const normUrl = item.downloadUrl.toLowerCase().trim();
    if (existingUrlSet.has(normUrl)) {
      alreadyExisting++;
      continue;
    }

    try {
      const [inserted] = await db
        .insert(semesterQps)
        .values({
          examYear: item.examYear,
          semester: item.semester,
          department: item.department,
          title: item.title,
          downloadUrl: item.downloadUrl,
          resourceType: item.resourceType,
          isPublished: autoPublish,
          displayOrder: 0,
        })
        .returning();

      existingUrlSet.add(normUrl);
      newAdded++;
      itemsAdded.push({
        id: inserted?.id,
        title: item.title,
        examYear: item.examYear,
        semester: item.semester,
        department: item.department,
        downloadUrl: item.downloadUrl,
      });
    } catch (insertErr) {
      logger.warn({ err: insertErr, url: item.downloadUrl }, "Skipped QP insert on conflict / error");
      alreadyExisting++;
    }
  }

  const syncedAt = new Date().toISOString();
  const summary: CollegeSyncResult = {
    sourceUrl,
    scanned: parsedItems.length,
    newAdded,
    alreadyExisting,
    itemsAdded,
    syncedAt,
  };

  // Record sync status in app_settings
  try {
    await db
      .insert(appSettings)
      .values({
        key: LAST_SYNC_KEY,
        value: syncedAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: syncedAt, updatedAt: new Date() },
      });

    await db
      .insert(appSettings)
      .values({
        key: LAST_SYNC_SUMMARY_KEY,
        value: JSON.stringify({
          scanned: summary.scanned,
          newAdded: summary.newAdded,
          alreadyExisting: summary.alreadyExisting,
          syncedAt,
        }),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: JSON.stringify({
            scanned: summary.scanned,
            newAdded: summary.newAdded,
            alreadyExisting: summary.alreadyExisting,
            syncedAt,
          }),
          updatedAt: new Date(),
        },
      });
  } catch (settingsErr) {
    logger.warn({ err: settingsErr }, "Could not record sync timestamp in app_settings");
  }

  logger.info(
    { scanned: summary.scanned, newAdded: summary.newAdded, alreadyExisting: summary.alreadyExisting },
    "College semester QPs sync completed successfully",
  );

  return summary;
}
