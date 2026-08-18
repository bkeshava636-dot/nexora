import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { branches, db, resources } from "@workspace/db";
import { CreateResourceBody, ListResourcesQueryParams, UpdateResourceBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { buildResourceFilters, resourceCatalogSelect } from "../lib/catalog";
import { GOOGLE_DRIVE_URL_ERROR, isValidGoogleDriveUrl } from "../lib/google-drive";

const router: IRouter = Router();

router.get("/resources", async (req, res) => {
  const parsed = ListResourcesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }

  // Resources belonging to disabled branches are unpublished from the public
  // catalog. Authenticated admins retain visibility for moderation.
  const where = req.admin
    ? buildResourceFilters(parsed.data)
    : and(buildResourceFilters(parsed.data), eq(branches.isActive, true));
  const rows = await resourceCatalogSelect().where(where).orderBy(desc(resources.createdAt));
  res.json(rows);
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
  const [resource] = await resourceCatalogSelect().where(
    req.admin
      ? eq(resources.id, id)
      : and(eq(resources.id, id), eq(branches.isActive, true)),
  );
  if (!resource) {
    res.status(404).json({ error: "not_found", message: "Resource not found." });
    return;
  }
  res.json(resource);
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

export default router;
