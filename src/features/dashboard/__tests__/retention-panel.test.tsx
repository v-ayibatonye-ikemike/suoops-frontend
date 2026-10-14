import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetentionPanel } from "../../../../support-suoops/app/admin/businesses/retention-panel";

const state = vi.hoisted(() => ({ admin: true, fetch: vi.fn() }));
vi.mock("../../../../support-suoops/app/admin/layout", () => ({
  useAdminAuth: () => ({ user: { is_super_admin: state.admin }, authFetch: state.fetch }),
}));
const zeroRate = { numerator: 0, denominator: 0, percent: null };
const overview = {
  outreach_configured: false, activation_7_day: zeroRate, retention: { "30": zeroRate },
  mean_hours_to_first_invoice: null, mean_hours_to_first_payment: null,
  last_30_days: { gmv_per_active_merchant: null, commission_per_active_merchant: null, invoice_to_payment_conversion: zeroRate },
  outreach: { enabled: false, channels: { email: true, whatsapp: true }, accepted_last_30_days: { email: 0, whatsapp: 0 }, unknown_or_failed: 0, active_after_contact: zeroRate },
  definitions: {},
};
const reply = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });

describe("admin retention outreach", () => {
  beforeEach(() => { vi.clearAllMocks(); state.admin = true; state.fetch.mockResolvedValue(reply(overview)); });

  it("does not expose controls or fetch metrics to non-super-admins", () => {
    state.admin = false;
    render(<RetentionPanel />);
    expect(screen.queryByText("Merchant retention outreach")).not.toBeInTheDocument();
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("does not imply zero retention for immature cohorts or send on load", async () => {
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText("Merchant retention outreach"));
    await screen.findByText("7-day activation");
    expect(screen.getAllByText("Not yet measurable").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Enable ongoing outreach" })).toBeDisabled();
    expect(state.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });

  it("previews without enrolling or sending and requires explicit approval to enable", async () => {
    const businesses = Array.from({ length: 2 }, (_, index) => ({
      user_id: index + 1, business_name: `Shop ${index + 1}`, eligible: index < 50,
      state: "dormant", health_score: 30, days_inactive: 35, whatsapp_opted_in: index < 50,
      phone_verified: true, channel: "email", recommendation: { reason: "One unpaid invoice worth NGN 100.00." },
    }));
    state.fetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes("/candidates")) return reply({ businesses, next_after_id: null });
      if (options?.method === "PATCH") return reply({ ...overview, outreach: { ...overview.outreach, enabled: true } });
      return reply({ ...overview, outreach_configured: true });
    });
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText("Merchant retention outreach"));
    fireEvent.click(await screen.findByRole("button", { name: "Preview candidates" }));
    await screen.findByText(/Shop 1/);
    expect(screen.queryByRole("checkbox", { name: "Enroll Shop 1" })).not.toBeInTheDocument();
    expect(state.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    expect(screen.getByRole("button", { name: "Enable ongoing outreach" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Enable ongoing outreach" }));
    await screen.findByRole("button", { name: "Pause outreach" });
    const calls = state.fetch.mock.calls.filter(([, options]) => options?.method === "PATCH");
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toContain("/outreach");
    expect(JSON.parse(calls[0][1].body)).toEqual({ enabled: true });
    fireEvent.click(screen.getByRole("button", { name: "Pause outreach" }));
    await waitFor(() => expect(state.fetch).toHaveBeenCalledWith(expect.stringContaining("/outreach"), expect.objectContaining({ method: "PATCH", body: JSON.stringify({ enabled: false }) })));
  });

  it("shows an API error and allows retry without claiming outreach is enabled", async () => {
    state.fetch.mockResolvedValue(reply({ detail: "Forbidden" }, 403));
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText("Merchant retention outreach"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(screen.getByRole("button", { name: "Refresh retention metrics" })).toBeEnabled();
  });
});
