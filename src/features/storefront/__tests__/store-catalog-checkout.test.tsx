import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StoreCatalog, type StoreProduct } from "../store-catalog";

vi.mock("../buyer-shopping-assistant", () => ({
  BuyerShoppingAssistant: () => null,
}));

vi.mock("../current-location-capture", () => ({
  CurrentLocationCapture: ({
    onCapture,
  }: {
    onCapture: (location: { lat: number; lng: number; accuracy: number }) => void;
  }) => (
    <button onClick={() => onCapture({ lat: 6.5, lng: 3.4, accuracy: 10 })}>
      Capture location
    </button>
  ),
}));

const product: StoreProduct = {
  id: 1,
  name: "Soap",
  description: null,
  price: 1000,
  unit: "pcs",
  image_url: null,
  in_stock: true,
};

const courier = {
  courier_id: "courier-1",
  service_code: "standard",
  name: "Test courier",
  image: null,
  amount: 500,
  currency: "NGN",
  delivery_eta: null,
  service_type: null,
};

function quote(amount = 500) {
  return new Response(
    JSON.stringify({ enabled: true, options: [{ ...courier, amount }] }),
    { status: 200 },
  );
}

function checkout() {
  render(
    <StoreCatalog
      slug="test-store"
      storeName="Test store"
      products={[product]}
      onlinePaymentsEnabled
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  fireEvent.click(screen.getByRole("button", { name: /Checkout/ }));
  fireEvent.change(screen.getByPlaceholderText("Your name"), {
    target: { value: "Buyer" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Your phone/), {
    target: { value: "08012345678" },
  });
  fireEvent.change(screen.getByPlaceholderText(/Full delivery address/), {
    target: { value: "12 Test Road" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Capture location" }));
}

async function fetchQuote() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
}

describe("StoreCatalog checkout quotes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("blocks payment during both the debounce and the quote request", async () => {
    let resolveQuote!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveQuote = resolve;
    })));
    checkout();
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeDisabled();
    await fetchQuote();
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeDisabled();

    await act(async () => resolveQuote(quote()));
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Test courier/ }));
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeEnabled();
  });

  it.each(["http", "network"])("shows %s quote failures and allows a retry", async (failure) => {
    const fetchMock = vi.fn();
    if (failure === "http") {
      fetchMock.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    } else {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    }
    fetchMock.mockResolvedValueOnce(quote());
    vi.stubGlobal("fetch", fetchMock);
    checkout();
    await fetchQuote();

    expect(screen.getByRole("alert")).toHaveTextContent(/delivery options/i);
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry delivery options" }));
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: /Test courier/ }));
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("refreshes the selected courier price when the destination changes", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(quote(500))
      .mockResolvedValueOnce(quote(800)));
    checkout();
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: /Test courier/ }));
    expect(screen.getByRole("button", { name: "Pay ₦1,530" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Capture location" }));
    await fetchQuote();
    expect(screen.getByRole("button", { name: "Pay ₦1,830" })).toBeEnabled();
  });

  it("ignores a superseded quote even if its transport does not honor abort", async () => {
    let resolveOldQuote!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveOldQuote = resolve;
      }))
      .mockResolvedValueOnce(quote(800)));
    checkout();
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: "Capture location" }));
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: /Test courier/ }));

    await act(async () => resolveOldQuote(quote(500)));
    expect(screen.getByRole("button", { name: /Test courier/ })).toHaveTextContent("₦800");
    expect(screen.getByRole("button", { name: "Pay ₦1,830" })).toBeEnabled();
  });

  it("allows explicit self-pickup after a quote failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Offline")));
    checkout();
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: /I don.t need delivery/ }));
    expect(screen.getByRole("button", { name: "Pay ₦1,030" })).toBeEnabled();
  });

  it.each([
    { enabled: false, options: [] },
    { enabled: true, options: [] },
  ])("preserves checkout when the server offers no couriers: %j", async (data) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 }),
    ));
    checkout();
    await fetchQuote();
    expect(screen.getByRole("button", { name: "Pay ₦1,030" })).toBeEnabled();
  });

  it("does not let an aborted request clear the replacement request's loading state", async () => {
    let rejectOldQuote!: (error: Error) => void;
    let resolveNewQuote!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((_, reject) => {
        rejectOldQuote = reject;
      }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveNewQuote = resolve;
      })));
    checkout();
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: "Capture location" }));
    await fetchQuote();
    await act(async () => rejectOldQuote(new DOMException("Aborted", "AbortError")));
    expect(screen.getByText(/Fetching courier options/)).toBeVisible();
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => resolveNewQuote(quote()));
    expect(screen.queryByText(/Fetching courier options/)).not.toBeInTheDocument();
  });

  it("blocks duplicate order submissions before React rerenders", async () => {
    let rejectOrder!: (error: Error) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(quote())
      .mockImplementation(() => new Promise<Response>((_, reject) => {
        rejectOrder = reject;
      }));
    vi.stubGlobal("fetch", fetchMock);
    checkout();
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: /Test courier/ }));
    const pay = screen.getByRole("button", { name: /^Pay/ });
    act(() => {
      pay.click();
      pay.click();
    });
    const orderCalls = fetchMock.mock.calls.filter(
      ([url]) => String(url).endsWith("/order"),
    );
    expect(orderCalls).toHaveLength(1);
    await act(async () => rejectOrder(new Error("Order unavailable")));
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeEnabled();
    expect(screen.getByText("Order unavailable")).toBeVisible();
  });

  it("does not open checkout from a QR link when online payments are disabled", () => {
    window.history.replaceState({}, "", "/store/test-store?p=1");
    render(
      <StoreCatalog
        slug="test-store"
        storeName="Test store"
        products={[product]}
        onlinePaymentsEnabled={false}
      />,
    );
    expect(screen.queryByText("Your order")).not.toBeInTheDocument();
  });
});
