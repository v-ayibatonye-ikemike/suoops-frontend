import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommerceAI } from "../commerce-ai";
import { Features } from "../features";
import { Protection } from "../protection";

describe("landing commerce positioning", () => {
  it("presents the complete governed AI suite", () => {
    render(<CommerceAI />);

    expect(
      screen.getByRole("heading", {
        name: "AI grounded in how your business actually runs",
      }),
    ).toBeVisible();
    expect(screen.getByText("Commerce Copilot")).toBeVisible();
    expect(screen.getByText("Collections Assistant")).toBeVisible();
    expect(screen.getByText("Inventory Adviser")).toBeVisible();
    expect(screen.getByText("Storefront Adviser")).toBeVisible();
    expect(screen.getByText("Buyer Shopping Assistant")).toBeVisible();
    expect(screen.getByText("Dispute Evidence Assistant")).toBeVisible();
    expect(
      screen.getByText(/AI cannot send reminders, change stock/),
    ).toBeVisible();
  });

  it("covers operations beyond invoicing", () => {
    render(<Features />);

    expect(screen.getByText("Run stock and purchasing")).toBeVisible();
    expect(screen.getByText("Recover revenue and control cash")).toBeVisible();
    expect(screen.getByText("See what the business is doing")).toBeVisible();
    expect(screen.getByText(/suppliers, SKUs, and barcodes/)).toBeVisible();
  });

  it("describes evidence-based buyer protection without promising an outcome", () => {
    render(<Protection />);

    expect(
      screen.getByText(/evidence-based review before funds are released/),
    ).toBeVisible();
    expect(screen.queryByText(/get a refund if it.*not resolved/i)).not.toBeInTheDocument();
  });
});
