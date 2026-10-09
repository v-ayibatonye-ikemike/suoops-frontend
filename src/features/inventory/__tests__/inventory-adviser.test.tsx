import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { InventoryAdviser } from "../inventory-adviser";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const advice = {
  generated_at: "2026-10-03T20:00:00Z",
  lookback_days: 30,
  target_cover_days: 30,
  headline: "1 product may need restocking",
  summary: "Recommendations use recorded sales, current stock and open purchase orders.",
  ai_generated: false,
  generation_notice: null,
  reorder_count: 1,
  slow_stock_count: 1,
  estimated_reorder_cost: 14000,
  recommendations: [
    {
      product_id: 10,
      product_name: "Fast Soap",
      sku: "SOAP",
      unit: "pcs",
      current_stock: 5,
      incoming_stock: 0,
      units_sold_30_days: 15,
      daily_sales_velocity: 0.5,
      days_of_stock: 10,
      demand_trend: "rising",
      recommendation: "reorder_now",
      recommended_order_quantity: 14,
      estimated_order_cost: 14000,
      explanation:
        "15 pcs sold in 30 days (0.50/day); about 10 days of stock remain. Recommend ordering 14 pcs.",
      reason_codes: ["less_than_14_days_cover", "demand_rising"],
    },
    {
      product_id: 11,
      product_name: "Old Mug",
      sku: "MUG",
      unit: "pcs",
      current_stock: 20,
      incoming_stock: 0,
      units_sold_30_days: 0,
      daily_sales_velocity: 0,
      days_of_stock: null,
      demand_trend: "no_sales",
      recommendation: "slow_stock",
      recommended_order_quantity: 0,
      estimated_order_cost: null,
      explanation: "No sales were recorded in 60 days and 20 pcs remain.",
      reason_codes: ["no_sales_60_days"],
    },
  ],
};

function renderAdviser() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <InventoryAdviser />
    </QueryClientProvider>,
  );
}

describe("InventoryAdviser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: advice });
  });

  it("shows verified velocity, cover, reorder and slow-stock evidence", async () => {
    renderAdviser();

    expect(await screen.findByText("1 product may need restocking")).toBeVisible();
    expect(screen.getByText("15 pcs")).toBeVisible();
    expect(screen.getByText("10 days")).toBeVisible();
    expect(screen.getByText("Suggested order: 14 pcs")).toBeVisible();
    expect(screen.getByText("Slow stock")).toBeVisible();
    expect(screen.getByText(/Verified from 30-day sales/)).toBeVisible();
  });

  it("requires explicit confirmation before creating a draft purchase order", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        id: 8,
        order_number: "PO-100",
        status: "draft",
        total_amount: 14000,
        lines: [
          {
            product_id: 10,
            product_name: "Fast Soap",
            quantity: 14,
            unit_cost: 1000,
            total_cost: 14000,
          },
        ],
        created: true,
        notice: "Draft purchase order created. Review supplier, costs and quantities before sending it.",
      },
    });
    const user = userEvent.setup();
    renderAdviser();

    await screen.findByText("Fast Soap");
    await user.click(screen.getByRole("button", { name: "Review draft purchase order" }));

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.getByText(/Nothing will be sent to a supplier/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm draft" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/ai/inventory/purchase-orders", {
        product_ids: [10],
      });
    });
    expect(await screen.findByText("Draft PO-100")).toBeVisible();
  });

  it("preserves deselected products when AI explanations arrive", async () => {
    const user = userEvent.setup();
    renderAdviser();
    const checkbox = await screen.findByRole("checkbox", { name: /Select Fast Soap/ });
    await user.click(checkbox);
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { ...advice, headline: "Updated explanation", ai_generated: true },
    });
    await user.click(screen.getByRole("button", { name: "Explain with AI" }));
    await screen.findByText("Updated explanation");
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Review draft purchase order" })).not.toBeInTheDocument();
  });

  it("reports an explanation failure without removing verified advice", async () => {
    const user = userEvent.setup();
    renderAdviser();
    await screen.findByText("Fast Soap");
    vi.mocked(apiClient.get).mockRejectedValue(new Error("offline"));
    await user.click(screen.getByRole("button", { name: "Explain with AI" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/explanation/i);
    expect(screen.getByText("Fast Soap")).toBeVisible();
  });

  it("preserves fractional naira in reorder estimates", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { ...advice, estimated_reorder_cost: 14000.5 } });
    renderAdviser();
    expect(await screen.findByText("₦14,000.50")).toBeVisible();
  });
});
