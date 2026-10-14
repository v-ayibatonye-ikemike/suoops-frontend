import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { RetentionPreferences } from "../retention-preferences";

vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><RetentionPreferences /></QueryClientProvider>);
}

describe("retention consent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { whatsapp_opted_in: false, phone_verified: true } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { whatsapp_opted_in: true } });
  });

  it("requires explicit consent and explains frequency, review and STOP", async () => {
    const user = userEvent.setup();
    setup();
    const checkbox = await screen.findByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(screen.getByText(/at most once a week/)).toHaveTextContent(/Reply STOP/);
    await user.click(checkbox);
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith("/ai/retention/consent", { enabled: true }));
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("does not interpret a failed request as a saved preference", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    setup();
    const checkbox = await screen.findByRole("checkbox");
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).not.toBeChecked();
  });

  it("blocks opt-in for unverified phones but permits opting out", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { whatsapp_opted_in: true, phone_verified: false } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { whatsapp_opted_in: false } });
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("checkbox"));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith("/ai/retention/consent", { enabled: false }));
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeDisabled());
  });

  it("reports loading errors with a retry instead of silently opting out", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry nudges" }));
    expect(await screen.findByRole("checkbox")).toBeEnabled();
  });
});
