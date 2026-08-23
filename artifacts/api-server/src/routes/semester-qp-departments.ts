import { Router } from "express";
import { db, semesterQpDepartments, semesterQps } from "@workspace/db";
import { CreateSemesterQpDepartmentBody as DepartmentInput, UpdateSemesterQpDepartmentBody as DepartmentUpdate } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/semester-qp-departments", async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";

  let query = db.select().from(semesterQpDepartments);
  if (!includeInactive) {
    query = query.where(eq(semesterQpDepartments.isActive, true));
  }

  const results = await query.orderBy(desc(semesterQpDepartments.isActive), semesterQpDepartments.name);
  res.json(results);
});

router.post("/semester-qp-departments", requireAdmin, async (req, res) => {
  const parsed = DepartmentInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: parsed.error.message });
    return;
  }

  const existing = await db.select().from(semesterQpDepartments).where(eq(semesterQpDepartments.name, parsed.data.name));
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "Department already exists" });
    return;
  }

  const [created] = await db
    .insert(semesterQpDepartments)
    .values({ name: parsed.data.name, isActive: parsed.data.isActive ?? true })
    .returning();

  res.status(201).json(created);
});

router.patch("/semester-qp-departments/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = DepartmentUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(semesterQpDepartments).where(eq(semesterQpDepartments.id, id));
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "Department not found" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(semesterQpDepartments)
      .set({
        name: parsed.data.name ?? existing.name,
        isActive: parsed.data.isActive ?? existing.isActive,
      })
      .where(eq(semesterQpDepartments.id, id));

    // If renamed, update existing records
    if (parsed.data.name && parsed.data.name !== existing.name) {
      await tx
        .update(semesterQps)
        .set({ department: parsed.data.name })
        .where(eq(semesterQps.department, existing.name));
    }
  });

  const [updated] = await db.select().from(semesterQpDepartments).where(eq(semesterQpDepartments.id, id));
  res.json(updated);
});

export default router;
