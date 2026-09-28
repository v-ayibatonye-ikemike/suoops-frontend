import { apiClient } from "./client";

export interface OnlinePaymentsStatus {
  enabled: boolean;
  has_bank_details: boolean;
}

export interface EnableOnlinePaymentsResult {
  enabled: boolean;
  subaccount_code: string;
  message: string;
}

export type StorefrontHours = Record<string, { open: string; close: string }>;

export interface StorefrontStatus {
  enabled: boolean;
  slug: string | null;
  link: string | null;
  description: string | null;
  product_count?: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
  hours?: StorefrontHours | null;
  announcement?: string | null;
  views?: number;
  has_logo?: boolean;
  online_payments?: boolean;
  listable_product_count?: number;
  suggestions?: string[];
  social_promotion_opt_in?: boolean;
}

export interface StorefrontUpdate {
  slug?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  hours?: StorefrontHours | null;
  announcement?: string;
  social_promotion_opt_in?: boolean;
}

export interface StorefrontQr {
  link: string;
  qr_png: string;
}

export async function getOnlinePaymentsStatus(): Promise<OnlinePaymentsStatus> {
  const res = await apiClient.get<OnlinePaymentsStatus>(
    "/invoices/online-payments-status",
  );
  return res.data;
}

export async function enableOnlinePayments(): Promise<EnableOnlinePaymentsResult> {
  const res = await apiClient.post<EnableOnlinePaymentsResult>(
    "/invoices/enable-online-payments",
  );
  return res.data;
}

export async function disableOnlinePayments(): Promise<{ enabled: boolean; message: string }> {
  const res = await apiClient.post<{ enabled: boolean; message: string }>(
    "/invoices/disable-online-payments",
  );
  return res.data;
}

export async function getStorefront(): Promise<StorefrontStatus> {
  const res = await apiClient.get<StorefrontStatus>("/inventory/storefront");
  return res.data;
}

export async function enableStorefront(slug?: string): Promise<StorefrontStatus> {
  const res = await apiClient.post<StorefrontStatus>(
    "/inventory/storefront/enable",
    { slug: slug ?? null },
  );
  return res.data;
}

export async function disableStorefront(): Promise<StorefrontStatus> {
  const res = await apiClient.post<StorefrontStatus>(
    "/inventory/storefront/disable",
  );
  return res.data;
}

export async function updateStorefront(update: StorefrontUpdate): Promise<StorefrontStatus> {
  const res = await apiClient.patch<StorefrontStatus>("/inventory/storefront", update);
  return res.data;
}

export async function saveStorefrontLocation(
  lat: number,
  lng: number,
  accuracy?: number,
): Promise<StorefrontStatus> {
  const res = await apiClient.post<StorefrontStatus>("/inventory/storefront/location", {
    lat,
    lng,
    accuracy,
  });
  return res.data;
}

export async function getStorefrontQr(): Promise<StorefrontQr> {
  const res = await apiClient.get<StorefrontQr>("/inventory/storefront/qr");
  return res.data;
}
