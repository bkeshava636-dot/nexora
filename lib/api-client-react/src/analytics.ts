import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface TotalVisitsResponse {
  totalVisits: number;
}

export const getTotalVisitsQueryKey = () => ["/api/analytics/total-visits"];

export function useGetTotalVisits(
  options?: Omit<UseQueryOptions<TotalVisitsResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<TotalVisitsResponse, Error>({
    queryKey: getTotalVisitsQueryKey(),
    queryFn: () => customFetch<TotalVisitsResponse>("/api/analytics/total-visits"),
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    retry: false,
    ...options,
  });
}

export function useRecordVisit() {
  const queryClient = useQueryClient();
  return useMutation<TotalVisitsResponse, Error, void>({
    mutationFn: () =>
      customFetch<TotalVisitsResponse>("/api/analytics/visit", {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(getTotalVisitsQueryKey(), data);
    },
  });
}
