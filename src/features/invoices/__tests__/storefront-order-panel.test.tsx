import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";

import { apiClient } from "@/api/client";
import { StorefrontOrderPanel, type OrderEscrow } from "../storefront-order-panel";

vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../order-message-thread", () => ({
  OrderMessageThread: ({ readOnly }: { readOnly?: boolean }) => (
    <div>{readOnly ? "Read-only conversation" : "Active conversation"}</div>
  ),
}));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const base: OrderEscrow = {
  status: "held", held: true, held_for_review: false, gross_naira: 5000, payout_naira: 4850,
  release_due_at: "2099-01-01T00:00:00Z", confirmed_at: null, delivered_at: null,
  delivery_proof_note: null, delivery_proof_url: null,
  customer_name: "Buyer", customer_phone: null,
  dispatched_at: null, dispatch_tracking: null, dispatch_note: null, dispatch_carrier: null,
  dispatch_eta: null, dispatch_proof_url: null, dispatch_tracking_url: null,
  delivery_status: null, delivery_status_label: null, delivery_status_at: null,
  delivery_courier: "Test Courier", delivery_service_type: "pickup",
  delivery_dropoff_station: null, requires_delivery: true,
};

function setup(overrides: Partial<OrderEscrow> = {}) {
  const order = { ...base, ...overrides };
  vi.mocked(apiClient.get).mockResolvedValue({ data: { escrow: order } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><StorefrontOrderPanel invoiceId="INV-1" /></QueryClientProvider>);
}

describe("Storefront courier booking", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(
    ["disputed", "refund_pending", "refunded", "released"].flatMap((status) =>
      [true, false].map((requires_delivery) => ({ status, requires_delivery })),
    ),
  )(
    "keeps the conversation read-only for $status, delivery=$requires_delivery",
    async ({ status, requires_delivery }) => {
      setup({ status, held: false, requires_delivery });
      expect(await screen.findByText("Read-only conversation")).toBeVisible();
      expect(screen.queryByText("Active conversation")).not.toBeInTheDocument();
    },
  );

  it("requests a booking without claiming the order was sent", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Book courier pickup" }));
    expect(screen.getByText(/Wait for booking confirmation before expecting collection/)).toBeVisible();
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    if (!input) throw new Error("Missing package photo input");
    fireEvent.change(input, { target: { files: [new File(["photo"], "packed.jpg", { type: "image/jpeg" })] } });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { escrow: { ...base, delivery_status: "booking_pending" } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ready for pickup — book courier" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Courier booking requested — wait for confirmation."));
    expect(toast.success).not.toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it.each(["booking_pending", "booking_in_progress", "booking_unknown"])(
    "does not offer a second booking for %s",
    async (status) => {
      setup({ delivery_status: status, delivery_status_label: "Courier booking not confirmed" });
      expect(await screen.findByText("Courier booking not confirmed")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Book courier pickup" })).not.toBeInTheDocument();
      expect(screen.queryByText(/You marked this sent out/)).not.toBeInTheDocument();
      expect(screen.queryByText(/auto-releases to you in/)).not.toBeInTheDocument();
      expect(apiClient.post).not.toHaveBeenCalled();
    },
  );

  it("offers retry after a confirmed rejection and explains the failure", async () => {
    setup({
      delivery_status: "booking_failed", delivery_status_label: "Courier booking failed",
      dispatch_proof_url: "https://example.test/package.jpg",
    });
    expect(await screen.findByRole("button", { name: "Book courier pickup" })).toBeVisible();
    expect(screen.getByText(/The courier did not accept this booking/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Book courier pickup" }));
    expect(screen.getByRole("button", { name: "Ready for pickup — book courier" })).toBeEnabled();
    expect(screen.getByText(/Your saved package photo will be reused/)).toBeVisible();
  });

  it("refreshes a pending request until the confirmed status arrives", async () => {
    setup({
      delivery_status: "booking_pending", delivery_status_label: "Courier booking requested",
      delivery_status_at: new Date().toISOString(),
    });
    await screen.findByText("Courier booking requested");
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { escrow: { ...base, delivery_status: "booked", delivery_status_label: "Booking confirmed" } },
    });
    expect(await screen.findByText("Booking confirmed", {}, { timeout: 5000 })).toBeVisible();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("refreshes persisted booking state after losing the submit response", async () => {
    setup({ dispatch_proof_url: "https://example.test/package.jpg" });
    fireEvent.click(await screen.findByRole("button", { name: "Book courier pickup" }));
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Network timeout"));
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { escrow: { ...base, delivery_status: "booking_pending", delivery_status_label: "Checking courier booking" } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ready for pickup — book courier" }));
    expect(await screen.findByText("Checking courier booking")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ready for pickup — book courier" })).not.toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalled();
  });

  it("shows confirmed booking without dispatch and without another booking action", async () => {
    setup({ delivery_status: "booked", delivery_status_label: "Booking confirmed — awaiting courier pickup" });
    expect(await screen.findByText("Booking confirmed — awaiting courier pickup")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Book courier pickup" })).not.toBeInTheDocument();
    expect(screen.queryByText(/You marked this sent out/)).not.toBeInTheDocument();
  });

  it("does not present a legacy unconfirmed timestamp as courier dispatch", async () => {
    setup({
      dispatched_at: "2026-10-01T00:00:00Z",
      delivery_status: "booking_unknown", delivery_status_label: "Courier booking unconfirmed",
    });
    expect(await screen.findByText("Courier booking unconfirmed")).toBeVisible();
    expect(screen.queryByText(/Courier reported the order on its way/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Book courier pickup" })).not.toBeInTheDocument();
  });

  it("explains that drop-off orders must be taken to a station after confirmation", async () => {
    setup({ delivery_service_type: "dropoff", delivery_dropoff_station: "Ikeja station" });
    fireEvent.click(await screen.findByRole("button", { name: "Book drop-off delivery" }));
    expect(screen.getByText(/After booking is confirmed, drop this package off/)).toBeVisible();
    expect(screen.getByText(/Ikeja station/)).toBeVisible();
    expect(screen.queryByText(/pickup from your store address/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Package ready — book drop-off" })).toBeDisabled();
  });

  it("shows the server-owned next step without automatically requesting pickup", async () => {
    setup({ next_step: "Pack the order, add a package photo, then confirm it is ready to book the selected courier." });
    expect(await screen.findByRole("status")).toHaveTextContent("Next step: Pack the order");
    fireEvent.click(screen.getByRole("button", { name: "Book courier pickup" }));
    expect(screen.getByRole("button", { name: "Ready for pickup — book courier" })).toBeDisabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("preserves manual dispatch without promising a courier", async () => {
    setup({ delivery_courier: null, delivery_service_type: null });
    expect(await screen.findByRole("button", { name: "Mark as sent out" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Book courier pickup" })).not.toBeInTheDocument();
  });

  it("allows delivery evidence during a dispute without offering a courier booking", async () => {
    setup({ status: "disputed", held: false });
    expect(await screen.findByRole("button", { name: "Mark as delivered" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Book courier pickup" })).not.toBeInTheDocument();
  });

  it("shows settlement rather than an expired protection-window countdown", async () => {
    setup({
      delivery_courier: null, release_due_at: "2020-01-01T00:00:00Z",
      settle_at: "2099-01-01T00:00:00Z", confirmed_at: "2026-10-14T09:00:00Z",
    });
    expect(await screen.findByText(/eligible for payout in/)).toBeVisible();
    expect(screen.queryByText(/any moment now/)).not.toBeInTheDocument();
    expect(screen.queryByText(/auto-releases to you/)).not.toBeInTheDocument();
  });

  it("does not show an in-flight payout as paid", async () => {
    setup({ payout_pending: true });
    expect(await screen.findByText("Payout submitted — awaiting payment-provider confirmation.")).toBeVisible();
    expect(screen.queryByText(/Released — paid out to you/)).not.toBeInTheDocument();
  });

  it("shows unresolved refunds without offering fulfillment actions", async () => {
    setup({ status: "refund_pending", held: false, held_for_review: true });
    expect(await screen.findByText(/Refund submission under review/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Mark as delivered" })).not.toBeInTheDocument();
  });

  it("surfaces status-loading errors with a retry action", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Unavailable"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not load/);
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
