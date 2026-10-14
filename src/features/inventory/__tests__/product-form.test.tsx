import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductForm } from "../product-form";

const state = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(), upload: vi.fn(), storefront: false, failRequirements: false,
}));
vi.mock("../use-inventory", () => ({
  useCategories: () => ({ data: [] }),
  useCreateProduct: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: state.update, isPending: false }),
  useUploadProductImage: () => ({ mutateAsync: state.upload, isPending: false }),
}));
vi.mock("@/hooks/use-currency", () => ({ useCurrency: () => ({ symbol: "₦" }) }));
vi.mock("@/api/payments-storefront", () => ({
  getStorefront: async () => {
    if (state.failRequirements) throw new Error("Offline");
    return { enabled: state.storefront };
  },
}));
vi.mock("../scan-to-pay-modal", () => ({ ScanToPayModal: () => null }));

function setup(initialType: "physical" | "service" = "physical", guided = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ProductForm guided={guided} initialType={initialType} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("Guided product creation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.storefront = false;
    state.failRequirements = false;
    state.create.mockResolvedValue({ id: 1 });
  });

  it("guides name, price and stock without creating anything until Add item is chosen", async () => {
    const { onClose } = setup();
    expect(screen.getByRole("dialog", { name: "Add item" })).toBeVisible();
    const name = screen.getByRole("textbox", { name: /Product name/ });
    expect(name).toHaveFocus();
    fireEvent.change(name, { target: { value: "Soap" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to selling price" }));
    expect(screen.getByRole("spinbutton", { name: /Price/ })).toHaveFocus();
    fireEvent.change(screen.getByRole("spinbutton", { name: /Price/ }), { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: "Review opening stock" }));
    const stock = screen.getByRole("spinbutton", { name: "How many in stock?" });
    expect(stock).toHaveFocus();
    fireEvent.change(stock, { target: { value: "5" } });
    expect(state.create).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add item" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      name: "Soap", selling_price: 2500, quantity_in_stock: 5, fulfilment_type: "physical", track_stock: true,
    })));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows storefront description and photo requirements before review", async () => {
    state.storefront = true;
    setup();
    await waitFor(() => expect(screen.queryByText("Checking storefront requirements...")).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole("textbox", { name: /Product name/ }), { target: { value: "Soap" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Price/ }), { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to description" }));
    expect(screen.getByRole("textbox", { name: /Description/ })).toHaveFocus();
    fireEvent.change(screen.getByRole("textbox", { name: /Description/ }), { target: { value: "Handmade soap" } });
    expect(screen.getByText("Add a photo for your storefront")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Go to photo" }));
    expect(screen.getByLabelText("Item photo")).toHaveFocus();
    expect(state.create).not.toHaveBeenCalled();
  });

  it("opens a service correctly and keeps its type when availability is limited", async () => {
    setup("service");
    expect(screen.getByRole("textbox", { name: /Service name/ })).toHaveFocus();
    fireEvent.change(screen.getByRole("spinbutton", { name: /Available quantity/ }), { target: { value: "5" } });
    expect(screen.getByRole("textbox", { name: /Service name/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Service Freelance/ })).toHaveAttribute("aria-pressed", "true");
    expect(state.create).not.toHaveBeenCalled();
  });

  it("does not show the assistant guide for ordinary item creation", () => {
    setup("physical", false);
    expect(screen.queryByRole("region", { name: "Product setup guide" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Product name/ })).toBeVisible();
  });

  it("does not save while storefront requirements are unknown", async () => {
    state.failRequirements = true;
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not check storefront requirements");
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
    state.failRequirements = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry requirements" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Add item" })).toBeEnabled());
    expect(state.create).not.toHaveBeenCalled();
  });
});
