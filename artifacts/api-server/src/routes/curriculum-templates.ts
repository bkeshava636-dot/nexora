import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  branches,
  curriculumTemplates,
  curriculumTemplateSubjects,
  db,
  semesters,
  subjects,
  years,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Helper to query a template with all joined metadata and subjects
async function getFullTemplate(templateId: number) {
  const [template] = await db
    .select({
      id: curriculumTemplates.id,
      branchId: curriculumTemplates.branchId,
      yearId: curriculumTemplates.yearId,
      semesterId: curriculumTemplates.semesterId,
      name: curriculumTemplates.name,
      createdAt: curriculumTemplates.createdAt,
      updatedAt: curriculumTemplates.updatedAt,
      branchName: branches.name,
      branchShortName: branches.shortName,
      yearName: years.name,
      semesterName: semesters.name,
    })
    .from(curriculumTemplates)
    .innerJoin(branches, eq(curriculumTemplates.branchId, branches.id))
    .innerJoin(years, eq(curriculumTemplates.yearId, years.id))
    .innerJoin(semesters, eq(curriculumTemplates.semesterId, semesters.id))
    .where(eq(curriculumTemplates.id, templateId));

  if (!template) return null;

  const templateSubjects = await db
    .select()
    .from(curriculumTemplateSubjects)
    .where(eq(curriculumTemplateSubjects.templateId, templateId))
    .orderBy(
      asc(curriculumTemplateSubjects.displayOrder),
      asc(curriculumTemplateSubjects.id),
    );

  return {
    ...template,
    subjects: templateSubjects,
    subjectCount: templateSubjects.length,
  };
}

// 1. List all templates
router.get("/curriculum-templates", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: curriculumTemplates.id,
        branchId: curriculumTemplates.branchId,
        yearId: curriculumTemplates.yearId,
        semesterId: curriculumTemplates.semesterId,
        name: curriculumTemplates.name,
        createdAt: curriculumTemplates.createdAt,
        updatedAt: curriculumTemplates.updatedAt,
        branchName: branches.name,
        branchShortName: branches.shortName,
        yearName: years.name,
        semesterName: semesters.name,
      })
      .from(curriculumTemplates)
      .innerJoin(branches, eq(curriculumTemplates.branchId, branches.id))
      .innerJoin(years, eq(curriculumTemplates.yearId, years.id))
      .innerJoin(semesters, eq(curriculumTemplates.semesterId, semesters.id))
      .orderBy(
        asc(branches.displayOrder),
        asc(years.displayOrder),
        asc(semesters.displayOrder),
        asc(curriculumTemplates.id),
      );

    const allSubjects = await db
      .select()
      .from(curriculumTemplateSubjects)
      .orderBy(
        asc(curriculumTemplateSubjects.displayOrder),
        asc(curriculumTemplateSubjects.id),
      );

    const subjectsByTemplate = new Map<number, typeof allSubjects>();
    for (const sub of allSubjects) {
      const list = subjectsByTemplate.get(sub.templateId) ?? [];
      list.push(sub);
      subjectsByTemplate.set(sub.templateId, list);
    }

    const result = rows.map((tpl) => {
      const tplSubs = subjectsByTemplate.get(tpl.id) ?? [];
      return {
        ...tpl,
        subjects: tplSubs,
        subjectCount: tplSubs.length,
      };
    });

    res.json(result);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "42P01") {
      logger.warn("curriculum_templates relation does not exist in DB yet. Returning empty list.");
      res.json([]);
      return;
    }
    if (!handleDbError(err, res)) throw err;
  }
});

// 2. Create template
router.post("/curriculum-templates", requireAdmin, async (req, res) => {
  const { branchId, yearId, semesterId, name } = req.body || {};

  if (!branchId || !yearId || !semesterId) {
    res.status(400).json({
      error: "invalid_request",
      message: "branchId, yearId, and semesterId are required.",
    });
    return;
  }

  try {
    const [existingExact] = await db
      .select()
      .from(curriculumTemplates)
      .where(
        eq(curriculumTemplates.semesterId, Number(semesterId)),
      );

    if (existingExact) {
      res.status(409).json({
        error: "duplicate_template",
        message: "A curriculum template for this semester already exists.",
      });
      return;
    }

    const [created] = await db
      .insert(curriculumTemplates)
      .values({
        branchId: Number(branchId),
        yearId: Number(yearId),
        semesterId: Number(semesterId),
        name: typeof name === "string" ? name.trim() : "",
      })
      .returning();

    if (!created) throw new Error("Failed to create curriculum template");

    const full = await getFullTemplate(created.id);
    res.status(201).json(full);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// 3. Get single template
router.get("/curriculum-templates/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const full = await getFullTemplate(id);
    if (!full) {
      res.status(404).json({ error: "not_found", message: "Curriculum template not found." });
      return;
    }
    res.json(full);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// 4. Update template
router.patch("/curriculum-templates/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  const { name } = req.body || {};

  try {
    const [updated] = await db
      .update(curriculumTemplates)
      .set({
        name: typeof name === "string" ? name.trim() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(curriculumTemplates.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Curriculum template not found." });
      return;
    }

    const full = await getFullTemplate(id);
    res.json(full);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// 5. Delete template
router.delete("/curriculum-templates/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(curriculumTemplates)
      .where(eq(curriculumTemplates.id, id))
      .returning({ id: curriculumTemplates.id });

    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Curriculum template not found." });
      return;
    }

    res.status(204).end();
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// 6. Add subject to template
router.post("/curriculum-templates/:id/subjects", requireAdmin, async (req, res) => {
  const templateId = Number(req.params.id);
  if (!Number.isInteger(templateId)) {
    res.status(400).json({ error: "invalid_request", message: "template id must be an integer." });
    return;
  }

  const { name, code, description, displayOrder } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Subject name is required." });
    return;
  }

  try {
    const [template] = await db
      .select()
      .from(curriculumTemplates)
      .where(eq(curriculumTemplates.id, templateId));

    if (!template) {
      res.status(404).json({ error: "not_found", message: "Curriculum template not found." });
      return;
    }

    const existingSubjects = await db
      .select()
      .from(curriculumTemplateSubjects)
      .where(eq(curriculumTemplateSubjects.templateId, templateId));

    const order = typeof displayOrder === "number" ? displayOrder : existingSubjects.length;

    const [created] = await db
      .insert(curriculumTemplateSubjects)
      .values({
        templateId,
        name: name.trim(),
        code: typeof code === "string" ? code.trim() : "",
        description: typeof description === "string" ? description.trim() : "",
        displayOrder: order,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// 7. Update subject in template
router.patch(
  "/curriculum-templates/:id/subjects/:subjectId",
  requireAdmin,
  async (req, res) => {
    const templateId = Number(req.params.id);
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(templateId) || !Number.isInteger(subjectId)) {
      res.status(400).json({ error: "invalid_request", message: "ids must be integers." });
      return;
    }

    const { name, code, description, displayOrder } = req.body || {};

    try {
      const [updated] = await db
        .update(curriculumTemplateSubjects)
        .set({
          name: typeof name === "string" ? name.trim() : undefined,
          code: typeof code === "string" ? code.trim() : undefined,
          description: typeof description === "string" ? description.trim() : undefined,
          displayOrder: typeof displayOrder === "number" ? displayOrder : undefined,
          updatedAt: new Date(),
        })
        .where(
          eq(curriculumTemplateSubjects.id, subjectId),
        )
        .returning();

      if (!updated) {
        res.status(404).json({ error: "not_found", message: "Template subject not found." });
        return;
      }

      res.json(updated);
    } catch (err) {
      if (!handleDbError(err, res)) throw err;
    }
  },
);

// 8. Delete subject from template
router.delete(
  "/curriculum-templates/:id/subjects/:subjectId",
  requireAdmin,
  async (req, res) => {
    const templateId = Number(req.params.id);
    const subjectId = Number(req.params.subjectId);
    if (!Number.isInteger(templateId) || !Number.isInteger(subjectId)) {
      res.status(400).json({ error: "invalid_request", message: "ids must be integers." });
      return;
    }

    try {
      const [deleted] = await db
        .delete(curriculumTemplateSubjects)
        .where(eq(curriculumTemplateSubjects.id, subjectId))
        .returning({ id: curriculumTemplateSubjects.id });

      if (!deleted) {
        res.status(404).json({ error: "not_found", message: "Template subject not found." });
        return;
      }

      res.status(204).end();
    } catch (err) {
      if (!handleDbError(err, res)) throw err;
    }
  },
);

// 9. Reorder template subjects
router.post(
  "/curriculum-templates/:id/subjects/reorder",
  requireAdmin,
  async (req, res) => {
    const templateId = Number(req.params.id);
    if (!Number.isInteger(templateId)) {
      res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
      return;
    }

    const { order } = req.body || {};
    if (!Array.isArray(order)) {
      res.status(400).json({ error: "invalid_request", message: "order array is required." });
      return;
    }

    try {
      await db.transaction(async (tx) => {
        for (const item of order) {
          if (item && typeof item.id === "number" && typeof item.displayOrder === "number") {
            await tx
              .update(curriculumTemplateSubjects)
              .set({ displayOrder: item.displayOrder, updatedAt: new Date() })
              .where(eq(curriculumTemplateSubjects.id, item.id));
          }
        }
      });

      const updatedSubjects = await db
        .select()
        .from(curriculumTemplateSubjects)
        .where(eq(curriculumTemplateSubjects.templateId, templateId))
        .orderBy(asc(curriculumTemplateSubjects.displayOrder));

      res.json(updatedSubjects);
    } catch (err) {
      if (!handleDbError(err, res)) throw err;
    }
  },
);

// 10. Apply template: creates catalog subjects for the template semester safely without duplicates
router.post(
  "/curriculum-templates/:id/apply",
  requireAdmin,
  async (req, res) => {
    const templateId = Number(req.params.id);
    if (!Number.isInteger(templateId)) {
      res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
      return;
    }

    try {
      const [template] = await db
        .select()
        .from(curriculumTemplates)
        .where(eq(curriculumTemplates.id, templateId));

      if (!template) {
        res.status(404).json({ error: "not_found", message: "Curriculum template not found." });
        return;
      }

      const templateSubjects = await db
        .select()
        .from(curriculumTemplateSubjects)
        .where(eq(curriculumTemplateSubjects.templateId, templateId))
        .orderBy(asc(curriculumTemplateSubjects.displayOrder));

      if (templateSubjects.length === 0) {
        res.status(400).json({
          error: "empty_template",
          message: "This template has no subjects to apply.",
        });
        return;
      }

      // Check existing catalog subjects for this semester
      const existingCatalogSubjects = await db
        .select()
        .from(subjects)
        .where(eq(subjects.semesterId, template.semesterId));

      const existingNames = new Set(
        existingCatalogSubjects.map((s) => s.name.trim().toLowerCase()),
      );

      let appliedCount = 0;
      let skippedCount = 0;

      await db.transaction(async (tx) => {
        for (const tplSub of templateSubjects) {
          const normalized = tplSub.name.trim().toLowerCase();
          if (existingNames.has(normalized)) {
            skippedCount++;
          } else {
            const desc = tplSub.code
              ? (tplSub.description ? `${tplSub.code} · ${tplSub.description}` : tplSub.code)
              : tplSub.description;

            await tx.insert(subjects).values({
              semesterId: template.semesterId,
              name: tplSub.name.trim(),
              description: desc,
            });
            appliedCount++;
            existingNames.add(normalized);
          }
        }
      });

      res.json({
        success: true,
        appliedCount,
        skippedCount,
        totalTemplateSubjects: templateSubjects.length,
        message:
          appliedCount > 0
            ? `Successfully created ${appliedCount} subject(s) in catalog.${skippedCount > 0 ? ` (${skippedCount} existing subject(s) were skipped to avoid duplicates).` : ""}`
            : `All ${skippedCount} subject(s) already exist in the catalog for this semester. No changes needed.`,
      });
    } catch (err) {
      if (!handleDbError(err, res)) throw err;
    }
  },
);

export default router;
