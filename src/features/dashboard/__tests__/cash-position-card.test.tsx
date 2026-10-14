import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCashPosition, type CashPosition } from "@/api/analytics";
import { CashPositionCard } from "../cash-position-card";

vi.mock("@/api/analytics", () => ({ getCashPosition: vi.fn() }));
vi.mock("@/hooks/use-currency", () => ({ useCurrency: () => ({ formatCompact: (value: number) => `₦${value}` }) }));

const cash: CashPosition = {
  cash_collected_today: 500, cash_collected_this_week: 1000,
  total_outstanding: 1500, outstanding_count: 2, total_overdue: 500, overdue_count: 1,
  expected_inflow_7_days: 1000, invoices_created_today: 2, expenses_today: 100, net_today: 400,
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><CashPositionCard /></QueryClientProvider>);
}

describe("Reconciled dashboard snapshot", () => {
  beforeEach(() => vi.resetAllMocks());

  it("shows verified outstanding counts, date scope and cart exclusions", async () => {
    vi.mocked(getCashPosition).mockResolvedValue(cash);
    setup();
    expect(await screen.findByText("2 invoices · 1 overdue")).toBeVisible();
    expect(screen.getByText("₦1500")).toBeVisible();
    expect(screen.getByText("Cash In Today (WAT)")).toBeVisible();
    expect(screen.getByText("Last 7 days: ₦1000")).toBeVisible();
    expect(screen.getByText(/Unpaid storefront checkouts are excluded/)).toBeVisible();
  });

  it("shows an error and retry instead of hiding failed metrics or substituting zero", async () => {
    vi.mocked(getCashPosition).mockRejectedValueOnce(new Error("offline"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your money snapshot");
    expect(screen.queryByText("₦0")).not.toBeInTheDocument();
    vi.mocked(getCashPosition).mockResolvedValue(cash);
    fireEvent.click(screen.getByRole("button", { name: "Retry snapshot" }));
    expect(await screen.findByText("₦1500")).toBeVisible();
  });
});
