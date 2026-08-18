import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, subjects } from "@workspace/db";
import { CreateSubjectBody, ListSubjectsQueryParams, UpdateSubjectBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";

const router: IRouter = Router();

router.get("/subjects", async (req, res) => {
  const parsed = ListSubjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }
  const rows = await db
    .select()
    .from(subjects)
    .where(parsed.data.semesterId !== undefined ? eq(subjects.semesterId, parsed.data.semesterId) : undefined)
    .orderBy(asc(subjects.name));
  res.json(rows);
});

router.post("/subjects", requireAdmin, async (req, res) => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [created] = await db.insert(subjects).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.get("/subjects/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
  if (!subject) {
    res.status(404).json({ error: "not_found", message: "Subject not found." });
    return;
  }
  res.json(subject);
});

router.patch("/subjects/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(subjects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(subjects.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Subject not found." });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.delete("/subjects/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [deleted] = await db.delete(subjects).where(eq(subjects.id, id)).returning({ id: subjects.id });
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Subject not found." });
    return;
  }
  res.status(204).end();
});

export default router;
