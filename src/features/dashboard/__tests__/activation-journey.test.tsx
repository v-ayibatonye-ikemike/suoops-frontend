import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import {
  ActivationJourney,
  type ActivationState,
  getNextActivationAction,
} from "../activation-journey";

const openInvoiceDrawer = vi.fn();

vi.mock("@/features/dashboard/new-invoice-provider", () => ({
  useNewInvoiceDrawer: () => ({
    open: openInvoiceDrawer,
    close: vi.fn(),
  }),
}));

vi.mock("@/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

const completeState: ActivationState = {
  business_profile_ready: true,
  bank_details_ready: true,
  storefront_enabled: true,
  storefront_profile_ready: true,
  product_count: 1,
  online_payments_enabled: true,
  invoice_count: 1,
  paid_invoice_count: 1,
  progress_percent: 100,
};

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("getNextActivationAction", () => {
  it("prioritises core activation in a clear order", () => {
    expect(
      getNextActivationAction({
        ...completeState,
        business_profile_ready: false,
        bank_details_ready: false,
        invoice_count: 0,
      })?.id,
    ).toBe("business");
    expect(
      getNextActivationAction({
        ...completeState,
        bank_details_ready: false,
        invoice_count: 0,
      })?.id,
    ).toBe("bank");
    expect(
      getNextActivationAction({ ...completeState, invoice_count: 0 })?.id,
    ).toBe("invoice");
    expect(
      getNextActivationAction({
        ...completeState,
        online_payments_enabled: false,
        paid_invoice_count: 0,
      })?.id,
    ).toBe("payments");
    expect(
      getNextActivationAction({ ...completeState, paid_invoice_count: 0 })?.id,
    ).toBe("payment");
  });

  it("treats storefront setup as recommended rather than a core blocker", () => {
    const state = {
      ...completeState,
      storefront_enabled: false,
      storefront_profile_ready: false,
      product_count: 0,
      paid_invoice_count: 0,
    };

    expect(getNextActivationAction(state)?.id).toBe("payment");
    expect(
      getNextActivationAction({ ...state, paid_invoice_count: 1 })?.id,
    ).toBe("storefront");
    expect(getNextActivationAction(completeState)).toBeNull();
  });
});

describe("ActivationJourney", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows one next action, opens the existing drawer, and expands the checklist", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        ...completeState,
        invoice_count: 0,
        paid_invoice_count: 0,
        progress_percent: 40,
      },
    });
    const user = userEvent.setup();

    renderWithClient(<ActivationJourney />);

    const createButton = await screen.findByRole("button", {
      name: /create your first invoice/i,
    });
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.queryByText("Recommended growth step")).not.toBeInTheDocument();

    await user.click(createButton);
    expect(openInvoiceDrawer).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /view checklist/i }));
    expect(screen.getByText("Recommended growth step")).toBeVisible();
    expect(screen.getByText("Collect first payment")).toBeVisible();
  });
});
