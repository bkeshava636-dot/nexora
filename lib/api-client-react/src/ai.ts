import { useMutation } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ContextState {
  branch?: string;
  semester?: string;
  subject?: string;
  subjectId?: number;
  topic?: string;
}

export interface AiChatInput {
  message: string;
  history?: ChatHistoryItem[];
  contextState?: ContextState;
}

export interface ActionCardData {
  type: "subject" | "pyqs" | "link" | "contribute" | "resources";
  title: string;
  subtitle?: string;
  badge?: string;
  targetUrl: string;
  external?: boolean;
  buttonText: string;
  resources?: Array<{ title: string; url?: string; type: string }>;
}

export interface AiChatResponse {
  reply: string;
  actionCard?: ActionCardData;
  quickReplies?: Array<{ label: string; value: string }>;
  updatedContextState: ContextState;
  source: "llm" | "academic_engine" | "catalog_search";
}

export function useAiChat() {
  return useMutation<AiChatResponse, Error, AiChatInput>({
    mutationFn: (data: AiChatInput) =>
      customFetch<AiChatResponse>("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
