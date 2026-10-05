import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/landing/hero", () => ({
  Hero: () => <div data-testid="hero" />,
}));
vi.mock("@/components/landing/marketplace", () => ({
  Marketplace: () => <div data-testid="marketplace" />,
}));
vi.mock("@/components/landing/features", () => ({
  Features: () => <div data-testid="features" />,
}));
vi.mock("@/components/landing/commerce-ai", () => ({
  CommerceAI: () => <div data-testid="commerce-ai" />,
}));
vi.mock("@/components/landing/protection", () => ({
  Protection: () => <div data-testid="protection" />,
}));
vi.mock("@/components/landing/pricing", () => ({
  Pricing: () => <div data-testid="pricing" />,
}));
vi.mock("@/components/landing/testimonials", () => ({
  Testimonials: () => <div data-testid="testimonials" />,
}));
vi.mock("@/components/landing/layout", () => ({
  Navigation: () => <div data-testid="navigation" />,
  CTASection: () => <div data-testid="cta" />,
  Footer: () => <div data-testid="footer" />,
  VideoModal: () => null,
}));

import HomePage from "../page";

describe("landing page", () => {
  it("shows the storefront immediately after navigation", () => {
    render(<HomePage />);

    const navigation = screen.getByTestId("navigation");
    const marketplace = screen.getByTestId("marketplace");
    const hero = screen.getByTestId("hero");

    expect(navigation.nextElementSibling).toBe(marketplace);
    expect(marketplace.nextElementSibling).toBe(hero);
  });
});
