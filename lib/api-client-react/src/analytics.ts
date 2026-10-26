import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface AnalyticsStatsResponse {
  totalViews: number;
  totalVisits: number;
  uniqueVisitors?: number;
}

export interface TotalVisitsResponse {
  totalVisits: number;
  totalViews?: number;
  uniqueVisitors?: number;
  recorded?: boolean;
}

export interface RecordVisitPayload {
  visitorId?: string;
  sessionId?: string;
  path?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  referrer?: string;
}

export interface RecordPageViewPayload {
  visitorId?: string;
  sessionId?: string;
  path?: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  referrer?: string;
}

export interface DailyBreakdownItem {
  date: string;
  label: string;
  visits: number;
  uniqueVisitors: number;
}

export interface TopPathItem {
  path: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DeviceBreakdownItem {
  device: string;
  count: number;
  percentage: number;
}

export interface HourlyBreakdownItem {
  hour: number;
  label: string;
  count: number;
}

export interface TopReferrerItem {
  referrer: string;
  count: number;
  percentage: number;
}

export interface AdminAnalyticsStats {
  days: number;
  totalVisits: number;
  totalViews: number;
  todayVisits: number;
  todayViews?: number;
  yesterdayVisits: number;
  todayGrowth: number;
  todayUniqueVisitors: number;
  last7DaysVisits: number;
  last30DaysVisits: number;
  totalPeriodVisits: number;
  avgVisitsPerDay: number;
  dailyBreakdown: DailyBreakdownItem[];
  topPaths: TopPathItem[];
  deviceBreakdown: DeviceBreakdownItem[];
  hourlyBreakdown: HourlyBreakdownItem[];
  topReferrers: TopReferrerItem[];
}

export const getTotalVisitsQueryKey = () => ["/api/analytics/total-visits"];
export const getAnalyticsStatsQueryKey = () => ["/api/analytics/stats"];
export const getAdminAnalyticsStatsQueryKey = (days: number = 30) => [
  "/api/admin/analytics/stats",
  { days },
];

export function useGetTotalVisits(
  options?: Omit<UseQueryOptions<TotalVisitsResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<TotalVisitsResponse, Error>({
    queryKey: getTotalVisitsQueryKey(),
    queryFn: () => customFetch<TotalVisitsResponse>("/api/analytics/total-visits"),
    staleTime: 1000 * 60 * 3, // 3 minutes fresh
    retry: 2,
    ...options,
  });
}

export function useGetAnalyticsStats(
  options?: Omit<UseQueryOptions<AnalyticsStatsResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<AnalyticsStatsResponse, Error>({
    queryKey: getAnalyticsStatsQueryKey(),
    queryFn: () => customFetch<AnalyticsStatsResponse>("/api/analytics/stats"),
    staleTime: 1000 * 60 * 2, // 2 minutes fresh
    retry: 2,
    ...options,
  });
}

export function useRecordVisit() {
  const queryClient = useQueryClient();
  return useMutation<TotalVisitsResponse, Error, RecordVisitPayload | void>({
    mutationFn: (payload) =>
      customFetch<TotalVisitsResponse>("/api/analytics/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(getTotalVisitsQueryKey(), data);
      queryClient.setQueryData(getAnalyticsStatsQueryKey(), (prev?: AnalyticsStatsResponse) => ({
        totalViews: data.totalViews ?? prev?.totalViews ?? 0,
        totalVisits: data.totalVisits ?? prev?.totalVisits ?? 0,
        uniqueVisitors: data.uniqueVisitors ?? prev?.uniqueVisitors,
      }));
    },
  });
}

export function useRecordPageView() {
  const queryClient = useQueryClient();
  return useMutation<TotalVisitsResponse, Error, RecordPageViewPayload>({
    mutationFn: (payload) =>
      customFetch<TotalVisitsResponse>("/api/analytics/page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(getTotalVisitsQueryKey(), data);
      queryClient.setQueryData(getAnalyticsStatsQueryKey(), (prev?: AnalyticsStatsResponse) => ({
        totalViews: data.totalViews ?? prev?.totalViews ?? 0,
        totalVisits: data.totalVisits ?? prev?.totalVisits ?? 0,
        uniqueVisitors: data.uniqueVisitors ?? prev?.uniqueVisitors,
      }));
    },
  });
}

export function useGetAdminAnalyticsStats(
  days: number = 30,
  options?: Omit<UseQueryOptions<AdminAnalyticsStats, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<AdminAnalyticsStats, Error>({
    queryKey: getAdminAnalyticsStatsQueryKey(days),
    queryFn: () => customFetch<AdminAnalyticsStats>(`/api/admin/analytics/stats?days=${days}`),
    staleTime: 1000 * 60 * 2,
    ...options,
  });
}
