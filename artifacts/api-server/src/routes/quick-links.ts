import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db, ensureTables, importantLinks } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// 1. GET /api/quick-links and /api/admin/quick-links
const handleListQuickLinks = async (req: any, res: any) => {
  const { category, search, isActive } = req.query;

  try {
    const conditions = [];

    // Public users can only see active links. Admins can see all or filter.
    if (!req.admin) {
      conditions.push(eq(importantLinks.isActive, true));
    } else if (typeof isActive === "string" && isActive !== "all") {
      conditions.push(eq(importantLinks.isActive, isActive === "true"));
    }

    if (typeof category === "string" && category.trim() && category.trim().toLowerCase() !== "all") {
      conditions.push(eq(importantLinks.category, category.trim()));
    }

    if (typeof search === "string" && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(importantLinks.title, q),
          ilike(importantLinks.description, q),
          ilike(importantLinks.category, q),
          ilike(importantLinks.url, q),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(importantLinks)
      .where(where)
      .orderBy(
        asc(importantLinks.displayOrder),
        desc(importantLinks.createdAt),
      );

    res.json(rows);
  } catch (err: unknown) {
    const pgError = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgError?.code === "42P01") {
      // Table not created yet
      await ensureTables();
      res.json([]);
      return;
    }
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error fetching quick links");
      res.status(500).json({ error: "internal_error", message: "Failed to fetch quick links." });
    }
  }
};

router.get("/quick-links", handleListQuickLinks);
router.get("/admin/quick-links", handleListQuickLinks);

// 2. GET /api/quick-links/:id and /api/admin/quick-links/:id
const handleGetQuickLink = async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const [item] = await db
      .select()
      .from(importantLinks)
      .where(eq(importantLinks.id, id));

    if (!item) {
      res.status(404).json({ error: "not_found", message: "Quick link not found." });
      return;
    }

    if (!req.admin && !item.isActive) {
      res.status(404).json({ error: "not_found", message: "Quick link not found." });
      return;
    }

    res.json(item);
  } catch (err) {
    if (!handleDbError(err, res)) {
      logger.error({ err }, "Error fetching quick link");
      res.status(500).json({ error: "internal_error", message: "Failed to fetch quick link." });
    }
  }
};

router.get("/quick-links/:id", handleGetQuickLink);
router.get("/admin/quick-links/:id", handleGetQuickLink);

// 3. POST /api/quick-links and /api/admin/quick-links (Admin only)
const handleCreateQuickLink = async (req: any, res: any) => {
  const { title, description, url, category, icon, displayOrder, isActive } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "invalid_request", message: "Title cannot be empty." });
    return;
  }

  if (typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "invalid_request", message: "URL cannot be empty." });
    return;
  }

  const trimmedUrl = url.trim();
  if (!isValidHttpUrl(trimmedUrl)) {
    res.status(400).json({ error: "invalid_request", message: "URL must be a valid HTTP or HTTPS address." });
    return;
  }

  const trimmedCategory = typeof category === "string" && category.trim() ? category.trim() : "Other";
  const numDisplayOrder = typeof displayOrder === "number" && Number.isInteger(displayOrder) ? displayOrder : 0;
  const boolIsActive = typeof isActive === "boolean" ? isActive : true;

  try {
    try {
      const [created] = await db
        .insert(importantLinks)
        .values({
          title: title.trim(),
          description: typeof description === "string" && description.trim() ? description.trim() : null,
          url: trimmedUrl,
          category: trimmedCategory,
          icon: typeof icon === "string" && icon.trim() ? icon.trim() : null,
          displayOrder: numDisplayOrder,
          isActive: boolIsActive,
        })
        .returning();

      res.status(201).json(created);
    } catch (insertErr: unknown) {
      const pgErr = (insertErr as { cause?: { code?: string }; code?: string })?.cause || (insertErr as { code?: string });
      if (pgErr?.code === "42P01") {
        await ensureTables();
        const [created] = await db
          .insert(importantLinks)
          .values({
            title: title.trim(),
            description: typeof description === "string" && description.trim() ? description.trim() : null,
            url: trimmedUrl,
            category: trimmedCategory,
            icon: typeof icon === "string" && icon.trim() ? icon.trim() : null,
            displayOrder: numDisplayOrder,
            isActive: boolIsActive,
          })
          .returning();

        res.status(201).json(created);
        return;
      }
      throw insertErr;
    }
  } catch (err) {
    logger.error({ err }, "Failed to create quick link");
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to create quick link." });
    }
  }
};

router.post("/quick-links", requireAdmin, handleCreateQuickLink);
router.post("/admin/quick-links", requireAdmin, handleCreateQuickLink);

// 4. PUT / PATCH /api/quick-links/:id and /api/admin/quick-links/:id (Admin only)
const handleUpdateQuickLink = async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  const { title, description, url, category, icon, displayOrder, isActive } = req.body || {};

  const updateData: Partial<typeof importantLinks.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Title cannot be empty." });
      return;
    }
    updateData.title = title.trim();
  }

  if (url !== undefined) {
    if (typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "invalid_request", message: "URL cannot be empty." });
      return;
    }
    const trimmedUrl = url.trim();
    if (!isValidHttpUrl(trimmedUrl)) {
      res.status(400).json({ error: "invalid_request", message: "URL must be a valid HTTP or HTTPS address." });
      return;
    }
    updateData.url = trimmedUrl;
  }

  if (category !== undefined) {
    if (typeof category !== "string" || !category.trim()) {
      res.status(400).json({ error: "invalid_request", message: "Category cannot be empty." });
      return;
    }
    updateData.category = category.trim();
  }

  if (description !== undefined) {
    updateData.description = typeof description === "string" && description.trim() ? description.trim() : null;
  }

  if (icon !== undefined) {
    updateData.icon = typeof icon === "string" && icon.trim() ? icon.trim() : null;
  }

  if (displayOrder !== undefined) {
    if (typeof displayOrder === "number" && Number.isInteger(displayOrder)) {
      updateData.displayOrder = displayOrder;
    }
  }

  if (isActive !== undefined) {
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
  }

  try {
    const [updated] = await db
      .update(importantLinks)
      .set(updateData)
      .where(eq(importantLinks.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Quick link not found." });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update quick link");
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to update quick link." });
    }
  }
};

router.put("/quick-links/:id", requireAdmin, handleUpdateQuickLink);
router.put("/admin/quick-links/:id", requireAdmin, handleUpdateQuickLink);
router.patch("/quick-links/:id", requireAdmin, handleUpdateQuickLink);
router.patch("/admin/quick-links/:id", requireAdmin, handleUpdateQuickLink);

// 5. PATCH /api/quick-links/:id/status and /api/admin/quick-links/:id/status (Admin only)
const handleToggleStatus = async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  const { isActive } = req.body || {};
  if (typeof isActive !== "boolean") {
    res.status(400).json({ error: "invalid_request", message: "isActive must be a boolean." });
    return;
  }

  try {
    const [updated] = await db
      .update(importantLinks)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(importantLinks.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Quick link not found." });
      return;
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to toggle quick link status");
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to update quick link status." });
    }
  }
};

router.patch("/quick-links/:id/status", requireAdmin, handleToggleStatus);
router.patch("/admin/quick-links/:id/status", requireAdmin, handleToggleStatus);

// 6. DELETE /api/quick-links/:id and /api/admin/quick-links/:id (Admin only)
const handleDeleteQuickLink = async (req: any, res: any) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(importantLinks)
      .where(eq(importantLinks.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Quick link not found." });
      return;
    }

    res.json({ success: true, id });
  } catch (err) {
    logger.error({ err }, "Failed to delete quick link");
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to delete quick link." });
    }
  }
};

router.delete("/quick-links/:id", requireAdmin, handleDeleteQuickLink);
router.delete("/admin/quick-links/:id", requireAdmin, handleDeleteQuickLink);

export default router;