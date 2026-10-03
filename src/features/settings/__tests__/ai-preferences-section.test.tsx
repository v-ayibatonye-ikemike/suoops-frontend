import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { AIPreferencesSection } from "../ai-preferences-section";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderSection() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <AIPreferencesSection />
    </QueryClientProvider>,
  );
}

describe("AIPreferencesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        enabled: true,
        feature_overrides: {},
        available_features: {
          daily_briefing: "Commerce Copilot narratives",
          buyer_shopping_assistant: "Buyer shopping ranking",
        },
        updated_at: null,
      },
    });
    vi.mocked(apiClient.patch).mockImplementation(async (_url, payload) => ({
      data: {
        ...(payload as object),
        available_features: {
          daily_briefing: "Commerce Copilot narratives",
          buyer_shopping_assistant: "Buyer shopping ranking",
        },
        updated_at: "2026-10-03T22:00:00Z",
      },
    }));
  });

  it("lets the workspace admin opt out without disabling deterministic commerce logic", async () => {
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText("Commerce Copilot narratives")).toBeVisible();
    const master = screen.getByRole("checkbox", { name: /Enable optional AI assistance/ });
    await user.click(master);
    expect(screen.getByText(/Financial calculations, stock quantities, prices/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save AI preferences" }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/ai/preferences", {
        enabled: false,
        feature_overrides: {},
      });
    });
  });
});
