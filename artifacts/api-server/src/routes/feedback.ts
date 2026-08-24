import { Router, type IRouter } from "express";
import { desc, eq, and } from "drizzle-orm";
import { db, ensureTables, feedback, feedbackCategoryValues, feedbackStatusValues, type FeedbackCategory, type FeedbackStatus } from "@workspace/db";
import { CreateFeedbackBody, UpdateFeedbackBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/feedback (Public submission endpoint)
router.post("/feedback", async (req, res) => {
  const parsed = CreateFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.issues.map((i: { message: string }) => i.message).join(", ") || "Invalid feedback data.",
    });
    return;
  }

  const { category, message, name, email, pageUrl } = parsed.data;

  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 3) {
    res.status(400).json({
      error: "invalid_request",
      message: "Please enter a message with at least 3 characters.",
    });
    return;
  }

  const validatedCategory: FeedbackCategory = category && feedbackCategoryValues.includes(category as FeedbackCategory)
    ? (category as FeedbackCategory)
    : "improvement";

  try {
    try {
      const [created] = await db
        .insert(feedback)
        .values({
          category: validatedCategory,
          message: trimmedMessage,
          name: name?.trim() || null,
          email: email?.trim() || null,
          pageUrl: pageUrl?.trim() || null,
          status: "pending",
        })
        .returning();

      res.status(201).json(created);
    } catch (insertErr: unknown) {
      const pgErr = (insertErr as { cause?: { code?: string }; code?: string })?.cause || (insertErr as { code?: string });
      if (pgErr?.code === "42P01") {
        // Table not created yet; ensure tables and retry
        await ensureTables();
        const [created] = await db
          .insert(feedback)
          .values({
            category: validatedCategory,
            message: trimmedMessage,
            name: name?.trim() || null,
            email: email?.trim() || null,
            pageUrl: pageUrl?.trim() || null,
            status: "pending",
          })
          .returning();

        res.status(201).json(created);
        return;
      }
      throw insertErr;
    }
  } catch (err) {
    logger.error({ err, category, message: trimmedMessage }, "Failed to submit feedback");
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to submit feedback." });
    }
  }
});

// GET /api/feedback (Admin listing endpoint)
router.get("/feedback", requireAdmin, async (req, res) => {
  try {
    const statusParam = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const categoryParam = typeof req.query["category"] === "string" ? req.query["category"] : undefined;

    const conditions = [];
    if (statusParam && statusParam !== "all" && feedbackStatusValues.includes(statusParam as FeedbackStatus)) {
      conditions.push(eq(feedback.status, statusParam));
    }
    if (categoryParam && categoryParam !== "all" && feedbackCategoryValues.includes(categoryParam as FeedbackCategory)) {
      conditions.push(eq(feedback.category, categoryParam));
    }

    const rows = await db
      .select()
      .from(feedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(feedback.createdAt));

    res.json(rows);
  } catch (err: unknown) {
    const pgError = (err as { cause?: { code?: string }; code?: string })?.cause || (err as { code?: string });
    if (pgError?.code === "42P01") {
      res.json([]);
      return;
    }
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to fetch feedback." });
    }
  }
});

// PATCH /api/feedback/:id (Admin update status or notes)
router.patch("/feedback/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  const parsed = UpdateFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "invalid_request",
      message: parsed.error.issues.map((i: { message: string }) => i.message).join(", ") || "Invalid update data.",
    });
    return;
  }

  const { status, adminNotes } = parsed.data;

  try {
    const updateData: Partial<typeof feedback.$inferInsert> = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const [updated] = await db
      .update(feedback)
      .set(updateData)
      .where(eq(feedback.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Feedback item not found." });
      return;
    }

    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to update feedback." });
    }
  }
});

// DELETE /api/feedback/:id (Admin delete feedback)
router.delete("/feedback/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(feedback)
      .where(eq(feedback.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "not_found", message: "Feedback item not found." });
      return;
    }

    res.json(deleted);
  } catch (err) {
    if (!handleDbError(err, res)) {
      res.status(500).json({ error: "internal_error", message: "Failed to delete feedback." });
    }
  }
});

export default router;
