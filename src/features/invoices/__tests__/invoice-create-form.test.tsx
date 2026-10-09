import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceCreateForm } from "../invoice-create-form";
import type { InvoiceCreatePayload } from "../use-create-invoice";

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn<(payload: InvoiceCreatePayload) => Promise<{ pdf_url: null }>>(),
}));

vi.mock("../use-create-invoice", () => ({
  useCreateInvoice: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("../use-invoice-quota", () => ({
  useInvoiceQuota: () => ({
    data: { can_create: true, invoice_balance: 10, current_plan: "FREE" },
    isLoading: false,
  }),
}));
vi.mock("@/features/inventory", () => ({
  useProducts: () => ({ data: { products: [] } }),
}));
vi.mock("@/hooks/use-currency", () => ({
  useCurrency: () => ({ exchangeRate: 1500 }),
}));
vi.mock("../../settings/plan-selection-modal", () => ({
  PlanSelectionModal: () => null,
}));
vi.mock("../whatsapp-tip", () => ({ WhatsAppTip: () => null }));

function setup() {
  render(<InvoiceCreateForm />);
  fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "  Buyer  " } });
}

function line(index: number, description: string, price: string, quantity = "1") {
  fireEvent.change(screen.getAllByPlaceholderText("What are you charging for?")[index], {
    target: { value: description },
  });
  fireEvent.change(screen.getAllByPlaceholderText("0.00")[index], { target: { value: price } });
  fireEvent.change(screen.getAllByPlaceholderText("1")[index], { target: { value: quantity } });
}

function submit() {
  const form = screen.getByRole("button", { name: /Create invoice & send/ }).closest("form");
  if (!form) throw new Error("Invoice form not found");
  fireEvent.submit(form);
}

describe("Invoice creation line consistency", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({ pdf_url: null });
  });

  it("preserves priced rows without descriptions instead of silently dropping them", async () => {
    setup();
    line(0, "  Design  ", "100");
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    line(1, "", "50", "2");
    submit();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      customer_name: "Buyer",
      amount: 200,
      lines: [
        { description: "Design", quantity: 1, unit_price: 100 },
        { description: "Item", quantity: 2, unit_price: 50 },
      ],
    });
  });

  it("retains quantity and unit price for a single unnamed line", async () => {
    setup();
    line(0, "", "100", "2");
    submit();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync.mock.calls[0][0].lines).toEqual([
      { description: "Item", quantity: 2, unit_price: 100, product_id: null },
    ]);
  });

  it.each(["0", "-1", "1.5"])("rejects invalid quantity %s rather than coercing or sending it", (quantity) => {
    setup();
    line(0, "Design", "10", "1");
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    line(1, "Another item", "1", quantity);
    submit();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/quantity.*positive whole number/i)).toBeVisible();
  });

  it("rejects whitespace-only customer names", () => {
    setup();
    line(0, "Design", "100");
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "   " } });
    submit();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/Customer name.*required/)).toBeVisible();
  });

  it("sends a cent-rounded total and displays fractional naira amounts", async () => {
    setup();
    line(0, "First item", "0.10");
    fireEvent.click(screen.getByRole("button", { name: "Add line" }));
    line(1, "Second item", "0.20");
    expect(screen.getByText("₦0.3")).toBeVisible();
    submit();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync.mock.calls[0][0].amount).toBe(0.3);
  });

  it("provides accessible field labels and accurate optional due-date guidance", () => {
    setup();
    expect(screen.getByRole("textbox", { name: "Customer name" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Customer phone" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Customer email" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Description" })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Qty" })).toBeVisible();
    expect(screen.getByRole("spinbutton", { name: "Unit Price (₦)" })).toBeVisible();
    expect(screen.queryByText(/defaults to 3 days/)).not.toBeInTheDocument();
  });
});
