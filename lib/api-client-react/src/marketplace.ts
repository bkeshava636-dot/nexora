import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type MarketplaceCategory =
  | "Textbooks"
  | "Notes & Binders"
  | "Lab Equipment"
  | "Electronics & Gadgets"
  | "Other Campus Items";

export type MarketplaceCondition = "Brand New" | "Like New" | "Good" | "Fair";

export type MarketplaceStatus = "active" | "sold" | "hidden";

export interface MarketplaceItem {
  id: number;
  title: string;
  description: string;
  category: MarketplaceCategory;
  price: number;
  condition: MarketplaceCondition;
  sellerName: string;
  sellerContact: string;
  sellerInstagram?: string | null;
  sellerEmail?: string | null;
  campusLocation: string;
  branch?: string | null;
  semester?: string | null;
  imageUrl?: string | null;
  status: MarketplaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceInput {
  title: string;
  description: string;
  category: MarketplaceCategory;
  condition: MarketplaceCondition;
  price: number;
  campusLocation: string;
  branch?: string;
  semester?: string;
  sellerName: string;
  sellerContact?: string;
  sellerInstagram?: string;
  sellerEmail?: string;
  imageUrl?: string;
}

export const getMarketplaceQueryKey = (params?: { status?: string }) =>
  params?.status ? ["/api/marketplace", params.status] : ["/api/marketplace"];

export const getAdminMarketplaceQueryKey = (params?: { status?: string }) =>
  params?.status ? ["/api/admin/marketplace", params.status] : ["/api/admin/marketplace"];

export function useMarketplaceItems(
  params?: { status?: "active" | "sold" | "all" },
  options?: Omit<UseQueryOptions<MarketplaceItem[], Error>, "queryKey" | "queryFn">,
) {
  const status = params?.status || "active";
  return useQuery<MarketplaceItem[], Error>({
    queryKey: getMarketplaceQueryKey({ status }),
    queryFn: () => customFetch<MarketplaceItem[]>(`/api/marketplace?status=${encodeURIComponent(status)}`),
    ...options,
  });
}

export function useAdminMarketplaceItems(
  params?: { status?: "active" | "sold" | "all" },
  options?: Omit<UseQueryOptions<MarketplaceItem[], Error>, "queryKey" | "queryFn">,
) {
  const status = params?.status || "all";
  return useQuery<MarketplaceItem[], Error>({
    queryKey: getAdminMarketplaceQueryKey({ status }),
    queryFn: async () => {
      try {
        return await customFetch<MarketplaceItem[]>(`/api/admin/marketplace?status=${encodeURIComponent(status)}`);
      } catch {
        // Fallback to public route if admin endpoint fails or is unauthenticated
        return await customFetch<MarketplaceItem[]>(`/api/marketplace?status=${encodeURIComponent(status)}`);
      }
    },
    ...options,
  });
}

export function useCreateMarketplaceItem() {
  const queryClient = useQueryClient();
  return useMutation<MarketplaceItem, Error, { data: CreateMarketplaceInput }>({
    mutationFn: ({ data }) =>
      customFetch<MarketplaceItem>("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace"] });
    },
  });
}

export function useMarkMarketplaceItemSold() {
  const queryClient = useQueryClient();
  return useMutation<MarketplaceItem, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch<MarketplaceItem>(`/api/marketplace/${id}/sold`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace"] });
    },
  });
}

export function useUpdateMarketplaceItemStatus() {
  const queryClient = useQueryClient();
  return useMutation<MarketplaceItem, Error, { id: number; status: "active" | "sold" }>({
    mutationFn: async ({ id, status }) => {
      try {
        return await customFetch<MarketplaceItem>(`/api/admin/marketplace/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch (err) {
        if (status === "sold") {
          return await customFetch<MarketplaceItem>(`/api/marketplace/${id}/sold`, {
            method: "PATCH",
          });
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace"] });
    },
  });
}

export function useDeleteMarketplaceItem() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { id: number }>({
    mutationFn: async ({ id }) => {
      try {
        return await customFetch<{ success: boolean }>(`/api/admin/marketplace/${id}`, {
          method: "DELETE",
        });
      } catch {
        return await customFetch<{ success: boolean }>(`/api/marketplace/${id}`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketplace"] });
    },
  });
}
