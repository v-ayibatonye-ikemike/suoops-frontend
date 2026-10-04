import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommerceAI } from "../commerce-ai";
import { Features } from "../features";
import { Protection } from "../protection";

describe("landing commerce positioning", () => {
  it("presents grounded commerce intelligence with human control", () => {
    render(<CommerceAI />);

    expect(
      screen.getByRole("heading", {
        name: "Know what needs attention before it becomes a problem",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Commerce intelligence grounded in your real business"),
    ).toBeVisible();
    expect(screen.getByText("See the signal")).toBeVisible();
    expect(screen.getByText("Take the next best step")).toBeVisible();
    expect(screen.getByText("Keep decisions grounded")).toBeVisible();
    expect(
      screen.getByText(/AI cannot send reminders, change stock/),
    ).toBeVisible();
  });

  it("covers operations beyond invoicing", () => {
    render(<Features />);

    expect(screen.getByText("Sell anywhere")).toBeVisible();
    expect(screen.getByText("Get paid and deliver safely")).toBeVisible();
    expect(screen.getByText("Run the business")).toBeVisible();
    expect(screen.getByText("Know what needs attention")).toBeVisible();
  });

  it("describes evidence-based buyer protection without promising an outcome", () => {
    render(<Protection />);

    expect(
      screen.getByText(/evidence-based review before funds are released/),
    ).toBeVisible();
    expect(screen.queryByText(/get a refund if it.*not resolved/i)).not.toBeInTheDocument();
  });
});
