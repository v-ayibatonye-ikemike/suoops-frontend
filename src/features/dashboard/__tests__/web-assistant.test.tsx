import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import type { WebAssistantResponse } from "@/api/web-assistant";
import { WebAssistant } from "../web-assistant";

const state = vi.hoisted(() => ({
  pathname: "/dashboard/invoices", push: vi.fn(), openDraft: vi.fn(), invoiceOpen: false,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push }),
}));
vi.mock("../new-invoice-provider", () => ({
  useNewInvoiceDrawer: () => ({ isOpen: state.invoiceOpen, openDraft: state.openDraft }),
}));
vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

const context: WebAssistantResponse = {
  message: "Pending is unpaid; awaiting confirmation needs verification.",
  actions: [
    { kind: "navigate", id: "invoices", title: "Open all invoices", description: "Review your invoices.", href: "/dashboard/invoices?status=all" },
    { kind: "navigate", id: "bank_details", title: "Open bank details", description: "Review payment details.", href: "/dashboard/settings#bank-details" },
  ],
  ai_assisted: false,
  notice: null,
};
const invoiceAnswer: WebAssistantResponse = {
  ...context,
  message: "Review this draft before creating it.",
  actions: [{
    kind: "invoice_draft", id: "new_invoice", title: "Review invoice draft",
    description: "Nothing has been saved or sent.",
    draft: { customer_name: "Ada", currency: "NGN", lines: [{ description: "Design", quantity: 1, unit_price: 50000 }] },
  }],
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    ...render(<QueryClientProvider client={client}><WebAssistant /></QueryClientProvider>),
    client,
  };
}

describe("WebAssistant", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.pathname = "/dashboard/invoices";
    state.invoiceOpen = false;
    state.openDraft.mockReturnValue(true);
    vi.mocked(apiClient.get).mockResolvedValue({ data: context });
    vi.mocked(apiClient.post).mockResolvedValue({ data: invoiceAnswer });
  });

  it("opens on Ctrl+K, focuses the prompt and loads page-aware help", async () => {
    setup();
    expect(apiClient.get).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog", { name: "Ask SuoOps" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "What would you like to do?" })).toHaveFocus();
    expect(await screen.findByText(context.message)).toBeVisible();
    expect(apiClient.get).toHaveBeenCalledWith("/ai/web-assistant/context", expect.objectContaining({ params: { page: "invoices" } }));
  });

  it("traps focus, closes with Escape and restores the launcher", async () => {
    const user = userEvent.setup();
    setup();
    const launcher = screen.getByRole("button", { name: "Ask SuoOps" });
    await user.click(launcher);
    await screen.findByText(context.message);
    screen.getByRole("button", { name: "Close" }).focus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Open bank details" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("navigates to the exact supported destination without a mutation", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await user.click(await screen.findByRole("button", { name: "Open bank details" }));
    expect(state.push).toHaveBeenCalledWith("/dashboard/settings#bank-details");
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("only opens a prefilled form after the user reviews the proposed draft", async () => {
    const user = userEvent.setup();
    const view = setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await user.type(screen.getByRole("textbox"), "Invoice Ada 50k for design");
    await user.click(screen.getByRole("button", { name: "Find a next step" }));
    await screen.findByText("Nothing has been saved or sent.");
    expect(state.openDraft).not.toHaveBeenCalled();
    expect(screen.getByText(/Customer: Ada/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Review invoice draft" }));
    expect(state.openDraft).toHaveBeenCalledWith(invoiceAnswer.actions[0].kind === "invoice_draft" ? invoiceAnswer.actions[0].draft : null);
    expect(apiClient.post).toHaveBeenCalledOnce();
    expect(apiClient.post).toHaveBeenCalledWith("/ai/web-assistant/ask",
      { message: "Invoice Ada 50k for design", page: "invoices", allow_ai: true },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    state.invoiceOpen = true;
    view.rerender(<QueryClientProvider client={view.client}><WebAssistant /></QueryClientProvider>);
    expect(screen.queryByRole("button", { name: "Ask SuoOps" })).not.toBeInTheDocument();
    state.invoiceOpen = false;
    view.rerender(<QueryClientProvider client={view.client}><WebAssistant /></QueryClientProvider>);
    expect(screen.getByRole("button", { name: "Ask SuoOps" })).toHaveFocus();
  });

  it("updates same-page settings hashes without relying on a router navigation", async () => {
    state.pathname = "/dashboard/settings";
    const originalURL = window.location.href;
    window.history.replaceState(null, "", "/dashboard/settings");
    try {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
      await user.click(await screen.findByRole("button", { name: "Open bank details" }));
      expect(window.location.hash).toBe("#bank-details");
      expect(state.push).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, "", originalURL);
    }
  });

  it("does not reuse permission-sensitive shortcuts after an authenticated remount", async () => {
    const user = userEvent.setup();
    const view = setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await screen.findByRole("button", { name: "Open bank details" });
    view.unmount();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { ...context, actions: [context.actions[0]] },
    });
    render(<QueryClientProvider client={view.client}><WebAssistant /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await screen.findByRole("button", { name: "Open all invoices" });
    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Open bank details" })).not.toBeInTheDocument();
  });

  it("honors per-request AI opt-out and reports failures with usable shortcuts", async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await user.click(screen.getByRole("checkbox", { name: "Use optional AI if needed" }));
    await user.type(screen.getByRole("textbox"), "Help me find a screen");
    await user.click(screen.getByRole("button", { name: "Find a next step" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not process/);
    expect(screen.getByRole("button", { name: "Open all invoices" })).toBeVisible();
    expect(apiClient.post).toHaveBeenCalledWith("/ai/web-assistant/ask",
      expect.objectContaining({ allow_ai: false }), expect.anything(),
    );
  });

  it("cancels a closed request and ignores its late result", async () => {
    let resolve!: (value: { data: WebAssistantResponse }) => void;
    vi.mocked(apiClient.post).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await user.type(screen.getByRole("textbox"), "Invoice Ada");
    await user.click(screen.getByRole("button", { name: "Find a next step" }));
    const signal = vi.mocked(apiClient.post).mock.calls[0][2]?.signal;
    await user.keyboard("{Escape}");
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve({ data: invoiceAnswer }));
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    expect(screen.queryByRole("button", { name: "Review invoice draft" })).not.toBeInTheDocument();
  });

  it("offers retry when page help fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await user.click(await screen.findByRole("button", { name: "Retry shortcuts" }));
    expect(await screen.findByText(context.message)).toBeVisible();
  });

  it("does not replace an already-open invoice form", async () => {
    state.invoiceOpen = true;
    setup();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.openDraft).not.toHaveBeenCalled();
  });

  it("clears prior answers when the page changes", async () => {
    const user = userEvent.setup();
    const view = setup();
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await user.type(screen.getByRole("textbox"), "Invoice Ada");
    await user.click(screen.getByRole("button", { name: "Find a next step" }));
    await screen.findByRole("button", { name: "Review invoice draft" });
    state.pathname = "/dashboard/expenses";
    view.rerender(<QueryClientProvider client={view.client}><WebAssistant /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Ask SuoOps" }));
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith(
      "/ai/web-assistant/context", expect.objectContaining({ params: { page: "expenses" } }),
    ));
    expect(screen.queryByRole("button", { name: "Review invoice draft" })).not.toBeInTheDocument();
  });
});
