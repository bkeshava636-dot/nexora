import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface AuthMessageResponse {
  success?: boolean;
  message: string;
}

export function useChangePassword(
  options?: UseMutationOptions<AuthMessageResponse, Error, { data: ChangePasswordInput }>
) {
  return useMutation<AuthMessageResponse, Error, { data: ChangePasswordInput }>({
    mutationFn: ({ data }) =>
      customFetch<AuthMessageResponse>("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useForgotPassword(
  options?: UseMutationOptions<AuthMessageResponse, Error, { data: ForgotPasswordInput }>
) {
  return useMutation<AuthMessageResponse, Error, { data: ForgotPasswordInput }>({
    mutationFn: ({ data }) =>
      customFetch<AuthMessageResponse>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useResetPassword(
  options?: UseMutationOptions<AuthMessageResponse, Error, { data: ResetPasswordInput }>
) {
  return useMutation<AuthMessageResponse, Error, { data: ResetPasswordInput }>({
    mutationFn: ({ data }) =>
      customFetch<AuthMessageResponse>("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}
