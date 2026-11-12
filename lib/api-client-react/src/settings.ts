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

// ---------------------------------------------------------------------------
// Homepage Feature Announcement Banner
// ---------------------------------------------------------------------------

export interface FeatureBannerConfig {
  enabled: boolean;
  title: string;
  message: string;
  badge: string;
  linkText: string;
  linkUrl: string;
}

export const getFeatureBannerQueryKey = () => ["settings", "feature-banner"] as const;

export function useGetFeatureBanner(
  options?: Partial<UseQueryOptions<FeatureBannerConfig, Error>>,
) {
  return useQuery<FeatureBannerConfig, Error>({
    queryKey: getFeatureBannerQueryKey(),
    queryFn: async () => {
      try {
        return await customFetch<FeatureBannerConfig>("/api/settings/feature-banner");
      } catch {
        return {
          enabled: true,
          title: "Check out Campus Trade!",
          message: "Buy and sell used textbooks, notes, drafters, calculators, and lab gear directly with fellow students on campus.",
          badge: "New Feature",
          linkText: "Explore Campus Trade",
          linkUrl: "/marketplace",
        };
      }
    },
    staleTime: 60_000,
    ...options,
  });
}

export function useUpdateFeatureBanner(
  options?: UseMutationOptions<FeatureBannerConfig, Error, { data: Partial<FeatureBannerConfig> & { enabled: boolean } }>,
) {
  const queryClient = useQueryClient();
  return useMutation<FeatureBannerConfig, Error, { data: Partial<FeatureBannerConfig> & { enabled: boolean } }>({
    mutationFn: ({ data }) =>
      customFetch<FeatureBannerConfig>("/api/admin/settings/feature-banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(getFeatureBannerQueryKey(), result);
      queryClient.invalidateQueries({ queryKey: getFeatureBannerQueryKey() });
    },
    ...options,
  });
}

