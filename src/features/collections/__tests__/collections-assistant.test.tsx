import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { CollectionsAssistant } from "../collections-assistant";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

const draft = {
  id: "draft-1",
  invoice_id: "INV-100",
  customer_name: "Ada Customer",
  amount: 45000,
  currency: "NGN",
  days_overdue: 11,
  priority_score: 62,
  priority_level: "medium",
  reasons: ["11_days_overdue", "contact_channel_available"],
  explanation: "11 days overdue · ₦45,000 outstanding · permitted email channel",
  channel: "email",
  recipient_masked: "a***@example.com",
  subject: "Payment reminder for invoice INV-100",
  message: "Hello Ada,\n\nInvoice INV-100 for NGN 45,000.00 is overdue.",
  status: "draft",
  ai_generated: false,
  sent_at: null,
  created_at: "2026-10-03T20:00:00Z",
  can_send: true,
};

function renderAssistant() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <CollectionsAssistant />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe("CollectionsAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url === "/ai/collections/metrics") {
        return {
          data: {
            sent_reminders: 4,
            recovered_invoices: 2,
            recovered_amount: 80000,
            recovery_rate: 50,
          },
        };
      }
      return {
        data: {
          generated_at: "2026-10-03T20:00:00Z",
          cooldown_days: 3,
          eligible_count: 1,
          total_overdue_amount: 45000,
          drafts: [draft],
        },
      };
    });
  });

  it("shows ranked, explainable invoices and recovery metrics", async () => {
    renderAssistant();

    expect(await screen.findByText("Ada Customer")).toBeVisible();
    expect(screen.getByText("medium priority · 62/100")).toBeVisible();
    expect(screen.getByText(draft.explanation)).toBeVisible();
    expect(screen.getByText("₦80,000")).toBeVisible();
    expect(screen.getByText("50.0%")).toBeVisible();
  });

  it("requires a second confirmation before sending the reviewed message", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...draft, status: "sent" } });
    const user = userEvent.setup();
    renderAssistant();

    await screen.findByText("Ada Customer");
    const message = screen.getByLabelText("Reminder message");
    await user.clear(message);
    await user.type(message, "Hello Ada, please review INV-100.");
    await user.click(screen.getByRole("button", { name: "Send reminder" }));

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.getByText(/Send this exact reminder/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirm and send" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/ai/collections/drafts/draft-1/send",
        {
          subject: "Payment reminder for invoice INV-100",
          message: "Hello Ada, please review INV-100.",
        },
      );
    });
  });

  it("preserves unsaved reminder edits when priority facts refresh", async () => {
    const user = userEvent.setup();
    const { client } = renderAssistant();
    const message = await screen.findByLabelText("Reminder message");
    await user.clear(message);
    await user.type(message, "My carefully reviewed reminder.");
    act(() => {
      client.setQueryData(["collection-priorities"], {
        generated_at: "2026-10-04T20:00:00Z",
        cooldown_days: 3,
        eligible_count: 1,
        total_overdue_amount: 45000,
        drafts: [{ ...draft, days_overdue: 12 }],
      });
    });
    await screen.findByText(/12 days overdue/);
    expect(message).toHaveValue("My carefully reviewed reminder.");
  });

  it("does not enable sending messages shorter than the API minimum", async () => {
    const user = userEvent.setup();
    renderAssistant();
    const message = await screen.findByLabelText("Reminder message");
    await user.clear(message);
    await user.type(message, "Hi");
    expect(screen.getByRole("button", { name: "Send reminder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save edits" })).toBeDisabled();
    expect(screen.getByLabelText("Subject")).toHaveAttribute("maxlength", "180");
  });

  it("does not present failed metrics as zero recovery", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.endsWith("/metrics")) throw new Error("offline");
      return { data: { eligible_count: 1, total_overdue_amount: 45000, drafts: [draft] } };
    });
    renderAssistant();
    await screen.findByText("Ada Customer");
    expect(await screen.findByRole("alert")).toHaveTextContent(/recovery metrics/i);
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();
  });

  it("locks reviewed fields while saving and displays fractional amounts", async () => {
    vi.mocked(apiClient.patch).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const { client } = renderAssistant();
    await screen.findByText("Ada Customer");
    act(() => {
      client.setQueryData(["collection-priorities"], {
        eligible_count: 1,
        total_overdue_amount: 45000.5,
        drafts: [{ ...draft, amount: 45000.5 }],
      });
    });
    expect(await screen.findByText("₦45,000.50")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save edits" }));
    expect(screen.getByLabelText("Reminder message")).toBeDisabled();
    expect(screen.getByLabelText("Subject")).toBeDisabled();
  });
});
