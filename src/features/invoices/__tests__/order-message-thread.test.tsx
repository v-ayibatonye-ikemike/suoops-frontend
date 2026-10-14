import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOrderMessages, sendOrderMessage } from "@/api/order-messages";
import { OrderMessageThread } from "../order-message-thread";

vi.mock("@/api/order-messages", () => ({
  getOrderMessages: vi.fn(),
  sendOrderMessage: vi.fn(),
}));

function setup(readOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <OrderMessageThread invoiceId="INV-1" readOnly={readOnly} />
    </QueryClientProvider>,
  );
}

describe("Seller order conversation", () => {
  beforeEach(() => vi.resetAllMocks());

  it("preserves evidence without a send action when messaging is closed", async () => {
    vi.mocked(getOrderMessages).mockResolvedValue([{
      id: 1, body: "The package has arrived.", sender_role: "buyer",
      mine: false, flagged: false, created_at: null,
    }]);
    setup(true);
    expect(await screen.findByText("The package has arrived.")).toBeVisible();
    expect(screen.getByText(/Messaging is closed/)).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    expect(sendOrderMessage).not.toHaveBeenCalled();
  });

  it("shows a retry rather than pretending failed history is an empty thread", async () => {
    vi.mocked(getOrderMessages).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce([]);
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load order messages.");
    expect(screen.queryByText(/No messages yet/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry messages" }));
    expect(await screen.findByText(/No messages yet/)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
