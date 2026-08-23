import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface SemesterQpItem {
  id: number;
  examYear: string;
  semester: string;
  department: string;
  title: string;
  downloadUrl: string;
  resourceType?: string;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSemesterQpInput {
  examYear: string;
  semester: string;
  department: string;
  title?: string;
  downloadUrl: string;
  resourceType?: string;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface UpdateSemesterQpInput {
  examYear?: string;
  semester?: string;
  department?: string;
  title?: string;
  downloadUrl?: string;
  resourceType?: string;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface ListSemesterQpsParams {
  examYear?: string;
  semester?: string;
  department?: string;
  search?: string;
  isPublished?: string;
}

export const getListSemesterQpsQueryKey = (params?: ListSemesterQpsParams) =>
  params ? ["/api/semester-qps", params] : ["/api/semester-qps"];

export function useListSemesterQps(
  params?: ListSemesterQpsParams,
  options?: Omit<UseQueryOptions<SemesterQpItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<SemesterQpItem[], Error>({
    queryKey: getListSemesterQpsQueryKey(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.examYear) sp.set("examYear", params.examYear);
      if (params?.semester) sp.set("semester", params.semester);
      if (params?.department) sp.set("department", params.department);
      if (params?.search) sp.set("search", params.search);
      if (params?.isPublished) sp.set("isPublished", params.isPublished);
      const qs = sp.toString() ? `?${sp.toString()}` : "";
      return customFetch<SemesterQpItem[]>(`/api/semester-qps${qs}`);
    },
    ...options,
  });
}

export function useGetSemesterQp(
  id: number,
  options?: Omit<UseQueryOptions<SemesterQpItem, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<SemesterQpItem, Error>({
    queryKey: ["/api/semester-qps", id],
    queryFn: () => customFetch<SemesterQpItem>(`/api/semester-qps/${id}`),
    enabled: Boolean(id && Number.isInteger(id) && id > 0),
    ...options,
  });
}

export function useCreateSemesterQp() {
  const queryClient = useQueryClient();
  return useMutation<SemesterQpItem, Error, { data: CreateSemesterQpInput }>({
    mutationFn: ({ data }) =>
      customFetch<SemesterQpItem>("/api/semester-qps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semester-qps"] });
    },
  });
}

export function useUpdateSemesterQp() {
  const queryClient = useQueryClient();
  return useMutation<SemesterQpItem, Error, { id: number; data: UpdateSemesterQpInput }>({
    mutationFn: ({ id, data }) =>
      customFetch<SemesterQpItem>(`/api/semester-qps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semester-qps"] });
    },
  });
}

export function useDeleteSemesterQp() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; id: number }, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch<{ success: boolean; id: number }>(`/api/semester-qps/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/semester-qps"] });
    },
  });
}
