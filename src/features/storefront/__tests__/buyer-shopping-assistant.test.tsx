import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BuyerShoppingAssistant } from "../buyer-shopping-assistant";
import type { StoreProduct } from "../store-catalog";

const products: StoreProduct[] = [
  {
    id: 7,
    name: "Gentle Soap",
    description: "Everyday household soap",
    price: 3600,
    original_price: 4000,
    discount_percent: 10,
    unit: "piece",
    image_url: "https://example.com/soap.png",
    in_stock: true,
    category: "Home care",
    fulfilment_type: "physical",
  },
];

describe("BuyerShoppingAssistant", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows grounded matches and lets the buyer add the real catalog product", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "I found 1 verified option within ₦5,000. Prices and availability are current.",
        matches: [
          {
            product_id: 7,
            name: "Gentle Soap",
            price: 3600,
            original_price: 4000,
            discount_percent: 10,
            category: "Home care",
            fulfilment_type: "physical",
            reason: "Matches: soap.",
          },
        ],
        detected_budget: 5000,
        ai_ranked: true,
        notice: null,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onAdd = vi.fn();
    const user = userEvent.setup();

    render(
      <BuyerShoppingAssistant
        apiBaseUrl="https://api.example.com"
        slug="helpful-store"
        products={products}
        cartProductIds={[]}
        canAddToCart
        onAdd={onAdd}
      />,
    );

    await user.type(screen.getByLabelText("What are you looking for?"), "soap under 5000");
    await user.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByText(/I found 1 verified option/)).toBeVisible();
    expect(screen.getByText("Gentle Soap")).toBeVisible();
    expect(screen.getByText("Matches: soap.")).toBeVisible();
    expect(screen.getByText("AI-ranked from verified store facts.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledWith(7);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/public/store/helpful-store/shopping-assistant",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ query: "soap under 5000", cart_product_ids: [] }),
        }),
      );
    });
  });
});
