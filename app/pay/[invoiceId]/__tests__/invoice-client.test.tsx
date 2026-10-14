import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceClient } from "../invoice-client";

const invoice = { invoice_id: "INV-1", status: "paid", amount: "1000", business_name: "Test store" };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

describe("Payment return recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, "", "/pay/INV-1?ref=INVPAY-RETURN");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("reconciles protection on return even when the invoice is already paid", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ status: "paid" })).mockResolvedValueOnce(json(invoice));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => render(<InvoiceClient initialInvoice={invoice} invoiceId="INV-1" apiBaseUrl="http://api.test" />));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/public/invoices/INV-1/verify?reference=INVPAY-RETURN", { method: "POST" },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("offers reconciliation retry without asking a debited buyer to pay again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ status: "paid" }))
      .mockResolvedValueOnce(json(invoice)));
    await act(async () => render(<InvoiceClient initialInvoice={invoice} invoiceId="INV-1" apiBaseUrl="http://api.test" />));
    expect(screen.getByRole("alert")).toHaveTextContent("If you were debited, don't pay again.");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Check payment again" })));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("continues polling after a temporary HTTP failure", async () => {
    window.history.replaceState({}, "", "/pay/INV-1");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json(invoice));
    vi.stubGlobal("fetch", fetchMock);
    render(<InvoiceClient initialInvoice={{ ...invoice, status: "pending" }} invoiceId="INV-1" apiBaseUrl="http://api.test" />);
    await act(async () => vi.advanceTimersByTimeAsync(8000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(12000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText("Payment Confirmed")).toHaveLength(2);
  });
});
