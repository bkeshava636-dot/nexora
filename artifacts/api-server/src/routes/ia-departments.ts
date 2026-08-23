import { Router } from "express";
import { db, iaDepartments, iaPapers } from "@workspace/db";
import { CreateIaDepartmentBody as DepartmentInput, UpdateIaDepartmentBody as DepartmentUpdate } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/ia-departments", async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";

  let results;
  if (!includeInactive) {
    results = await db.select().from(iaDepartments).where(eq(iaDepartments.isActive, true)).orderBy(desc(iaDepartments.isActive), iaDepartments.name);
  } else {
    results = await db.select().from(iaDepartments).orderBy(desc(iaDepartments.isActive), iaDepartments.name);
  }

  res.json(results);
});

router.post("/ia-departments", requireAdmin, async (req, res) => {
  const parsed = DepartmentInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: parsed.error.message });
    return;
  }

  const existing = await db.select().from(iaDepartments).where(eq(iaDepartments.name, parsed.data.name));
  if (existing.length > 0) {
    res.status(409).json({ error: "conflict", message: "Department already exists" });
    return;
  }

  const [created] = await db
    .insert(iaDepartments)
    .values({ name: parsed.data.name, isActive: parsed.data.isActive ?? true })
    .returning();

  res.status(201).json(created);
});

router.patch("/ia-departments/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  const parsed = DepartmentUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(iaDepartments).where(eq(iaDepartments.id, id));
  if (!existing) {
    res.status(404).json({ error: "not_found", message: "Department not found" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(iaDepartments)
      .set({
        name: parsed.data.name ?? existing.name,
        isActive: parsed.data.isActive ?? existing.isActive,
      })
      .where(eq(iaDepartments.id, id));

    // If renamed, update existing records
    if (parsed.data.name && parsed.data.name !== existing.name) {
      await tx
        .update(iaPapers)
        .set({ department: parsed.data.name })
        .where(eq(iaPapers.department, existing.name));
    }
  });

  const [updated] = await db.select().from(iaDepartments).where(eq(iaDepartments.id, id));
  res.json(updated);
});

export default router;
