import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { StoreCatalog, type StoreProduct } from "../store-catalog";

const products: StoreProduct[] = [
  {
    id: 1,
    name: "Soap",
    description: "A clear soap listing.",
    price: 9000,
    original_price: 10000,
    discount_percent: 10,
    unit: "pcs",
    image_url: "https://example.com/soap.png",
    in_stock: true,
    bundle_label: "Cleaning pair",
  },
  {
    id: 2,
    name: "Sponge",
    description: "A clear sponge listing.",
    price: 2000,
    original_price: 2000,
    discount_percent: 0,
    unit: "pcs",
    image_url: "https://example.com/sponge.png",
    in_stock: true,
    bundle_label: "Cleaning pair",
  },
];

describe("StoreCatalog merchandising", () => {
  it("shows approved discounts and lets a buyer add a shop-together bundle", async () => {
    const user = userEvent.setup();
    render(
      <StoreCatalog
        slug="good-store"
        storeName="Good Store"
        products={products}
        onlinePaymentsEnabled
      />,
    );

    expect(screen.getByText("Shop together")).toBeVisible();
    expect(screen.getByText("Cleaning pair")).toBeVisible();
    expect(screen.getByText("₦10,000")).toHaveClass("line-through");

    await user.click(screen.getByRole("button", { name: "Add all" }));

    expect(screen.getByText("2 items · ₦11,000")).toBeVisible();
  });
});
