import { Router, type IRouter } from "express";
import { asc, eq, inArray } from "drizzle-orm";
import { db, branches } from "@workspace/db";
import {
  CreateBranchBody,
  ListBranchesQueryParams,
  ReorderBranchesBody,
  UpdateBranchBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { getBranchWithCounts, listBranchesWithCounts, withBranchCounts } from "../lib/catalog";
import { handleDbError } from "../lib/db-errors";

const router: IRouter = Router();

router.get("/branches", async (req, res) => {
  const parsed = ListBranchesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }
  // includeInactive is only honored for authenticated admins — the public
  // catalog should never reveal disabled branches, regardless of what the
  // client requests.
  const includeInactive = Boolean(parsed.data.includeInactive) && Boolean(req.admin);
  const result = await listBranchesWithCounts(includeInactive);
  res.json(result);
});

router.post("/branches", requireAdmin, async (req, res) => {
  const parsed = CreateBranchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }

  try {
    const [created] = await db.insert(branches).values(parsed.data).returning();
    if (!created) throw new Error("Insert did not return a row");
    const withCounts = await getBranchWithCounts(created.id);
    res.status(201).json(withCounts);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.post("/branches/reorder", requireAdmin, async (req, res) => {
  const parsed = ReorderBranchesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }

  await db.transaction(async (tx) => {
    for (const { id, displayOrder } of parsed.data.order) {
      await tx.update(branches).set({ displayOrder, updatedAt: new Date() }).where(eq(branches.id, id));
    }
  });

  const ids = parsed.data.order.map((o) => o.id);
  const rows = await db.select().from(branches).where(inArray(branches.id, ids)).orderBy(asc(branches.displayOrder));
  res.json(await withBranchCounts(rows));
});

router.get("/branches/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const branch = await getBranchWithCounts(id);
  // A disabled branch is intentionally absent from the public catalog. Admins
  // may still retrieve it to re-enable or otherwise manage it.
  if (!branch || (!branch.isActive && !req.admin)) {
    res.status(404).json({ error: "not_found", message: "Branch not found." });
    return;
  }
  res.json(branch);
});

router.patch("/branches/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = UpdateBranchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }

  try {
    const [updated] = await db
      .update(branches)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Branch not found." });
      return;
    }
    res.json(await getBranchWithCounts(id));
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.delete("/branches/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [deleted] = await db.delete(branches).where(eq(branches.id, id)).returning({ id: branches.id });
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Branch not found." });
    return;
  }
  res.status(204).end();
});

export default router;
