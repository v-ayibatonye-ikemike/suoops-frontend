import { apiClient } from "./client";

export type CollectionDraftStatus = "draft" | "sent" | "dismissed" | "failed";

export interface CollectionDraft {
  id: string;
  invoice_id: string;
  customer_name: string;
  amount: number;
  currency: string;
  days_overdue: number;
  priority_score: number;
  priority_level: "critical" | "high" | "medium" | "low";
  reasons: string[];
  explanation: string;
  channel: "email" | "whatsapp" | "unavailable";
  recipient_masked: string;
  subject: string | null;
  message: string;
  status: CollectionDraftStatus;
  ai_generated: boolean;
  sent_at: string | null;
  created_at: string;
  can_send: boolean;
}

export interface CollectionPriorities {
  generated_at: string;
  cooldown_days: number;
  eligible_count: number;
  total_overdue_amount: number;
  drafts: CollectionDraft[];
}

export interface CollectionMetrics {
  sent_reminders: number;
  recovered_invoices: number;
  recovered_amount: number;
  recovery_rate: number;
}

export interface CollectionDraftUpdate {
  subject: string | null;
  message: string;
}

export async function getCollectionPriorities(): Promise<CollectionPriorities> {
  const response = await apiClient.get<CollectionPriorities>("/ai/collections/priorities");
  return response.data;
}

export async function getCollectionMetrics(): Promise<CollectionMetrics> {
  const response = await apiClient.get<CollectionMetrics>("/ai/collections/metrics");
  return response.data;
}

export async function updateCollectionDraft(
  draftId: string,
  update: CollectionDraftUpdate,
): Promise<CollectionDraft> {
  const response = await apiClient.patch<CollectionDraft>(
    `/ai/collections/drafts/${draftId}`,
    update,
  );
  return response.data;
}

export async function improveCollectionDraft(draftId: string): Promise<CollectionDraft> {
  const response = await apiClient.post<CollectionDraft>(
    `/ai/collections/drafts/${draftId}/enhance`,
  );
  return response.data;
}

export async function sendCollectionDraft(
  draftId: string,
  update: CollectionDraftUpdate,
): Promise<CollectionDraft> {
  const response = await apiClient.post<CollectionDraft>(
    `/ai/collections/drafts/${draftId}/send`,
    update,
  );
  return response.data;
}

export async function dismissCollectionDraft(draftId: string): Promise<CollectionDraft> {
  const response = await apiClient.post<CollectionDraft>(
    `/ai/collections/drafts/${draftId}/dismiss`,
  );
  return response.data;
}
