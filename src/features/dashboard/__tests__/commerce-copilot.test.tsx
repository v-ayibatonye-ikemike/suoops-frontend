import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { CommerceCopilot } from "../commerce-copilot";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderCopilot() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <CommerceCopilot />
    </QueryClientProvider>,
  );
}

const briefing = {
  generated_at: "2026-10-03T20:00:00Z",
  data_as_of: "2026-10-03T20:00:00Z",
  headline: "₦45,000 needs collection attention",
  summary: "You collected ₦20,000 this week and ₦45,000 is overdue.",
  ai_generated: true,
  generation_notice: null,
  facts: {},
  actions: [
    {
      id: "action-1",
      action_type: "review_overdue_invoices",
      title: "Review 1 overdue invoice",
      reason: "₦45,000 is overdue and may need a follow-up.",
      action_url: "/dashboard/invoices",
      status: "proposed",
      created_at: "2026-10-03T20:00:00Z",
    },
  ],
  suggested_questions: [
    "How much did I collect this week?",
    "Who owes me money?",
    "What should I do today?",
  ],
};

describe("CommerceCopilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: briefing });
  });

  it("shows a grounded briefing and answers a suggested question", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        intent: "overdue",
        answer: "One invoice is overdue, totalling ₦45,000.",
        evidence: ["pending revenue invoices whose due date has passed"],
        generated_at: "2026-10-03T20:00:00Z",
        suggested_questions: [],
      },
    });
    const user = userEvent.setup();
    renderCopilot();

    expect(
      await screen.findByText("₦45,000 needs collection attention"),
    ).toBeVisible();
    expect(screen.getByText("Verified from your SuoOps business records · AI explained")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Who owes me money?" }));

    expect(
      await screen.findByText("One invoice is overdue, totalling ₦45,000."),
    ).toBeVisible();
    expect(apiClient.post).toHaveBeenCalledWith("/ai/copilot/ask", {
      question: "Who owes me money?",
    });
  });

  it("dismisses a proposed action and refreshes the briefing", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { ...briefing.actions[0], status: "dismissed" },
    });
    const user = userEvent.setup();
    renderCopilot();

    await screen.findByText("Review 1 overdue invoice");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/ai/copilot/actions/action-1/decision",
        { decision: "dismissed" },
      );
    });
  });

  it("records whether an AI explanation was useful", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { accepted: true },
    });
    const user = userEvent.setup();
    renderCopilot();

    await user.click(
      await screen.findByRole("button", {
        name: "AI explanation was useful",
      }),
    );

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/ai/feedback", {
        feature: "daily_briefing",
        sentiment: "positive",
        context_id: "dashboard_briefing",
      });
    });
    expect(await screen.findByText("Thanks for the feedback.")).toBeVisible();
  });

  it("offers retry instead of disappearing after a briefing failure", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    renderCopilot();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText(briefing.headline)).toBeVisible();
  });

  it("reports failed action decisions", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    renderCopilot();
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/action/i);
    expect(screen.getByText("Review 1 overdue invoice")).toBeVisible();
  });
});
