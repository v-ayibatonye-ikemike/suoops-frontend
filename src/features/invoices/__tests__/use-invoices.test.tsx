import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { useInvoices } from "../use-invoices";

vi.mock("@/api/client", () => ({ apiClient: { get: vi.fn() } }));

it("sends assistant date/status filters and refetches when dates change", async () => {
  vi.mocked(apiClient.get).mockResolvedValue({
    data: { items: [], total: 0, skip: 0, limit: 50, has_more: false },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, rerender } = renderHook(
    ({ start_date }) => useInvoices(0, 50, {
      status: "unpaid", search: " Ada ", start_date, end_date: "2026-09-30",
    }),
    { wrapper, initialProps: { start_date: "2026-09-01" } },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(apiClient.get).toHaveBeenLastCalledWith("/invoices/", {
    params: {
      invoice_type: "revenue", skip: 0, limit: 50, status: "unpaid", search: "Ada",
      start_date: "2026-09-01", end_date: "2026-09-30",
    },
  });
  rerender({ start_date: "2026-09-15" });
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(apiClient.get).toHaveBeenLastCalledWith("/invoices/", {
    params: expect.objectContaining({ start_date: "2026-09-15", end_date: "2026-09-30" }),
  });
});
