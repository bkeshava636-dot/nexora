import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface CurriculumTemplateSubjectItem {
  id: number;
  templateId: number;
  name: string;
  code: string;
  description: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumTemplateItem {
  id: number;
  branchId: number;
  yearId: number;
  semesterId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  branchName: string;
  branchShortName: string;
  yearName: string;
  semesterName: string;
  subjectCount: number;
  subjects: CurriculumTemplateSubjectItem[];
}

export interface CreateCurriculumTemplateInput {
  branchId: number;
  yearId: number;
  semesterId: number;
  name?: string;
}

export interface UpdateCurriculumTemplateInput {
  name?: string;
}

export interface CreateTemplateSubjectInput {
  name: string;
  code?: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateTemplateSubjectInput {
  name?: string;
  code?: string;
  description?: string;
  displayOrder?: number;
}

export interface ApplyTemplateResponse {
  success: boolean;
  appliedCount: number;
  skippedCount: number;
  totalTemplateSubjects: number;
  message: string;
}

export const getListCurriculumTemplatesQueryKey = () => ["/api/curriculum-templates"];
export const getGetCurriculumTemplateQueryKey = (id: number) => ["/api/curriculum-templates", id];

export function useListCurriculumTemplates(
  options?: Omit<UseQueryOptions<CurriculumTemplateItem[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<CurriculumTemplateItem[], Error>({
    queryKey: getListCurriculumTemplatesQueryKey(),
    queryFn: () => customFetch<CurriculumTemplateItem[]>("/api/curriculum-templates"),
    ...options,
  });
}

export function useGetCurriculumTemplate(
  id: number,
  options?: Omit<UseQueryOptions<CurriculumTemplateItem, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<CurriculumTemplateItem, Error>({
    queryKey: getGetCurriculumTemplateQueryKey(id),
    queryFn: () => customFetch<CurriculumTemplateItem>(`/api/curriculum-templates/${id}`),
    ...options,
  });
}

export function useCreateCurriculumTemplate() {
  const queryClient = useQueryClient();
  return useMutation<CurriculumTemplateItem, Error, { data: CreateCurriculumTemplateInput }>({
    mutationFn: ({ data }) =>
      customFetch<CurriculumTemplateItem>("/api/curriculum-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
    },
  });
}

export function useUpdateCurriculumTemplate() {
  const queryClient = useQueryClient();
  return useMutation<CurriculumTemplateItem, Error, { id: number; data: UpdateCurriculumTemplateInput }>({
    mutationFn: ({ id, data }) =>
      customFetch<CurriculumTemplateItem>(`/api/curriculum-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurriculumTemplateQueryKey(variables.id) });
    },
  });
}

export function useDeleteCurriculumTemplate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch<void>(`/api/curriculum-templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
    },
  });
}

export function useCreateTemplateSubject() {
  const queryClient = useQueryClient();
  return useMutation<CurriculumTemplateSubjectItem, Error, { templateId: number; data: CreateTemplateSubjectInput }>({
    mutationFn: ({ templateId, data }) =>
      customFetch<CurriculumTemplateSubjectItem>(`/api/curriculum-templates/${templateId}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurriculumTemplateQueryKey(variables.templateId) });
    },
  });
}

export function useUpdateTemplateSubject() {
  const queryClient = useQueryClient();
  return useMutation<
    CurriculumTemplateSubjectItem,
    Error,
    { templateId: number; subjectId: number; data: UpdateTemplateSubjectInput }
  >({
    mutationFn: ({ templateId, subjectId, data }) =>
      customFetch<CurriculumTemplateSubjectItem>(`/api/curriculum-templates/${templateId}/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurriculumTemplateQueryKey(variables.templateId) });
    },
  });
}

export function useDeleteTemplateSubject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { templateId: number; subjectId: number }>({
    mutationFn: ({ templateId, subjectId }) =>
      customFetch<void>(`/api/curriculum-templates/${templateId}/subjects/${subjectId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurriculumTemplateQueryKey(variables.templateId) });
    },
  });
}

export function useReorderTemplateSubjects() {
  const queryClient = useQueryClient();
  return useMutation<
    CurriculumTemplateSubjectItem[],
    Error,
    { templateId: number; data: { order: Array<{ id: number; displayOrder: number }> } }
  >({
    mutationFn: ({ templateId, data }) =>
      customFetch<CurriculumTemplateSubjectItem[]>(`/api/curriculum-templates/${templateId}/subjects/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurriculumTemplateQueryKey(variables.templateId) });
    },
  });
}

export function useApplyCurriculumTemplate() {
  const queryClient = useQueryClient();
  return useMutation<ApplyTemplateResponse, Error, { templateId: number }>({
    mutationFn: ({ templateId }) =>
      customFetch<ApplyTemplateResponse>(`/api/curriculum-templates/${templateId}/apply`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      queryClient.invalidateQueries({ queryKey: getListCurriculumTemplatesQueryKey() });
    },
  });
}
