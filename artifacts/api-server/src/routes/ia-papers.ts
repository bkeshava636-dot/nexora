import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, ensureTables, iaPapers } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { isValidGoogleDriveUrl, GOOGLE_DRIVE_URL_ERROR } from "../lib/google-drive";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// 1. GET /api/ia-papers (Public & Admin)
router.get("/ia-papers", async (req, res) => {
  const { academicYear, semester, department, iaType, search, isPublished } = req.query;

  try {
    const conditions = [];

    // Public users can only see published IA papers. Admins can see all or filter.
    if (!req.admin) {
      conditions.push(eq(iaPapers.isPublished, true));
    } else if (typeof isPublished === "string" && isPublished !== "all") {
      conditions.push(eq(iaPapers.isPublished, isPublished === "true"));
    }

    if (typeof academicYear === "string" && academicYear.trim() && academicYear.trim().toLowerCase() !== "all") {
      conditions.push(eq(iaPapers.academicYear, academicYear.trim()));
    }

    if (typeof semester === "string" && semester.trim() && semester.trim().toLowerCase() !== "all") {
      conditions.push(eq(iaPapers.semester, semester.trim()));
    }

    if (typeof department === "string" && department.trim() && department.trim().toLowerCase() !== "all") {
      conditions.push(eq(iaPapers.department, department.trim()));
    }

    if (typeof iaType === "string" && iaType.trim() && iaType.trim().toLowerCase() !== "all") {
      conditions.push(eq(iaPapers.iaType, iaType.trim()));
    }

    if (typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(iaPapers.department, q),
          ilike(iaPapers.title, q),
          ilike(iaPapers.academicYear, q),
          ilike(iaPapers.semester, q),
          ilike(iaPapers.iaType, q),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(iaPapers)
      .where(where)
      .orderBy(
        asc(iaPapers.academicYear),
        asc(iaPapers.semester),
        asc(iaPapers.department),
        asc(iaPapers.iaType),
        asc(iaPapers.displayOrder),
        desc(iaPapers.createdAt),
      );

    res.json(rows);
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01" || pgErr?.code === "42703") {
      try {
        await ensureTables();
        const retryRows = await db
          .select()
          .from(iaPapers)
          .where(eq(iaPapers.isPublished, true))
          .orderBy(
            asc(iaPapers.academicYear),
            asc(iaPapers.semester),
            asc(iaPapers.department),
            asc(iaPapers.iaType),
            asc(iaPapers.displayOrder),
            desc(iaPapers.createdAt),
          );
        res.json(retryRows);
        return;
      } catch (retryErr) {
        logger.error({ retryErr }, "Retry IA fetch after table creation failed");
      }
    }
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error fetching IA papers");
      res.status(500).json({ error: "internal_error", message: "Failed to fetch internal assessment papers." });
    }
  }
});

// 2. GET /api/ia-papers/:id
router.get("/ia-papers/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  try {
    const [row] = await db.select().from(iaPapers).where(eq(iaPapers.id, id));
    if (!row || (!req.admin && !row.isPublished)) {
      res.status(404).json({ error: "not_found", message: "Internal assessment paper not found." });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      res.status(404).json({ error: "not_found", message: "Internal assessment paper not found." });
      return;
    }
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to fetch internal assessment paper." });
    }
  }
});

// 3. POST /api/ia-papers (Admin only with duplicate protection)
router.post("/ia-papers", requireAdmin, async (req, res) => {
  const { academicYear, semester, department, iaType, title, googleDriveUrl, isPublished, displayOrder } = req.body ?? {};

  if (!academicYear || typeof academicYear !== "string" || !academicYear.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Academic year is required." });
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
  if (!googleDriveUrl || typeof googleDriveUrl !== "string" || !googleDriveUrl.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Google Drive URL is required." });
    return;
  }

  if (!isValidGoogleDriveUrl(googleDriveUrl)) {
    res.status(400).json({ error: "invalid_request", message: GOOGLE_DRIVE_URL_ERROR });
    return;
  }

  const cleanYear = academicYear.trim();
  const cleanSem = semester.trim();
  const cleanDept = department.trim();
  const cleanIaType = typeof iaType === "string" && iaType.trim() ? iaType.trim() : "IA-1";
  const cleanUrl = googleDriveUrl.trim();

  try {
    // Duplicate protection check
    const existing = await db
      .select({ id: iaPapers.id })
      .from(iaPapers)
      .where(
        and(
          eq(iaPapers.academicYear, cleanYear),
          eq(iaPapers.semester, cleanSem),
          eq(iaPapers.department, cleanDept),
          eq(iaPapers.iaType, cleanIaType),
          eq(iaPapers.googleDriveUrl, cleanUrl),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "duplicate_entry", message: "This Internal Assessment paper already exists." });
      return;
    }

    const values = {
      academicYear: cleanYear,
      semester: cleanSem,
      department: cleanDept,
      iaType: cleanIaType,
      title: typeof title === "string" ? title.trim() : "",
      googleDriveUrl: cleanUrl,
      isPublished: isPublished !== false,
      displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      updatedAt: new Date(),
    };

    const [created] = await db.insert(iaPapers).values(values).returning();
    res.status(201).json(created);
  } catch (err: unknown) {
    const pgErr = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgErr?.code === "42P01") {
      await ensureTables();
      const [created] = await db.insert(iaPapers).values({
        academicYear: cleanYear,
        semester: cleanSem,
        department: cleanDept,
        iaType: cleanIaType,
        title: typeof title === "string" ? title.trim() : "",
        googleDriveUrl: cleanUrl,
        isPublished: isPublished !== false,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
        updatedAt: new Date(),
      }).returning();
      res.status(201).json(created);
      return;
    }
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error creating IA paper");
      res.status(500).json({ error: "internal_error", message: "Failed to create internal assessment paper." });
    }
  }
});

// 4. PATCH /api/ia-papers/:id (Admin only)
router.patch("/ia-papers/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  const { academicYear, semester, department, iaType, title, googleDriveUrl, isPublished, displayOrder } = req.body ?? {};

  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (academicYear !== undefined) {
    if (typeof academicYear !== "string" || !academicYear.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Academic year cannot be empty." });
      return;
    }
    patch.academicYear = academicYear.trim();
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

  if (iaType !== undefined) {
    if (typeof iaType !== "string" || !iaType.trim()) {
      res.status(400).json({ error: "invalid_request", message: "IA type cannot be empty." });
      return;
    }
    patch.iaType = iaType.trim();
  }

  if (googleDriveUrl !== undefined) {
    if (typeof googleDriveUrl !== "string" || !googleDriveUrl.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Google Drive URL cannot be empty." });
      return;
    }
    if (!isValidGoogleDriveUrl(googleDriveUrl)) {
      res.status(400).json({ error: "invalid_request", message: GOOGLE_DRIVE_URL_ERROR });
      return;
    }
    patch.googleDriveUrl = googleDriveUrl.trim();
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
    // Check duplicate collision against other records
    if (patch.academicYear || patch.semester || patch.department || patch.iaType || patch.googleDriveUrl) {
      const [current] = await db.select().from(iaPapers).where(eq(iaPapers.id, id));
      if (current) {
        const checkYear = (patch.academicYear as string) || current.academicYear;
        const checkSem = (patch.semester as string) || current.semester;
        const checkDept = (patch.department as string) || current.department;
        const checkIaType = (patch.iaType as string) || current.iaType;
        const checkUrl = (patch.googleDriveUrl as string) || current.googleDriveUrl;

        const dup = await db
          .select({ id: iaPapers.id })
          .from(iaPapers)
          .where(
            and(
              eq(iaPapers.academicYear, checkYear),
              eq(iaPapers.semester, checkSem),
              eq(iaPapers.department, checkDept),
              eq(iaPapers.iaType, checkIaType),
              eq(iaPapers.googleDriveUrl, checkUrl),
              sql`${iaPapers.id} != ${id}`,
            ),
          )
          .limit(1);

        if (dup.length > 0) {
          res.status(409).json({ error: "duplicate_entry", message: "This Internal Assessment paper already exists." });
          return;
        }
      }
    }

    const [updated] = await db
      .update(iaPapers)
      .set(patch)
      .where(eq(iaPapers.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Internal assessment paper not found." });
      return;
    }

    res.json(updated);
  } catch (err: unknown) {
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error updating IA paper");
      res.status(500).json({ error: "internal_error", message: "Failed to update internal assessment paper." });
    }
  }
});

// 5. DELETE /api/ia-papers/:id (Admin only)
router.delete("/ia-papers/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "invalid_request", message: "id must be a positive integer." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(iaPapers)
      .where(eq(iaPapers.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Internal assessment paper not found." });
      return;
    }

    res.json({ success: true, id: deleted.id });
  } catch (err: unknown) {
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error deleting IA paper");
      res.status(500).json({ error: "internal_error", message: "Failed to delete internal assessment paper." });
    }
  }
});

export default router;
