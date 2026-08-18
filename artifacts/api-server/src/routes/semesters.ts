import { Router, type IRouter } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import { db, semesters } from "@workspace/db";
import {
  CreateSemesterBody,
  ListSemestersQueryParams,
  ReorderSemestersBody,
  UpdateSemesterBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";

const router: IRouter = Router();

router.get("/semesters", async (req, res) => {
  const parsed = ListSemestersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }
  const rows = await db
    .select()
    .from(semesters)
    .where(parsed.data.yearId !== undefined ? eq(semesters.yearId, parsed.data.yearId) : undefined)
    .orderBy(asc(semesters.displayOrder), asc(semesters.id));
  res.json(rows);
});

router.post("/semesters", requireAdmin, async (req, res) => {
  const parsed = CreateSemesterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [created] = await db.insert(semesters).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.post("/semesters/reorder", requireAdmin, async (req, res) => {
  const parsed = ReorderSemestersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  await db.transaction(async (tx) => {
    for (const { id, displayOrder } of parsed.data.order) {
      await tx.update(semesters).set({ displayOrder, updatedAt: new Date() }).where(eq(semesters.id, id));
    }
  });
  const ids = parsed.data.order.map((o) => o.id);
  const rows = await db
    .select()
    .from(semesters)
    .where(inArray(semesters.id, ids))
    .orderBy(asc(semesters.displayOrder));
  res.json(rows);
});

router.get("/semesters/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [semester] = await db.select().from(semesters).where(eq(semesters.id, id));
  if (!semester) {
    res.status(404).json({ error: "not_found", message: "Semester not found." });
    return;
  }
  res.json(semester);
});

router.patch("/semesters/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = UpdateSemesterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(semesters)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(semesters.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Semester not found." });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.delete("/semesters/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [deleted] = await db.delete(semesters).where(eq(semesters.id, id)).returning({ id: semesters.id });
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Semester not found." });
    return;
  }
  res.status(204).end();
});

export default router;
