import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, reports, resources } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";

const router: IRouter = Router();

export const reportReasons = [
  "Broken link",
  "Wrong subject",
  "Wrong branch/year/semester",
  "Duplicate resource",
  "Incorrect content",
  "Other",
] as const;

router.post("/reports", async (req, res) => {
  const { resourceId, reason, explanation } = req.body ?? {};

  const idNum = Number(resourceId);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    res.status(400).json({
      error: "invalid_request",
      message: "resourceId must be a positive integer.",
    });
    return;
  }

  if (typeof reason !== "string" || !reportReasons.includes(reason as (typeof reportReasons)[number])) {
    res.status(400).json({
      error: "invalid_request",
      message: "Please select a valid report reason.",
    });
    return;
  }

  const expTrimmed = typeof explanation === "string" ? explanation.trim() : "";
  if (reason === "Other" && !expTrimmed) {
    res.status(400).json({
      error: "invalid_request",
      message: "Please provide a short explanation when selecting 'Other'.",
    });
    return;
  }

  const [resource] = await db.select().from(resources).where(eq(resources.id, idNum));
  if (!resource) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }

  try {
    const [created] = await db
      .insert(reports)
      .values({
        resourceId: idNum,
        reason,
        explanation: expTrimmed || null,
        status: "pending",
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.get("/reports", requireAdmin, async (req, res) => {
  const status = typeof req.query["status"] === "string" ? req.query["status"] : undefined;

  const rows = await db
    .select({
      id: reports.id,
      resourceId: reports.resourceId,
      reason: reports.reason,
      explanation: reports.explanation,
      status: reports.status,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      resolvedBy: reports.resolvedBy,
      resourceTitle: resources.title,
      resourceType: resources.resourceType,
      googleDriveUrl: resources.googleDriveUrl,
    })
    .from(reports)
    .leftJoin(resources, eq(reports.resourceId, resources.id))
    .where(status && status !== "all" ? eq(reports.status, status) : undefined)
    .orderBy(desc(reports.createdAt));

  res.json(rows);
});

router.post("/reports/:id/resolve", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const [updated] = await db
      .update(reports)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: req.admin?.username ?? null,
      })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Report not found." });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.post("/reports/:id/dismiss", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const [updated] = await db
      .update(reports)
      .set({
        status: "dismissed",
        resolvedAt: new Date(),
        resolvedBy: req.admin?.username ?? null,
      })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Report not found." });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

export default router;
