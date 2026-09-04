import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ImportantLinkItem {
  id: number;
  title: string;
  description?: string | null;
  url: string;
  category: string;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickLinkInput {
  title: string;
  description?: string | null;
  url: string;
  category: string;
  icon?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateQuickLinkInput {
  title?: string;
  description?: string | null;
  url?: string;
  category?: string;
  icon?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ListQuickLinksParams {
  category?: string;
  search?: string;
  isActive?: string;
}

export const getListQuickLinksQueryKey = (params?: ListQuickLinksParams) =>
  params ? ["/api/quick-links", params] : ["/api/quick-links"];

export function useListQuickLinks(
  params?: ListQuickLinksParams,
  options?: Omit<UseQueryOptions<ImportantLinkItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ImportantLinkItem[], Error>({
    queryKey: getListQuickLinksQueryKey(params),
    queryFn: () => {
      const sp = new URLSearchParams();
      if (params?.category) sp.set("category", params.category);
      if (params?.search) sp.set("search", params.search);
      if (params?.isActive) sp.set("isActive", params.isActive);
      const q = sp.toString();
      return customFetch("/api/quick-links" + (q ? "?" + q : ""));
    },
    ...options,
  });
}

export function useGetQuickLink(
  id: number,
  options?: Omit<UseQueryOptions<ImportantLinkItem, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<ImportantLinkItem, Error>({
    queryKey: ["/api/quick-links", id],
    queryFn: () => customFetch("/api/quick-links/" + id),
    enabled: Boolean(id && id > 0),
    ...options,
  });
}

export function useCreateQuickLink() {
  const queryClient = useQueryClient();
  return useMutation<ImportantLinkItem, Error, { data: CreateQuickLinkInput }>({
    mutationFn: ({ data }) =>
      customFetch("/api/quick-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
    },
  });
}

export function useUpdateQuickLink() {
  const queryClient = useQueryClient();
  return useMutation<ImportantLinkItem, Error, { id: number; data: UpdateQuickLinkInput }>({
    mutationFn: ({ id, data }) =>
      customFetch("/api/quick-links/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links", id] });
    },
  });
}

export function useToggleQuickLinkStatus() {
  const queryClient = useQueryClient();
  return useMutation<ImportantLinkItem, Error, { id: number; isActive: boolean }>({
    mutationFn: ({ id, isActive }) =>
      customFetch("/api/quick-links/" + id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links", id] });
    },
  });
}

export function useDeleteQuickLink() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; id: number }, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch("/api/quick-links/" + id, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-links"] });
    },
  });
}