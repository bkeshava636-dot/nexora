import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type ReportReason =
  | "Broken link"
  | "Wrong subject"
  | "Wrong branch/year/semester"
  | "Duplicate resource"
  | "Incorrect content"
  | "Other";

export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface ReportItem {
  id: number;
  resourceId: number;
  reason: ReportReason;
  explanation?: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resourceTitle?: string | null;
  resourceType?: string | null;
  googleDriveUrl?: string | null;
}

export interface CreateReportInput {
  resourceId: number;
  reason: ReportReason;
  explanation?: string;
}

export const getListReportsQueryKey = (params?: { status?: string }) =>
  params ? ["/api/reports", params] : ["/api/reports"];

export function useListReports(
  params?: { status?: string },
  options?: Omit<UseQueryOptions<ReportItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ReportItem[], Error>({
    queryKey: getListReportsQueryKey(params),
    queryFn: () => {
      const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
      return customFetch<ReportItem[]>(`/api/reports${qs}`);
    },
    ...options,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation<ReportItem, Error, { data: CreateReportInput }>({
    mutationFn: ({ data }) =>
      customFetch<ReportItem>("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation<ReportItem, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch<ReportItem>(`/api/reports/${id}/resolve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();
  return useMutation<ReportItem, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch<ReportItem>(`/api/reports/${id}/dismiss`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
  });
}

