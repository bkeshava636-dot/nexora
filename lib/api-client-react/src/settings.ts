import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type SubmissionApprovalMode = "approval_required" | "auto_publish";

export interface SubmissionModeSetting {
  mode: SubmissionApprovalMode;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface UpdateSubmissionModeBody {
  mode: SubmissionApprovalMode;
}

export const getSubmissionModeQueryKey = () => ["admin", "settings", "submission-mode"] as const;

export function useGetSubmissionMode(
  options?: Partial<UseQueryOptions<SubmissionModeSetting, Error>>,
) {
  return useQuery<SubmissionModeSetting, Error>({
    queryKey: getSubmissionModeQueryKey(),
    queryFn: () =>
      customFetch<SubmissionModeSetting>("/api/admin/settings/submission-mode", {
        method: "GET",
      }),
    staleTime: 30_000,
    ...options,
  });
}

export function useUpdateSubmissionMode(
  options?: UseMutationOptions<SubmissionModeSetting, Error, { data: UpdateSubmissionModeBody }>,
) {
  return useMutation<SubmissionModeSetting, Error, { data: UpdateSubmissionModeBody }>({
    mutationFn: ({ data }) =>
      customFetch<SubmissionModeSetting>("/api/admin/settings/submission-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

