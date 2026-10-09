import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { StorefrontAdviser } from "../storefront-adviser";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const advice = {
  generated_at: "2026-10-03T20:00:00Z",
  quality_score: 78,
  headline: "1 listing can be improved",
  summary: "Start with missing product detail.",
  funnel: {
    views_lifetime: 100,
    orders_30_days: 12,
    paid_orders_30_days: 8,
    abandoned_orders_30_days: 4,
    lifetime_conversion_rate: 8,
    explanation: "Paid orders are keeping pace with recorded abandoned orders.",
  },
  listings: [
    {
      product_id: 10,
      product_name: "Fast Soap",
      quality_score: 75,
      issues: ["Add more useful product detail"],
      units_sold_30_days: 0,
      recommendation: "promote",
      explanation: "No paid storefront sales in 30 days.",
      current_discount_percent: 0,
      max_safe_discount_percent: 20,
      suggested_discount_percent: 5,
      featured: false,
      bundle_label: null,
    },
  ],
  bundle_suggestions: [],
  reengagement_drafts: [],
};

function renderAdviser() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <StorefrontAdviser />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe("StorefrontAdviser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: advice });
  });

  it("shows verified funnel and listing-quality evidence", async () => {
    renderAdviser();

    expect(await screen.findByText("1 listing can be improved")).toBeVisible();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent?.replace(/\s+/g, " ").trim() ===
            "Quality score 78/100 · based on verified listings and paid orders",
      ),
    ).toBeVisible();
    expect(screen.getByText("8.0%")).toBeVisible();
    expect(screen.getByText("Add more useful product detail")).toBeVisible();
    expect(screen.getByText(/based on verified listings and paid orders/)).toBeVisible();
  });

  it("keeps generated copy as an editable draft until the merchant applies it", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        product_id: 10,
        description: "Fast Soap is available per piece from this store.",
        ai_generated: true,
        generation_notice: null,
      },
    });
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    renderAdviser();

    await screen.findByText("Fast Soap");
    await user.click(screen.getByRole("button", { name: "Draft verified copy" }));

    const draft = await screen.findByLabelText("Review exact product description");
    await user.clear(draft);
    await user.type(draft, "Reviewed Fast Soap description with verified details.");
    expect(apiClient.patch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Apply this description" }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/ai/storefront/products/10/copy",
        { description: "Reviewed Fast Soap description with verified details." },
      );
    });
  });

  it("requires confirmation before applying a margin-safe promotion", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderAdviser();

    await screen.findByText("Fast Soap");
    await user.click(screen.getByRole("button", { name: "Review 5% promotion" }));

    expect(screen.getByText(/server will reject anything above its 20% margin-safe cap/)).toBeVisible();
    expect(apiClient.post).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm change" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/ai/storefront/products/10/promotion",
        { discount_percent: 5 },
      );
    });
  });

  it("preserves unsaved featured selections during background refresh", async () => {
    const user = userEvent.setup();
    const { client } = renderAdviser();
    const checkbox = await screen.findByRole("checkbox", { name: "Feature Fast Soap" });
    await user.click(checkbox);
    act(() => {
      client.setQueryData(["storefront-advice"], { ...advice, headline: "Fresh advice" });
    });
    await screen.findByText("Fresh advice");
    expect(checkbox).toBeChecked();
  });

  it("requires renewed confirmation after featured selections change", async () => {
    const user = userEvent.setup();
    renderAdviser();
    const checkbox = await screen.findByRole("checkbox", { name: "Feature Fast Soap" });
    await user.click(screen.getByRole("button", { name: "Save featured products" }));
    expect(screen.getByRole("button", { name: "Confirm change" })).toBeVisible();
    await user.click(checkbox);
    expect(screen.queryByRole("button", { name: "Confirm change" })).not.toBeInTheDocument();
  });

  it("locks other actions while reviewed copy is being applied", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { product_id: 10, description: "A verified product description for Fast Soap.", generation_notice: null },
    });
    vi.mocked(apiClient.patch).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderAdviser();
    await user.click(await screen.findByRole("button", { name: "Draft verified copy" }));
    await user.click(await screen.findByRole("button", { name: "Apply this description" }));
    expect(screen.getByLabelText("Review exact product description")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Feature Fast Soap" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
