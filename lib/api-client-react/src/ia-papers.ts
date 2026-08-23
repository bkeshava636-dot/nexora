import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface IaPaperItem {
  id: number;
  academicYear: string;
  semester: string;
  department: string;
  iaType: string;
  title: string;
  googleDriveUrl: string;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIaPaperInput {
  academicYear: string;
  semester: string;
  department: string;
  iaType?: string;
  title?: string;
  googleDriveUrl: string;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface UpdateIaPaperInput {
  academicYear?: string;
  semester?: string;
  department?: string;
  iaType?: string;
  title?: string;
  googleDriveUrl?: string;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface ListIaPapersParams {
  academicYear?: string;
  semester?: string;
  department?: string;
  iaType?: string;
  search?: string;
  isPublished?: string;
}

export const getListIaPapersQueryKey = (params?: ListIaPapersParams) =>
  params ? ["/api/ia-papers", params] : ["/api/ia-papers"];

export function useListIaPapers(
  params?: ListIaPapersParams,
  options?: Omit<UseQueryOptions<IaPaperItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<IaPaperItem[], Error>({
    queryKey: getListIaPapersQueryKey(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.academicYear) sp.set("academicYear", params.academicYear);
      if (params?.semester) sp.set("semester", params.semester);
      if (params?.department) sp.set("department", params.department);
      if (params?.iaType) sp.set("iaType", params.iaType);
      if (params?.search) sp.set("search", params.search);
      if (params?.isPublished) sp.set("isPublished", params.isPublished);
      const q = sp.toString();
      return customFetch(`/api/ia-papers${q ? `?${q}` : ""}`);
    },
    ...options,
  });
}

export function useGetIaPaper(id: number, options?: Omit<UseQueryOptions<IaPaperItem, Error>, "queryKey" | "queryFn">) {
  return useQuery<IaPaperItem, Error>({
    queryKey: ["/api/ia-papers", id],
    queryFn: () => customFetch(`/api/ia-papers/${id}`),
    enabled: Boolean(id && id > 0),
    ...options,
  });
}

export function useCreateIaPaper() {
  const queryClient = useQueryClient();
  return useMutation<IaPaperItem, Error, { data: CreateIaPaperInput }>({
    mutationFn: ({ data }) =>
      customFetch("/api/ia-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ia-papers"] });
    },
  });
}

export function useUpdateIaPaper() {
  const queryClient = useQueryClient();
  return useMutation<IaPaperItem, Error, { id: number; data: UpdateIaPaperInput }>({
    mutationFn: ({ id, data }) =>
      customFetch(`/api/ia-papers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ia-papers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ia-papers", id] });
    },
  });
}

export function useDeleteIaPaper() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; id: number }, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch(`/api/ia-papers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ia-papers"] });
    },
  });
}
