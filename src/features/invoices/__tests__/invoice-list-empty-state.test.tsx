import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceListWithDetail } from "../invoice-list-with-detail";
import { useInvoices } from "../use-invoices";

const openInvoiceDrawer = vi.fn();
const location = vi.hoisted(() => ({ query: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(location.query),
}));

vi.mock("../use-invoices", () => ({
  useInvoices: vi.fn(),
}));

vi.mock("@/features/dashboard/new-invoice-provider", () => ({
  useNewInvoiceDrawer: () => ({
    open: openInvoiceDrawer,
    close: vi.fn(),
  }),
}));

vi.mock("@/features/dashboard/whatsapp-quick-create", () => ({
  WhatsAppQuickCreate: ({
    children,
  }: {
    children: (props: {
      onClick: () => void;
      href: string;
      target: string;
      rel: string;
    }) => React.ReactNode;
  }) =>
    children({
      onClick: vi.fn(),
      href: "https://wa.me/2348106865807",
      target: "_blank",
      rel: "noopener noreferrer",
    }),
}));

const mockUseInvoices = vi.mocked(useInvoices);

describe("InvoiceListWithDetail empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    location.query = "";
    mockUseInvoices.mockReturnValue({
      data: {
        items: [],
        total: 0,
        skip: 0,
        limit: 50,
        has_more: false,
        status_counts: {
          all: 0,
          pending: 0,
          awaiting_confirmation: 0,
          paid: 0,
        },
      },
      isLoading: false,
      error: null,
      isFetching: false,
    } as unknown as ReturnType<typeof useInvoices>);
  });

  it("offers the existing web drawer first and WhatsApp second", async () => {
    const user = userEvent.setup();
    render(<InvoiceListWithDetail />);

    const createButton = screen.getByRole("button", {
      name: /create invoice/i,
    });
    expect(
      screen.getByRole("link", { name: /use whatsapp/i }),
    ).toHaveAttribute("href", "https://wa.me/2348106865807");

    await user.click(createButton);
    expect(openInvoiceDrawer).toHaveBeenCalledOnce();
  });

  it("applies assistant status and date filters to the server query", async () => {
    location.query = "status=unpaid&start_date=2026-09-01&end_date=2026-09-30";
    const view = render(<InvoiceListWithDetail />);
    expect(mockUseInvoices).toHaveBeenLastCalledWith(0, 50, {
      status: "unpaid", search: "", start_date: "2026-09-01", end_date: "2026-09-30",
    });
    expect(screen.getByLabelText("From date")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("To date")).toHaveValue("2026-09-30");
    location.query = "status=paid";
    view.rerender(<InvoiceListWithDetail />);
    await waitFor(() => expect(mockUseInvoices).toHaveBeenLastCalledWith(0, 50, {
      status: "paid", search: "", start_date: "", end_date: "",
    }));
  });
});
