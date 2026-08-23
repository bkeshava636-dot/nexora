import { pgEnum } from "drizzle-orm/pg-core";

// Keep these values in sync with lib/api-spec/openapi.yaml (ResourceType, SubmissionStatus).
export const resourceTypeValues = [
  "Lecture notes",
  "Previous year paper",
  "Lab manual",
  "Assignment",
  "Reference",
  "Internal Assessment",
] as const;

export const submissionStatusValues = ["pending", "approved", "rejected"] as const;

export const resourceTypeEnum = pgEnum("resource_type", resourceTypeValues);
export const submissionStatusEnum = pgEnum("submission_status", submissionStatusValues);
