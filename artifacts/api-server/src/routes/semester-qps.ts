import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, ensureTables, semesterQps } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Helper to determine resource type
function inferResourceType(url: string, explicitType?: string): string {
  if (explicitType && ["zip", "pdf", "drive", "link"].includes(explicitType.toLowerCase().trim())) {
    return explicitType.toLowerCase().trim();
  }
  const urlLower = url.toLowerCase().trim();
  if (urlLower.endsWith(".pdf")) return "pdf";
  if (urlLower.endsWith(".zip")) return "zip";
  if (urlLower.includes("drive.google.com") || urlLower.includes("docs.google.com")) return "drive";
  return "link";
}

// 1. GET /api/semester-qps (Public & Admin)
router.get("/semester-qps", async (req, res) => {
  const { examYear, semester, department, search, isPublished } = req.query;

  try {
    const conditions = [];

    // Public users can only see published QPs. Admins can see all or filter by publish state.
    if (!req.admin) {
      conditions.push(eq(semesterQps.isPublished, true));
    } else if (typeof isPublished === "string" && isPublished !== "all") {
      conditions.push(eq(semesterQps.isPublished, isPublished === "true"));
    }

    if (typeof examYear === "string" && examYear.trim() && examYear !== "all") {
      conditions.push(eq(semesterQps.examYear, examYear.trim()));
    }

    if (typeof semester === "string" && semester.trim() && semester !== "all") {
      conditions.push(eq(semesterQps.semester, semester.trim()));
    }

    if (typeof department === "string" && department.trim() && department !== "all") {
      conditions.push(eq(semesterQps.department, department.trim()));
    }

    if (typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(semesterQps.department, q),
          ilike(semesterQps.title, q),
          ilike(semesterQps.examYear, q),
          ilike(semesterQps.semester, q),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(semesterQps)
      .where(where)
      .orderBy(
        desc(semesterQps.examYear),
        asc(semesterQps.displayOrder),
        asc(semesterQps.semester),
        asc(semesterQps.department),
        desc(semesterQps.createdAt),
      );

    res.json(rows);
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      res.json([]);
      return;
    }
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error fetching semester QPs");
      res.status(500).json({ error: "internal_error", message: "Failed to fetch semester question papers." });
    }
  }
});

// 2. GET /api/semester-qps/:id
router.get("/semester-qps/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  try {
    const [row] = await db.select().from(semesterQps).where(eq(semesterQps.id, id));
    if (!row || (!req.admin && !row.isPublished)) {
      res.status(404).json({ error: "not_found", message: "Question paper not found." });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      res.status(404).json({ error: "not_found", message: "Question paper not found." });
      return;
    }
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to fetch question paper." });
    }
  }
});

// 3. POST /api/semester-qps (Admin only with duplicate protection)
router.post("/semester-qps", requireAdmin, async (req, res) => {
  const { examYear, semester, department, title, downloadUrl, resourceType, isPublished, displayOrder } = req.body ?? {};

  if (!examYear || typeof examYear !== "string" || !examYear.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Exam year is required." });
    return;
  }
  if (!semester || typeof semester !== "string" || !semester.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Semester is required." });
    return;
  }
  if (!department || typeof department !== "string" || !department.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Department/stream is required." });
    return;
  }
  if (!downloadUrl || typeof downloadUrl !== "string" || !downloadUrl.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Download URL is required." });
    return;
  }

  try {
    new URL(downloadUrl.trim());
  } catch {
    res.status(400).json({ error: "invalid_request", message: "Please provide a valid URL." });
    return;
  }

  const cleanYear = examYear.trim();
  const cleanSem = semester.trim();
  const cleanDept = department.trim();
  const cleanUrl = downloadUrl.trim();
  const finalType = inferResourceType(cleanUrl, resourceType);

  try {
    // Duplicate protection check
    const existing = await db
      .select({ id: semesterQps.id })
      .from(semesterQps)
      .where(
        and(
          eq(semesterQps.examYear, cleanYear),
          eq(semesterQps.semester, cleanSem),
          eq(semesterQps.department, cleanDept),
          eq(semesterQps.downloadUrl, cleanUrl),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "duplicate_entry", message: "This Semester QP already exists." });
      return;
    }

    const values = {
      examYear: cleanYear,
      semester: cleanSem,
      department: cleanDept,
      title: typeof title === "string" ? title.trim() : "",
      downloadUrl: cleanUrl,
      resourceType: finalType,
      isPublished: isPublished !== false,
      displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      updatedAt: new Date(),
    };

    const [created] = await db.insert(semesterQps).values(values).returning();
    res.status(201).json(created);
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      const [created] = await db.insert(semesterQps).values({
        examYear: cleanYear,
        semester: cleanSem,
        department: cleanDept,
        title: typeof title === "string" ? title.trim() : "",
        downloadUrl: cleanUrl,
        resourceType: finalType,
        isPublished: isPublished !== false,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(created);
      return;
    }
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error creating semester QP");
      res.status(500).json({ error: "internal_error", message: "Failed to create semester question paper." });
    }
  }
});

// 4. PATCH /api/semester-qps/:id (Admin only)
router.patch("/semester-qps/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  const { examYear, semester, department, title, downloadUrl, resourceType, isPublished, displayOrder } = req.body ?? {};

  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (examYear !== undefined) {
    if (typeof examYear !== "string" || !examYear.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Exam year cannot be empty." });
      return;
    }
    patch.examYear = examYear.trim();
  }

  if (semester !== undefined) {
    if (typeof semester !== "string" || !semester.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Semester cannot be empty." });
      return;
    }
    patch.semester = semester.trim();
  }

  if (department !== undefined) {
    if (typeof department !== "string" || !department.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Department cannot be empty." });
      return;
    }
    patch.department = department.trim();
  }

  if (downloadUrl !== undefined) {
    if (typeof downloadUrl !== "string" || !downloadUrl.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Download URL cannot be empty." });
      return;
    }
    try {
      new URL(downloadUrl.trim());
    } catch {
      res.status(400).json({ error: "invalid_request", message: "Please provide a valid URL." });
      return;
    }
    patch.downloadUrl = downloadUrl.trim();
    if (resourceType === undefined) {
      patch.resourceType = inferResourceType(downloadUrl.trim());
    }
  }

  if (resourceType !== undefined) {
    patch.resourceType = inferResourceType(
      (patch.downloadUrl as string) || "",
      typeof resourceType === "string" ? resourceType : undefined,
    );
  }

  if (title !== undefined) {
    patch.title = typeof title === "string" ? title.trim() : "";
  }

  if (isPublished !== undefined) {
    patch.isPublished = Boolean(isPublished);
  }

  if (displayOrder !== undefined) {
    patch.displayOrder = typeof displayOrder === "number" ? displayOrder : 0;
  }

  try {
    // Check if updating to duplicate of another record
    if (patch.examYear || patch.semester || patch.department || patch.downloadUrl) {
      const [current] = await db.select().from(semesterQps).where(eq(semesterQps.id, id));
      if (current) {
        const checkYear = (patch.examYear as string) || current.examYear;
        const checkSem = (patch.semester as string) || current.semester;
        const checkDept = (patch.department as string) || current.department;
        const checkUrl = (patch.downloadUrl as string) || current.downloadUrl;

        const dup = await db
          .select({ id: semesterQps.id })
          .from(semesterQps)
          .where(
            and(
              eq(semesterQps.examYear, checkYear),
              eq(semesterQps.semester, checkSem),
              eq(semesterQps.department, checkDept),
              eq(semesterQps.downloadUrl, checkUrl),
              sql`${semesterQps.id} != ${id}`,
            ),
          )
          .limit(1);

        if (dup.length > 0) {
          res.status(409).json({ error: "duplicate_entry", message: "This Semester QP already exists." });
          return;
        }
      }
    }

    const [updated] = await db
      .update(semesterQps)
      .set(patch)
      .where(eq(semesterQps.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Question paper not found." });
      return;
    }

    res.json(updated);
  } catch (err: unknown) {
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error updating semester QP");
      res.status(500).json({ error: "internal_error", message: "Failed to update semester question paper." });
    }
  }
});

// 5. DELETE /api/semester-qps/:id (Admin only)
router.delete("/semester-qps/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(semesterQps)
      .where(eq(semesterQps.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Question paper not found." });
      return;
    }

    res.json({ success: true, id: deleted.id });
  } catch (err: unknown) {
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error deleting semester QP");
      res.status(500).json({ error: "internal_error", message: "Failed to delete semester question paper." });
    }
  }
});

export default router;
