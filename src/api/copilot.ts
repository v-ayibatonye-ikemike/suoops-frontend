import { apiClient } from "./client";

export interface CopilotAction {
  id: string;
  action_type: string;
  title: string;
  reason: string;
  action_url: string;
  status: "proposed" | "accepted" | "dismissed";
  created_at: string;
}

export interface CopilotBriefing {
  generated_at: string;
  data_as_of: string;
  headline: string;
  summary: string;
  ai_generated: boolean;
  generation_notice: string | null;
  facts: Record<string, unknown>;
  actions: CopilotAction[];
  suggested_questions: string[];
}

export interface CopilotAnswer {
  intent: string;
  answer: string;
  evidence: string[];
  generated_at: string;
  suggested_questions: string[];
}

export async function getCopilotBriefing(): Promise<CopilotBriefing> {
  const response = await apiClient.get<CopilotBriefing>("/ai/copilot/briefing");
  return response.data;
}

export async function askCopilot(question: string): Promise<CopilotAnswer> {
  const response = await apiClient.post<CopilotAnswer>("/ai/copilot/ask", {
    question,
  });
  return response.data;
}

export async function decideCopilotAction(
  actionId: string,
  decision: "accepted" | "dismissed",
): Promise<CopilotAction> {
  const response = await apiClient.post<CopilotAction>(
    `/ai/copilot/actions/${actionId}/decision`,
    { decision },
  );
  return response.data;
}
