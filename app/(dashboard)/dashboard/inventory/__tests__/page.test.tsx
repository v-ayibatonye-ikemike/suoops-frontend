import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InventoryPage from "../page";

const state = vi.hoisted(() => ({
  search: "", loading: false, error: null as Error | null, canEdit: true,
  router: { replace: vi.fn(), push: vi.fn() }, refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/inventory",
  useRouter: () => state.router,
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(async () => ({ data: { id: 1 } })) } }));
vi.mock("@/features/settings/use-team-role", () => ({
  useTeamRole: () => ({
    loading: state.loading, error: state.error, canEditInventory: state.canEdit, refresh: state.refresh,
  }),
}));
vi.mock("@/features/inventory/inventory-adviser", () => ({ InventoryAdviser: () => null }));
vi.mock("@/features/inventory", () => ({
  InventorySummaryCards: () => null, LowStockAlertsList: () => null, CategoryManager: () => null,
  StockAdjustmentModal: () => null,
  ProductList: ({ onCreateProduct }: { onCreateProduct?: () => void }) => (
    <button onClick={onCreateProduct} disabled={!onCreateProduct}>Add item</button>
  ),
  ProductForm: ({ guided, initialType, onClose }: { guided: boolean; initialType: string; onClose: () => void }) => (
    <div role="dialog" aria-label="Add item">
      <p>{guided ? "Guided setup" : "Normal setup"}</p>
      <p>Type: {initialType}</p>
      <input aria-label="Draft product name" defaultValue="" />
      <button onClick={onClose}>Close item form</button>
    </div>
  ),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const component = <QueryClientProvider client={client}><InventoryPage /></QueryClientProvider>;
  const view = render(component);
  return { ...view, update: () => view.rerender(<QueryClientProvider client={client}><InventoryPage /></QueryClientProvider>) };
}

describe("Assistant product handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.search = "";
    state.loading = false;
    state.error = null;
    state.canEdit = true;
  });

  it("opens guided creation and consumes only its own query parameters", async () => {
    state.search = "create=1&assistant=product&filter=low&type=service";
    setup();
    expect(await screen.findByText("Guided setup")).toBeVisible();
    expect(screen.getByText("Type: service")).toBeVisible();
    expect(state.router.replace).toHaveBeenCalledWith("/dashboard/inventory?filter=low", { scroll: false });
    expect(state.router.replace).toHaveBeenCalledOnce();
  });

  it("handles a new request while already on the inventory page", async () => {
    const view = setup();
    await screen.findByRole("button", { name: "Add item" });
    state.search = "create=1&assistant=product";
    view.update();
    expect(await screen.findByText("Guided setup")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close item form" }));
    state.search = "";
    view.update();
    state.search = "create=1&assistant=product";
    view.update();
    expect(await screen.findByRole("dialog", { name: "Add item" })).toBeVisible();
  });

  it("preserves the ordinary create entry point without assistant guidance", async () => {
    state.search = "create=1";
    setup();
    expect(await screen.findByText("Normal setup")).toBeVisible();
    expect(screen.getByText("Type: physical")).toBeVisible();
    expect(state.router.replace).toHaveBeenCalledWith("/dashboard/inventory", { scroll: false });
  });

  it("does not replace an unsaved item when another assistant request arrives", async () => {
    const view = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Add item" }));
    fireEvent.change(screen.getByLabelText("Draft product name"), { target: { value: "Unsaved soap" } });
    state.search = "create=1&assistant=product&type=service";
    view.update();
    expect(await screen.findByRole("alert")).toHaveTextContent("Your current form is still open");
    expect(screen.getByLabelText("Draft product name")).toHaveValue("Unsaved soap");
    expect(screen.getByText("Normal setup")).toBeVisible();
    expect(screen.getByText("Type: physical")).toBeVisible();
  });

  it("waits for permissions and does not open a write form for a read-only member", async () => {
    state.search = "create=1&assistant=product";
    state.loading = true;
    const view = setup();
    await screen.findByRole("button", { name: "Add item" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    state.loading = false;
    state.canEdit = false;
    view.update();
    expect(await screen.findByRole("alert")).toHaveTextContent("owner or team admin");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("keeps the request pending when permission loading fails and offers recovery", async () => {
    state.search = "create=1&assistant=product";
    state.error = new Error("Offline");
    const view = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Retry permissions" }));
    expect(state.refresh).toHaveBeenCalledOnce();
    expect(state.router.replace).not.toHaveBeenCalled();
    state.error = null;
    view.update();
    await waitFor(() => expect(screen.getByText("Guided setup")).toBeVisible());
  });
});
