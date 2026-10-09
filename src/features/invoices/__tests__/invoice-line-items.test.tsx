import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceLineItems } from "../invoice-line-items";

const state = vi.hoisted(() => ({ rate: null as number | null }));

vi.mock("@/features/inventory", () => ({
  useProducts: () => ({
    data: { products: [{ id: 1, name: "Mug", sku: "MUG", selling_price: 1500, quantity_in_stock: 5 }] },
  }),
}));
vi.mock("@/hooks/use-currency", () => ({
  useCurrency: () => ({ exchangeRate: state.rate }),
}));

function setup(currency: "NGN" | "USD") {
  const update = vi.fn();
  render(
    <InvoiceLineItems
      lines={[{ id: "first", description: "", quantity: 1, unit_price: 0 }]}
      onUpdateLine={update}
      onRemoveLine={vi.fn()}
      onAddLine={vi.fn()}
      currency={currency}
      showProductPicker
    />,
  );
  return update;
}

describe("Inventory prices on USD invoices", () => {
  beforeEach(() => {
    state.rate = null;
  });

  it.each([null, 0, -10, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not label an NGN price as USD when the exchange rate is %s",
    (rate) => {
      state.rate = rate;
      const update = setup("USD");
      const picker = screen.queryByPlaceholderText("Search products...");
      if (picker) {
        fireEvent.focus(picker);
        fireEvent.click(screen.getByRole("button", { name: /Mug/ }));
      }
      expect(update).not.toHaveBeenCalled();
      expect(screen.queryByPlaceholderText("Search products...")).not.toBeInTheDocument();
      expect(screen.getByText(/exchange rate.*unavailable/i)).toBeVisible();
      expect(screen.getByRole("spinbutton", { name: "Unit Price ($)" })).toBeEnabled();
      fireEvent.change(screen.getByRole("spinbutton", { name: "Unit Price ($)" }), {
        target: { value: "5" },
      });
      expect(update).toHaveBeenCalledWith("first", { unit_price: 5 });
    },
  );

  it("converts product prices using an available exchange rate", () => {
    state.rate = 1500;
    const update = setup("USD");
    fireEvent.focus(screen.getByPlaceholderText("Search products..."));
    fireEvent.click(screen.getByRole("button", { name: /Mug/ }));
    expect(update).toHaveBeenCalledWith("first", {
      product_id: 1, description: "Mug", unit_price: 1,
    });
  });

  it("does not require an exchange rate to select NGN products", () => {
    const update = setup("NGN");
    fireEvent.focus(screen.getByPlaceholderText("Search products..."));
    fireEvent.click(screen.getByRole("button", { name: /Mug/ }));
    expect(update).toHaveBeenCalledWith("first", {
      product_id: 1, description: "Mug", unit_price: 1500,
    });
  });
});
