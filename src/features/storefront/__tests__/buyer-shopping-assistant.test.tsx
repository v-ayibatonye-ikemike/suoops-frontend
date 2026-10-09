import { act, render, screen, waitFor } from "@testing-library/react";
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

const recommendation = {
  answer: "Here is an available product.",
  matches: [{
    product_id: 7,
    name: "Old product name",
    price: 1000,
    original_price: 1000,
    discount_percent: 0,
    category: "Home care",
    fulfilment_type: "physical",
    reason: "Matches: soap.",
  }],
  detected_budget: null,
  ai_ranked: false,
  notice: null,
};

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

  it("uses the catalog's current price and prevents adding sold-out matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => recommendation }));
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<BuyerShoppingAssistant apiBaseUrl="https://api.example.com" slug="shop"
      products={[{ ...products[0], in_stock: false }]} cartProductIds={[]} canAddToCart onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: "What do you recommend?" }));
    await screen.findByText(recommendation.answer);
    expect(screen.getByText("Gentle Soap")).toBeVisible();
    expect(screen.getByText("₦3,600")).toBeVisible();
    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("aborts old-store requests and ignores their late responses", async () => {
    let resolveOld!: (value: unknown) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValue({ ok: true, json: async () => ({ ...recommendation, answer: "New store answer" }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const props = { apiBaseUrl: "https://api.example.com", products, cartProductIds: [], canAddToCart: true, onAdd: vi.fn() };
    const view = render(<BuyerShoppingAssistant {...props} slug="old-store" />);
    await user.click(screen.getByRole("button", { name: "What do you recommend?" }));
    const signal = fetchMock.mock.calls[0][1]?.signal as AbortSignal | undefined;
    view.rerender(<BuyerShoppingAssistant {...props} slug="new-store" />);
    expect(signal?.aborted).toBe(true);
    await user.click(screen.getByRole("button", { name: "What do you recommend?" }));
    await screen.findByText("New store answer");
    await act(async () => {
      resolveOld({ ok: true, json: async () => recommendation });
    });
    expect(screen.queryByText(recommendation.answer)).not.toBeInTheDocument();
    expect(screen.getByText("New store answer")).toBeVisible();
  });

  it("keeps suggested prompts from changing an in-flight question", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup();
    render(<BuyerShoppingAssistant apiBaseUrl="https://api.example.com" slug="shop"
      products={products} cartProductIds={[]} canAddToCart onAdd={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "What do you recommend?" }));
    expect(screen.getByRole("button", { name: "What services are available?" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel search" }));
    expect(screen.getByLabelText("What are you looking for?")).toHaveValue("");
    expect(screen.getByRole("button", { name: "What services are available?" })).toBeEnabled();
  });

  it.each([null, 0])("does not add a match whose catalog price is %s", async (price) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => recommendation }));
    const user = userEvent.setup();
    render(<BuyerShoppingAssistant apiBaseUrl="https://api.example.com" slug="shop"
      products={[{ ...products[0], price }]} cartProductIds={[]} canAddToCart onAdd={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "What do you recommend?" }));
    expect(await screen.findByRole("button", { name: "Unavailable" })).toBeDisabled();
  });
});
