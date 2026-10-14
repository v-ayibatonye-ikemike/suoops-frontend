import { act, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(JSON.parse(orderCalls[0][1].body)).toMatchObject({ expected_total_kobo: 153000 });
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

  it("keeps keyboard focus inside checkout and restores it on Escape", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<StoreCatalog slug="test" storeName="Test" products={[product]} onlinePaymentsEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const opener = screen.getByRole("button", { name: /Checkout/ });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Your order" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    const first = within(dialog).getByRole("button", { name: "Close" });
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(first).not.toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Checkout/ })).toHaveFocus();
  });

  it("edits quantities and removes products without leaving checkout", () => {
    checkout();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add one Soap" }));
    expect(screen.getByRole("button", { name: "Pay ₦2,060" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Soap from order" }));
    expect(screen.getByText("Your cart is empty")).toBeVisible();
    expect(screen.getByRole("button", { name: /^Pay/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Continue shopping" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not allow more than the API's 50 units per product", () => {
    render(<StoreCatalog slug="test" storeName="Test" products={[product]} onlinePaymentsEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    for (let i = 1; i < 50; i++) fireEvent.click(screen.getByRole("button", { name: "Add one Soap" }));
    expect(screen.getByRole("button", { name: "Add one Soap" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Checkout/ })).toHaveTextContent("50 items");
  });

  it("shows category filters for small stores and recovers from empty searches", () => {
    render(
      <StoreCatalog
        slug="test" storeName="Test" onlinePaymentsEnabled
        products={[{ ...product, category: "Beauty" }, { ...product, id: 2, name: "Bag", category: "Clothing" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Beauty" }));
    expect(screen.queryByRole("heading", { name: "Bag" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
    expect(screen.getByText("No products match your search")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "Bag" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Soap" })).toBeVisible();
  });

  it("limits distinct products and prevents oversized bundles from bypassing that limit", () => {
    const products = Array.from({ length: 21 }, (_, index) => ({
      ...product, id: index + 1, name: `Product ${index + 1}`, bundle_label: "Essentials",
    }));
    render(<StoreCatalog slug="test" storeName="Test" products={products} onlinePaymentsEnabled />);
    expect(screen.getByRole("button", { name: "Add all" })).toBeDisabled();
    for (let i = 0; i < 20; i++) fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Checkout/ })).toHaveTextContent("20 items");
  });

  it("explains why payment is disabled instead of leaving the buyer guessing", () => {
    render(<StoreCatalog slug="test" storeName="Test" products={[product]} onlinePaymentsEnabled />);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: /Checkout/ }));
    expect(screen.getByText("Enter your name to continue.")).toBeVisible();
    expect(screen.getByLabelText("Your name")).toBeVisible();
    expect(screen.getByLabelText("Phone number")).toBeVisible();
  });

  it("shows structured validation errors as readable text", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(quote())
      .mockResolvedValueOnce(new Response(JSON.stringify({
        detail: [{ loc: ["body", "customer_phone"], msg: "Enter a valid phone number" }],
      }), { status: 422 })));
    checkout();
    await fetchQuote();
    fireEvent.click(screen.getByRole("button", { name: /Test courier/ }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Pay/ })));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid phone number");
    expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
  });
});
