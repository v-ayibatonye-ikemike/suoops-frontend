// Unified parser for wallet, legacy feature-gate, and invoice errors.

import type { AxiosError } from "axios";

interface RawGateDetail {
  error?: string | { message?: string; code?: string; details?: Record<string, unknown> };
  message?: string;
  detail?: string;
  current_plan?: string;
  currentPlan?: string;
  current_count?: number;
  currentCount?: number;
  limit?: number | null;
  upgrade_url?: string;
  upgradeUrl?: string;
  required_fields?: string[];
}

export interface FeatureGateParsed {
  type: "invoice_limit" | "premium_required" | "missing_bank_details" | "other";
  message: string;
  currentPlan?: string;
  currentCount?: number;
  limit?: number | null;
  upgradeUrl?: string;
  rawCode?: string;
  requiredFields?: string[];
}

function getAxiosParts(err: unknown): { status?: number; data?: unknown } {
  const ax = err as AxiosError;
  if (ax && typeof ax === "object" && "isAxiosError" in ax) {
    return { status: ax.response?.status, data: ax.response?.data };
  }
  return {};
}

/**
 * Parse API errors into structured format for UI handling.
 * Handles 400-level invoice errors (INV004: missing bank details) and
 * 403-level feature gate errors (invoice limits, premium features).
 */
export function parseFeatureGateError(err: unknown): FeatureGateParsed | null {
  const { status, data } = getAxiosParts(err);
  // Handle 400 (invoice errors like missing bank details) and 403/402 (feature gates)
  if (!status || (status !== 400 && status !== 403 && status !== 402)) return null;
  let detail: RawGateDetail | undefined;
  
  // Type guard for data with detail property
  const hasDetail = (obj: unknown): obj is { detail: unknown } => {
    return typeof obj === "object" && obj !== null && "detail" in obj;
  };
  
  if (hasDetail(data) && typeof data.detail === "object") {
    detail = data.detail as RawGateDetail;
  } else if (typeof data === "object" && data !== null) {
    detail = data as RawGateDetail;
  }
  
  if (!detail) return null;

  // Handle nested error structure from SuoOpsException: {error: {message, code, details}}
  let code = "";
  let message = "";
  let requiredFields: string[] | undefined;
  
  if (typeof detail.error === "object" && detail.error !== null) {
    // New structured error format: {error: {message, code, details}}
    code = detail.error.code || "";
    message = detail.error.message || "";
    requiredFields = (detail.error.details?.required_fields as string[]) || undefined;
  } else {
    // Legacy format
    code = (detail.error as string) || "";
    message = detail.message || detail.detail || "Subscription required.";
  }
  
  const currentPlan = (detail.current_plan || detail.currentPlan)?.toString();
  const currentCount = detail.current_count ?? detail.currentCount;
  const limit = detail.limit;
  const upgradeUrl =
    detail.upgrade_url || detail.upgradeUrl || "/dashboard/billing/purchase";

  // Handle missing bank details error (INV004)
  if (code === "INV004") {
    return {
      type: "missing_bank_details",
      message: message || "Please add your bank details in Settings before creating invoices.",
      upgradeUrl: "/dashboard/settings",
      rawCode: code,
      requiredFields: requiredFields || ["bank_name", "account_number", "account_name"],
    };
  }

  if (code === "invoice_limit_reached") {
    return {
      type: "invoice_limit",
      message,
      currentPlan,
      currentCount,
      limit,
      upgradeUrl,
      rawCode: code,
    };
  }
  if (code === "premium_feature_required") {
    return {
      type: "premium_required",
      message,
      currentPlan,
      upgradeUrl,
      rawCode: code,
    };
  }
  return {
    type: "other",
    message,
    currentPlan,
    upgradeUrl,
    rawCode: code,
  };
}

export function isInvoiceLimitError(err: unknown): boolean {
  return parseFeatureGateError(err)?.type === "invoice_limit";
}

export function isPremiumRequiredError(err: unknown): boolean {
  return parseFeatureGateError(err)?.type === "premium_required";
}
