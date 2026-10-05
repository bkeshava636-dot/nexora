import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { branches, db, resources, resourceSubjects, subjects, semesters, years } from "@workspace/db";
import { BulkLinkResourcesBody, CreateResourceBody, ListResourcesQueryParams, UpdateResourceBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { buildResourceFilters, resourceCatalogSelect } from "../lib/catalog";
import { GOOGLE_DRIVE_URL_ERROR, isValidGoogleDriveUrl } from "../lib/google-drive";

const router: IRouter = Router();

async function getResourceLinkLocations(resourceId: number) {
  return db
    .select({
      id: resourceSubjects.id,
      resourceId: resourceSubjects.resourceId,
      subjectId: subjects.id,
      subjectName: subjects.name,
      semesterId: semesters.id,
      semesterName: semesters.name,
      yearId: years.id,
      yearName: years.name,
      branchId: branches.id,
      branchName: branches.name,
      branchShortName: branches.shortName,
      isPrimary: eq(resources.subjectId, subjects.id),
      createdAt: resourceSubjects.createdAt,
    })
    .from(resourceSubjects)
    .innerJoin(resources, eq(resourceSubjects.resourceId, resources.id))
    .innerJoin(subjects, eq(resourceSubjects.subjectId, subjects.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(years, eq(semesters.yearId, years.id))
    .innerJoin(branches, eq(years.branchId, branches.id))
    .where(eq(resourceSubjects.resourceId, resourceId))
    .orderBy(asc(branches.displayOrder), asc(years.displayOrder), asc(semesters.displayOrder), asc(subjects.name));
}

async function getResourceLinkLocationsForResources(resourceIds: number[]) {
  if (resourceIds.length === 0) return new Map<number, Awaited<ReturnType<typeof getResourceLinkLocations>>>();
  const rows = await db
    .select({
      id: resourceSubjects.id,
      resourceId: resourceSubjects.resourceId,
      subjectId: subjects.id,
      subjectName: subjects.name,
      semesterId: semesters.id,
      semesterName: semesters.name,
      yearId: years.id,
      yearName: years.name,
      branchId: branches.id,
      branchName: branches.name,
      branchShortName: branches.shortName,
      isPrimary: eq(resources.subjectId, subjects.id),
      createdAt: resourceSubjects.createdAt,
    })
    .from(resourceSubjects)
    .innerJoin(resources, eq(resourceSubjects.resourceId, resources.id))
    .innerJoin(subjects, eq(resourceSubjects.subjectId, subjects.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(years, eq(semesters.yearId, years.id))
    .innerJoin(branches, eq(years.branchId, branches.id))
    .where(inArray(resourceSubjects.resourceId, resourceIds))
    .orderBy(asc(branches.displayOrder), asc(years.displayOrder), asc(semesters.displayOrder), asc(subjects.name));

  const map = new Map<number, typeof rows>();
  for (const row of rows) {
    const arr = map.get(row.resourceId) || [];
    arr.push(row);
    map.set(row.resourceId, arr);
  }
  return map;
}

router.get("/resources", async (req, res) => {
  const parsed = ListResourcesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }

  // Resources belonging to disabled branches are unpublished from the public
  // catalog. Authenticated admins retain visibility for moderation.
  // Resources with no remaining links in resource_subjects are unlinked from the public catalog.
  const where = req.admin
    ? buildResourceFilters(parsed.data)
    : and(
        buildResourceFilters(parsed.data),
        eq(branches.isActive, true),
        sql`EXISTS (SELECT 1 FROM resource_subjects rs WHERE rs.resource_id = ${resources.id})`
      );
  const rows = await resourceCatalogSelect().where(where).orderBy(desc(resources.createdAt));

  // Attach all linked locations (including primary) for each resource
  const locationMap = await getResourceLinkLocationsForResources(rows.map((r) => r.id));
  const result = rows.map((r) => ({
    ...r,
    linkedLocations: locationMap.get(r.id) || [],
  }));

  res.json(result);
});

router.post("/resources", requireAdmin, async (req, res) => {
  const parsed = CreateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  if (!isValidGoogleDriveUrl(parsed.data.googleDriveUrl)) {
    res.status(400).json({ error: "invalid_google_drive_url", message: GOOGLE_DRIVE_URL_ERROR });
    return;
  }
  try {
    const [created] = await db.insert(resources).values(parsed.data).returning();
    if (!created) throw new Error("Insert did not return a row");

    // Immediately link to initial subject
    await db.insert(resourceSubjects).values({
      resourceId: created.id,
      subjectId: created.subjectId,
    }).onConflictDoNothing();

    const [withCatalog] = await resourceCatalogSelect().where(eq(resources.id, created.id));
    res.status(201).json(withCatalog);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.get("/resources/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const where = req.admin
    ? eq(resources.id, id)
    : and(
        eq(resources.id, id),
        eq(branches.isActive, true),
        sql`EXISTS (SELECT 1 FROM resource_subjects rs WHERE rs.resource_id = ${resources.id})`
      );
  const rows = await resourceCatalogSelect().where(where);
  if (rows.length === 0) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }
  const locationMap = await getResourceLinkLocationsForResources([rows[0].id]);
  res.json({
    ...rows[0],
    linkedLocations: locationMap.get(rows[0].id) || [],
  });
});

router.patch("/resources/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = UpdateResourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  if (parsed.data.googleDriveUrl !== undefined && !isValidGoogleDriveUrl(parsed.data.googleDriveUrl)) {
    res.status(400).json({ error: "invalid_google_drive_url", message: GOOGLE_DRIVE_URL_ERROR });
    return;
  }

  // Verification is tracked with an actor + timestamp, not just a flag.
  const patch: typeof parsed.data & { verifiedAt?: Date | null; verifiedBy?: string | null } = {
    ...parsed.data,
  };
  if (parsed.data.isVerified === true) {
    patch.verifiedAt = new Date();
    patch.verifiedBy = req.admin?.username ?? null;
  } else if (parsed.data.isVerified === false) {
    patch.verifiedAt = null;
    patch.verifiedBy = null;
  }

  try {
    const [updated] = await db
      .update(resources)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning({ id: resources.id });
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Resource not found." });
      return;
    }
    const [withCatalog] = await resourceCatalogSelect().where(eq(resources.id, id));
    res.json(withCatalog);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.delete("/resources/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [deleted] = await db.delete(resources).where(eq(resources.id, id)).returning({ id: resources.id });
  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }
  res.status(204).end();
});

// Admin-only: Get all linked locations for a resource
router.get(["/resources/:id/links", "/admin/resources/:id/links"], requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  const [resource] = await db.select().from(resources).where(eq(resources.id, id));
  if (!resource) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }

  const links = await getResourceLinkLocations(id);
  res.json(links);
});

// Admin-only: Link resource to one or more subjects
router.post(["/resources/:id/links", "/admin/resources/:id/links"], requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  const [resource] = await db.select().from(resources).where(eq(resources.id, id));
  if (!resource) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }

  const body = req.body as { subjectId?: number; subjectIds?: number[] };
  const rawIds = Array.isArray(body.subjectIds)
    ? body.subjectIds
    : body.subjectId !== undefined
      ? [body.subjectId]
      : [];

  const targetIds = rawIds.filter((sid) => Number.isInteger(sid) && sid > 0);
  if (targetIds.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "At least one valid subjectId must be provided." });
    return;
  }

  for (const sId of targetIds) {
    const [sub] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, sId));
    if (sub) {
      await db
        .insert(resourceSubjects)
        .values({ resourceId: id, subjectId: sId })
        .onConflictDoNothing();
    }
  }

  // If the resource's current subjectId is not among active linked subjects, point it to the first newly linked subject
  const [hasCurrentSubject] = await db
    .select({ id: resourceSubjects.id })
    .from(resourceSubjects)
    .where(and(eq(resourceSubjects.resourceId, id), eq(resourceSubjects.subjectId, resource.subjectId)))
    .limit(1);

  if (!hasCurrentSubject && targetIds.length > 0) {
    await db
      .update(resources)
      .set({ subjectId: targetIds[0], updatedAt: new Date() })
      .where(eq(resources.id, id));
  }

  const links = await getResourceLinkLocations(id);
  res.status(200).json(links);
});

// Admin-only: Remove a link between a resource and a subject
router.delete(["/resources/:id/links/:subjectId", "/admin/resources/:id/links/:subjectId"], requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const subjectId = Number(req.params.subjectId);
  if (!Number.isInteger(id) || !Number.isInteger(subjectId)) {
    res.status(400).json({ error: "invalid_request", message: "id and subjectId must be integers." });
    return;
  }

  const [resource] = await db.select().from(resources).where(eq(resources.id, id));
  if (!resource) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }

  const [deleted] = await db
    .delete(resourceSubjects)
    .where(and(eq(resourceSubjects.resourceId, id), eq(resourceSubjects.subjectId, subjectId)))
    .returning({ id: resourceSubjects.id });

  if (!deleted) {
    res.status(404).json({ error: "not_found", message: "This resource is not linked to the specified subject." });
    return;
  }

  // If this unlinked subject was the primary resource.subjectId, point it to any remaining linked subject
  if (resource.subjectId === subjectId) {
    const [remaining] = await db
      .select({ subjectId: resourceSubjects.subjectId })
      .from(resourceSubjects)
      .where(eq(resourceSubjects.resourceId, id))
      .limit(1);
    if (remaining) {
      await db
        .update(resources)
        .set({ subjectId: remaining.subjectId, updatedAt: new Date() })
        .where(eq(resources.id, id));
    }
  }

  res.status(204).end();
});

// Admin-only: Bulk link multiple resources to multiple subjects
router.post(["/resources/bulk-links", "/admin/resources/bulk-links"], requireAdmin, async (req, res) => {
  const parsed = BulkLinkResourcesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }

  const { resourceIds, subjectIds } = parsed.data;
  const cleanResourceIds = [...new Set(resourceIds.filter((id) => Number.isInteger(id) && id > 0))];
  const cleanSubjectIds = [...new Set(subjectIds.filter((id) => Number.isInteger(id) && id > 0))];

  if (cleanResourceIds.length === 0 || cleanSubjectIds.length === 0) {
    res.status(400).json({ error: "invalid_request", message: "resourceIds and subjectIds must not be empty." });
    return;
  }

  // Verify resources exist
  const existingResources = await db
    .select({ id: resources.id })
    .from(resources)
    .where(inArray(resources.id, cleanResourceIds));
  const validResourceIds = existingResources.map((r) => r.id);

  if (validResourceIds.length === 0) {
    res.status(400).json({ error: "not_found", message: "No matching resources found." });
    return;
  }

  // Verify subjects exist
  const existingSubjects = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(inArray(subjects.id, cleanSubjectIds));
  const validSubjectIds = existingSubjects.map((s) => s.id);

  if (validSubjectIds.length === 0) {
    res.status(400).json({ error: "not_found", message: "No matching subjects found." });
    return;
  }

  // Query existing links to compute created vs alreadyLinked accurately
  const existingLinks = await db
    .select({ resourceId: resourceSubjects.resourceId, subjectId: resourceSubjects.subjectId })
    .from(resourceSubjects)
    .where(
      and(
        inArray(resourceSubjects.resourceId, validResourceIds),
        inArray(resourceSubjects.subjectId, validSubjectIds)
      )
    );

  const existingSet = new Set(existingLinks.map((l) => `${l.resourceId}:${l.subjectId}`));
  const toInsert: { resourceId: number; subjectId: number }[] = [];

  for (const rId of validResourceIds) {
    for (const sId of validSubjectIds) {
      if (!existingSet.has(`${rId}:${sId}`)) {
        toInsert.push({ resourceId: rId, subjectId: sId });
      }
    }
  }

  if (toInsert.length > 0) {
    await db.insert(resourceSubjects).values(toInsert).onConflictDoNothing();
  }

  const totalRequestedPairs = validResourceIds.length * validSubjectIds.length;
  res.status(200).json({
    processed: validResourceIds.length,
    created: toInsert.length,
    alreadyLinked: totalRequestedPairs - toInsert.length,
  });
});

export default router;
