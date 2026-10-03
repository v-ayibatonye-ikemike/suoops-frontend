import { apiClient } from "./client";

export type AIPreferences = {
  enabled: boolean;
  feature_overrides: Record<string, boolean>;
  available_features: Record<string, string>;
  updated_at: string | null;
};

export async function getAIPreferences(): Promise<AIPreferences> {
  const response = await apiClient.get<AIPreferences>("/ai/preferences");
  return response.data;
}

export async function updateAIPreferences(
  preferences: Pick<AIPreferences, "enabled" | "feature_overrides">,
): Promise<AIPreferences> {
  const response = await apiClient.patch<AIPreferences>("/ai/preferences", preferences);
  return response.data;
}

export async function submitAIFeedback(payload: {
  feature: string;
  sentiment: "positive" | "negative";
  reason_code?: string;
  context_id?: string;
}): Promise<void> {
  await apiClient.post("/ai/feedback", payload);
}
