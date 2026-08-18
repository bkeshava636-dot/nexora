// Types and small display helpers shared across pages. Resource, submission,
// and catalog data itself now comes from the API (see @workspace/api-client-react
// hooks used throughout App.tsx) rather than the hardcoded arrays this file
// used to export.
export type {
  Branch,
  Year,
  Semester,
  Subject,
  Resource,
  Submission,
  ResourceType,
  SubmissionStatus,
} from "@workspace/api-client-react";

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
