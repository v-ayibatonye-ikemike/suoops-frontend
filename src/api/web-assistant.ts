import { apiClient } from "./client";

export type AssistantPage =
  | "dashboard" | "invoices" | "collections" | "inventory" | "analytics"
  | "expenses" | "tax" | "settings" | "billing";

export interface AssistantInvoiceDraft {
  customer_name: string | null;
  currency: "NGN" | "USD";
  lines: Array<{ description: string; quantity: 1; unit_price: number }>;
}

export type AssistantAction =
  | { kind: "navigate"; id: string; title: string; description: string; href: string }
  | { kind: "invoice_draft"; id: "new_invoice"; title: string; description: string; draft: AssistantInvoiceDraft };

export interface WebAssistantResponse {
  message: string;
  actions: AssistantAction[];
  ai_assisted: boolean;
  notice: string | null;
}

export function assistantPage(pathname: string): AssistantPage {
  const section = pathname.split("/")[2];
  switch (section) {
    case "invoices": case "collections": case "inventory": case "analytics":
    case "expenses": case "tax": case "settings": case "billing":
      return section;
    default:
      return "dashboard";
  }
}

export async function getWebAssistantContext(page: AssistantPage, signal?: AbortSignal) {
  const { data } = await apiClient.get<WebAssistantResponse>("/ai/web-assistant/context", {
    params: { page }, signal,
  });
  return data;
}

export async function askWebAssistant(
  message: string, page: AssistantPage, allowAI: boolean, signal: AbortSignal,
) {
  const { data } = await apiClient.post<WebAssistantResponse>(
    "/ai/web-assistant/ask", { message, page, allow_ai: allowAI }, { signal },
  );
  return data;
}
