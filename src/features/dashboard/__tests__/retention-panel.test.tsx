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
  experiment: null, definitions: {},
};
const reply = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });

describe("admin retention pilot", () => {
  beforeEach(() => { vi.clearAllMocks(); state.admin = true; state.fetch.mockResolvedValue(reply(overview)); });

  it("does not expose controls or fetch metrics to non-super-admins", () => {
    state.admin = false;
    render(<RetentionPanel />);
    expect(screen.queryByText("Merchant retention pilot")).not.toBeInTheDocument();
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("does not imply zero retention for immature cohorts or create a pilot on load", async () => {
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText("Merchant retention pilot"));
    await screen.findByText("7-day activation");
    expect(screen.getAllByText("Not yet measurable").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Create paused pilot" })).toBeDisabled();
    expect(state.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });

  it("only creates a paused, explicitly selected 50-business pilot", async () => {
    const businesses = Array.from({ length: 51 }, (_, index) => ({
      user_id: index + 1, business_name: `Shop ${index + 1}`, eligible: index < 50,
      state: "dormant", health_score: 30, days_inactive: 35, whatsapp_opted_in: index < 50,
      phone_verified: true, recommendation: { reason: "One unpaid invoice worth NGN 100.00." },
    }));
    state.fetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes("/candidates")) return reply({ businesses, next_after_id: null });
      if (options?.method === "POST") return reply({ ...overview, experiment: { enabled: false, started_at: null, ends_at: null, arms: {}, assignments: [] } });
      return reply(overview);
    });
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText("Merchant retention pilot"));
    fireEvent.click(await screen.findByRole("button", { name: "Preview candidates" }));
    await screen.findByRole("checkbox", { name: "Enroll Shop 1" });
    expect(screen.getByRole("checkbox", { name: "Enroll Shop 51" })).toBeDisabled();
    for (let index = 1; index <= 50; index += 1) fireEvent.click(screen.getByRole("checkbox", { name: `Enroll Shop ${index}` }));
    fireEvent.click(screen.getByRole("button", { name: "Create paused pilot" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Enable pilot outreach" })).toBeDisabled());
    const calls = state.fetch.mock.calls.filter(([, options]) => options?.method === "POST");
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0][1].body).user_ids).toHaveLength(50);
    expect(state.fetch.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(false);
  });

  it("shows an API error and allows retry without claiming enrollment succeeded", async () => {
    state.fetch.mockResolvedValue(reply({ detail: "Forbidden" }, 403));
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText("Merchant retention pilot"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(screen.getByRole("button", { name: "Refresh retention metrics" })).toBeEnabled();
  });
});
