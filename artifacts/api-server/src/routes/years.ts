import { Router, type IRouter } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import { db, years } from "@workspace/db";
import { CreateYearBody, ListYearsQueryParams, ReorderYearsBody, UpdateYearBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";

const router: IRouter = Router();

router.get("/years", async (req, res) => {
  const parsed = ListYearsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }
  const rows = await db
    .select()
    .from(years)
    .where(parsed.data.branchId !== undefined ? eq(years.branchId, parsed.data.branchId) : undefined)
    .orderBy(asc(years.displayOrder), asc(years.id));
  res.json(rows);
});

router.post("/years", requireAdmin, async (req, res) => {
  const parsed = CreateYearBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [created] = await db.insert(years).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.post("/years/reorder", requireAdmin, async (req, res) => {
  const parsed = ReorderYearsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  await db.transaction(async (tx) => {
    for (const { id, displayOrder } of parsed.data.order) {
      await tx.update(years).set({ displayOrder, updatedAt: new Date() }).where(eq(years.id, id));
    }
  });
  const ids = parsed.data.order.map((o) => o.id);
  const rows = await db.select().from(years).where(inArray(years.id, ids)).orderBy(asc(years.displayOrder));
  res.json(rows);
});

router.get("/years/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [year] = await db.select().from(years).where(eq(years.id, id));
  if (!year) {
    res.status(404).json({ error: "not_found", message: "Year not found." });
    return;
  }
  res.json(year);
});

router.patch("/years/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = UpdateYearBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(years)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(years.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Year not found." });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.delete("/years/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [deleted] = await db.delete(years).where(eq(years.id, id)).returning({ id: years.id });
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Year not found." });
    return;
  }
  res.status(204).end();
});

export default router;
