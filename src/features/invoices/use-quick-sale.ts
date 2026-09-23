"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseFeatureGateError, type FeatureGateParsed } from "@/lib/feature-gate";

import { apiClient } from "@/api/client";

import { type Invoice } from "./use-invoices";

// `@/api/types` is a hand-curated subset of the OpenAPI schema (see that
// file's header) and doesn't include every backend schema — quick-sale is
// used in exactly one place, so it's defined locally here rather than
// growing the shared curated file for a single consumer (same pattern as
// the inventory feature's local `./types`).
export interface QuickSaleCreatePayload {
  amount: number;
  currency?: "NGN" | "USD";
  description?: string;
  payment_method: "cash" | "transfer" | "card" | "other";
  customer_name?: string;
}

type FeatureGateError = Error & { featureGate?: FeatureGateParsed };

async function createQuickSale(payload: QuickSaleCreatePayload): Promise<Invoice> {
  try {
    const { data } = await apiClient.post<Invoice>("/invoices/quick-sale", payload);
    return data;
  } catch (err) {
    const gate = parseFeatureGateError(err);
    if (gate) {
      const enriched: FeatureGateError = new Error(gate.message);
      enriched.featureGate = gate;
      throw enriched;
    }
    throw err;
  }
}

/**
 * Record a walk-in / in-person sale (cash, transfer, card, etc.) and mark it
 * paid in a single call — the fast-entry counterpart to the full invoice
 * form for sales that don't need customer billing.
 */
export function useCreateQuickSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuickSale,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["invoice-quota"] });
    },
  });
}
