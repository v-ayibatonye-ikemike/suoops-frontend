"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import type { components } from "@/api/types";

export type Invoice = components["schemas"]["InvoiceOut"];

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
  status_counts?: Record<string, number> | null;
}

export interface InvoiceListParams {
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

async function fetchInvoices(
  skip: number,
  limit: number,
  params?: InvoiceListParams
): Promise<PaginatedResponse<Invoice>> {
  // Only fetch revenue invoices for the main dashboard - expenses are tracked separately on Tax page
  const { data } = await apiClient.get<PaginatedResponse<Invoice>>(
    "/invoices/",
    {
      params: {
        invoice_type: "revenue",
        skip,
        limit,
        ...(params?.status && params.status !== "all"
          ? { status: params.status }
          : {}),
        ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params?.start_date ? { start_date: params.start_date } : {}),
        ...(params?.end_date ? { end_date: params.end_date } : {}),
      },
    }
  );
  return data;
}

export function useInvoices(skip = 0, limit = 50, params?: InvoiceListParams) {
  return useQuery({
    queryKey: [
      "invoices",
      skip,
      limit,
      params?.status ?? "",
      params?.search?.trim() ?? "",
      params?.start_date ?? "",
      params?.end_date ?? "",
    ],
    queryFn: () => fetchInvoices(skip, limit, params),
    placeholderData: keepPreviousData,
  });
}
