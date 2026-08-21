import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, resources, submissions } from "@workspace/db";
import {
  ApproveSubmissionBody,
  CreateSubmissionBody,
  ListSubmissionsQueryParams,
  RejectSubmissionBody,
  UpdateSubmissionBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { handleDbError } from "../lib/db-errors";
import { GOOGLE_DRIVE_URL_ERROR, isValidGoogleDriveUrl } from "../lib/google-drive";
import { getSubmissionApprovalMode } from "./settings";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Public: students submit a resource. If auto_publish mode is enabled, the resource
// is automatically validated and published into the catalog; otherwise it enters the review queue.
router.post("/submissions", async (req, res) => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  if (!isValidGoogleDriveUrl(parsed.data.googleDriveUrl)) {
    res.status(400).json({ error: "invalid_google_drive_url", message: GOOGLE_DRIVE_URL_ERROR });
    return;
  }

  const mode = await getSubmissionApprovalMode();

  if (mode === "auto_publish" && parsed.data.subjectId) {
    try {
      const result = await db.transaction(async (tx) => {
        const [createdResource] = await tx
          .insert(resources)
          .values({
            subjectId: parsed.data.subjectId as number,
            title: parsed.data.title,
            description: parsed.data.description ?? "",
            resourceType: parsed.data.resourceType,
            googleDriveUrl: parsed.data.googleDriveUrl,
            isNew: true,
            isFeatured: false,
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: "auto_publish",
          })
          .returning();

        const [createdSubmission] = await tx
          .insert(submissions)
          .values({
            ...parsed.data,
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: "auto_publish",
            adminNote: "Auto-published upon student submission.",
          })
          .returning();

        return { ...createdSubmission, resourceId: createdResource.id };
      });

      logger.info(
        { submissionId: result.id, resourceId: result.resourceId },
        "Submission auto-published to catalog.",
      );

      res.status(201).json(result);
      return;
    } catch (err) {
      logger.error(
        { err },
        "Auto-publish failed during resource creation; falling back to pending submission for manual recovery",
      );

      try {
        const [fallbackSubmission] = await db
          .insert(submissions)
          .values({
            ...parsed.data,
            status: "pending",
            adminNote: "Auto-publish failed; queued for manual review.",
          })
          .returning();

        res.status(201).json(fallbackSubmission);
        return;
      } catch (innerErr) {
        if (!handleDbError(innerErr, res)) throw innerErr;
        return;
      }
    }
  }

  try {
    const [created] = await db.insert(submissions).values(parsed.data).returning();
    res.status(201).json(created);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

// Everything else about submissions is admin-only: the review queue and its
// contents (student name/email, drive links) should not be publicly listable.
router.get("/submissions", requireAdmin, async (req, res) => {
  const parsed = ListSubmissionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: "Invalid query parameters." });
    return;
  }
  const rows = await db
    .select()
    .from(submissions)
    .where(parsed.data.status !== undefined ? eq(submissions.status, parsed.data.status) : undefined)
    .orderBy(desc(submissions.submittedAt));
  res.json(rows);
});

router.get("/submissions/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!submission) {
    res.status(404).json({ error: "not_found", message: "Submission not found." });
    return;
  }
  res.json(submission);
});

router.patch("/submissions/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = UpdateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }
  try {
    const [updated] = await db
      .update(submissions)
      .set(parsed.data)
      .where(eq(submissions.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Submission not found." });
      return;
    }
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.post("/submissions/:id/approve", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = ApproveSubmissionBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, id));
  if (!submission) {
    res.status(404).json({ error: "not_found", message: "Submission not found." });
    return;
  }
  if (!submission.subjectId) {
    res.status(400).json({
      error: "invalid_submission",
      message: "This submission has no subject on record and cannot be turned into a catalog resource.",
    });
    return;
  }

  try {
    const [updated] = await db.transaction(async (tx) => {
      // Approving a submission publishes it into the catalog as a real
      // resource, so the two writes happen together.
      await tx.insert(resources).values({
        subjectId: submission.subjectId as number,
        title: submission.title,
        description: submission.description,
        resourceType: submission.resourceType,
        googleDriveUrl: submission.googleDriveUrl,
        isNew: true,
        isFeatured: parsed.data.isFeatured ?? false,
        isVerified: parsed.data.isVerified ?? true,
        verifiedAt: (parsed.data.isVerified ?? true) ? new Date() : null,
        verifiedBy: (parsed.data.isVerified ?? true) ? (req.admin?.username ?? null) : null,
      });

      return tx
        .update(submissions)
        .set({
          status: "approved",
          adminNote: parsed.data.adminNote ?? submission.adminNote,
          reviewedAt: new Date(),
          reviewedBy: req.admin?.username ?? null,
        })
        .where(eq(submissions.id, id))
        .returning();
    });
    res.json(updated);
  } catch (err) {
    if (!handleDbError(err, res)) throw err;
  }
});

router.post("/submissions/:id/reject", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "invalid_request", message: "id must be an integer." });
    return;
  }
  const parsed = RejectSubmissionBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", message: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(submissions)
    .set({
      status: "rejected",
      rejectionReason: parsed.data.rejectionReason,
      reviewedAt: new Date(),
      reviewedBy: req.admin?.username ?? null,
    })
    .where(eq(submissions.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Submission not found." });
    return;
  }
  res.json(updated);
});

export default router;
