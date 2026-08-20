import { useMutation, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface PaymentConfigResponse {
  configured: boolean;
  keyId: string | null;
}

export interface CreatePaymentOrderInput {
  amount: number;
}

export interface CreatePaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export const getPaymentConfigQueryKey = () => ["/api/payments/config"];

export function useGetPaymentConfig(
  options?: Omit<UseQueryOptions<PaymentConfigResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<PaymentConfigResponse, Error>({
    queryKey: getPaymentConfigQueryKey(),
    queryFn: () => customFetch<PaymentConfigResponse>("/api/payments/config"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreatePaymentOrder() {
  return useMutation<CreatePaymentOrderResponse, Error, { data: CreatePaymentOrderInput }>({
    mutationFn: ({ data }) =>
      customFetch<CreatePaymentOrderResponse>("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}

export function useVerifyPayment() {
  return useMutation<VerifyPaymentResponse, Error, { data: VerifyPaymentInput }>({
    mutationFn: ({ data }) =>
      customFetch<VerifyPaymentResponse>("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
