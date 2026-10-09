import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceCreateForm } from "../invoice-create-form";
import type { InvoiceCreatePayload } from "../use-create-invoice";
import { NewInvoiceProvider, useNewInvoiceDrawer } from "@/features/dashboard/new-invoice-provider";
import type { AssistantInvoiceDraft } from "@/api/web-assistant";

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
vi.mock("../whatsapp-tip", () => ({ WhatsAppTip: () => <span>WhatsApp form tip</span> }));
vi.mock("@/features/dashboard/whatsapp-quick-create", () => ({
  WhatsAppQuickCreate: () => <span>WhatsApp shortcut</span>,
}));

let invoiceDrawer: ReturnType<typeof useNewInvoiceDrawer>;
function InvoiceActions() {
  invoiceDrawer = useNewInvoiceDrawer();
  return <button onClick={invoiceDrawer.open}>New invoice</button>;
}

const assistantDraft: AssistantInvoiceDraft = {
  customer_name: "Ada",
  currency: "NGN",
  lines: [{ description: "Design", quantity: 1, unit_price: 50000 }],
};

describe("Assistant invoice drawer integration", () => {
  beforeEach(() => mutateAsync.mockClear());

  it("reviews assistant details without submitting, protects edits and clears the next normal form", () => {
    render(<NewInvoiceProvider><InvoiceActions /></NewInvoiceProvider>);
    act(() => { invoiceDrawer.openDraft(assistantDraft); });
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("Ada");
    expect(screen.getByPlaceholderText("0.00")).toHaveValue(50000);
    expect(screen.queryByText("WhatsApp shortcut")).not.toBeInTheDocument();
    expect(screen.queryByText("WhatsApp form tip")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Walk-in sale (paid)" })).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Reviewed Ada" } });
    act(() => { expect(invoiceDrawer.openDraft({ ...assistantDraft, customer_name: "Other" })).toBe(false); });
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("Reviewed Ada");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).not.toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "New invoice" }));
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("");
    expect(screen.getByText("WhatsApp shortcut")).toBeVisible();
    expect(screen.getByText("WhatsApp form tip")).toBeVisible();
    expect(screen.getByRole("button", { name: "Walk-in sale (paid)" })).toBeVisible();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("accepts only one assistant draft when open requests share a render batch", () => {
    render(<NewInvoiceProvider><InvoiceActions /></NewInvoiceProvider>);
    const accepted: boolean[] = [];
    act(() => {
      accepted.push(invoiceDrawer.openDraft(assistantDraft));
      accepted.push(invoiceDrawer.openDraft({ ...assistantDraft, customer_name: "Other" }));
    });
    expect(accepted).toEqual([true, false]);
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("Ada");
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

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

  it("prefills a reviewed draft without submitting until the normal create action", async () => {
    render(<InvoiceCreateForm initialDraft={{
      customer_name: "Ada", currency: "USD",
      lines: [{ description: "Design", quantity: 1, unit_price: 25.5 }],
    }} />);
    expect(screen.getByRole("textbox", { name: "Customer name" })).toHaveValue("Ada");
    expect(screen.getByRole("spinbutton", { name: "Unit Price ($)" })).toHaveValue(25.5);
    expect(screen.getByRole("status")).toHaveTextContent("No invoice has been saved or sent");
    expect(mutateAsync).not.toHaveBeenCalled();
    line(0, "Reviewed design", "26.75");
    submit();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      customer_name: "Ada", currency: "USD", amount: 26.75,
      lines: [{ description: "Reviewed design", quantity: 1, unit_price: 26.75 }],
    });
    expect(screen.queryByText(/Prepared from your request/)).not.toBeInTheDocument();
  });

  it("requires missing draft details instead of inventing an amount", () => {
    render(<InvoiceCreateForm initialDraft={{ customer_name: "Ada", currency: "NGN", lines: [] }} />);
    submit();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/price must be greater than 0/);
  });
});
