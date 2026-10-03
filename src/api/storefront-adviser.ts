import { apiClient } from "./client";

export interface StorefrontListingAdvice {
  product_id: number;
  product_name: string;
  quality_score: number;
  issues: string[];
  units_sold_30_days: number;
  recommendation: "improve_listing" | "feature" | "promote" | "healthy" | "out_of_stock";
  explanation: string;
  current_discount_percent: number;
  max_safe_discount_percent: number;
  suggested_discount_percent: number;
  featured: boolean;
  bundle_label: string | null;
}

export interface StorefrontAdvice {
  generated_at: string;
  quality_score: number;
  headline: string;
  summary: string;
  funnel: {
    views_lifetime: number;
    orders_30_days: number;
    paid_orders_30_days: number;
    abandoned_orders_30_days: number;
    lifetime_conversion_rate: number;
    explanation: string;
  };
  listings: StorefrontListingAdvice[];
  bundle_suggestions: Array<{
    title: string;
    product_ids: number[];
    product_names: string[];
    supporting_orders: number;
    reason: string;
  }>;
  reengagement_drafts: Array<{
    notification_id: number;
    product_id: number;
    product_name: string;
    recipient_masked: string;
    message: string;
  }>;
}

export interface StorefrontProductAction {
  product_id: number;
  product_name: string;
  description: string | null;
  featured: boolean;
  discount_percent: number;
  bundle_label: string | null;
}

export async function getStorefrontAdvice(): Promise<StorefrontAdvice> {
  const response = await apiClient.get<StorefrontAdvice>("/ai/storefront/advice");
  return response.data;
}

export async function draftStorefrontCopy(productId: number) {
  const response = await apiClient.post<{
    product_id: number;
    description: string;
    ai_generated: boolean;
    generation_notice: string | null;
  }>(`/ai/storefront/products/${productId}/copy-draft`);
  return response.data;
}

export async function applyStorefrontCopy(productId: number, description: string) {
  const response = await apiClient.patch<StorefrontProductAction>(
    `/ai/storefront/products/${productId}/copy`,
    { description },
  );
  return response.data;
}

export async function saveFeaturedProducts(productIds: number[]) {
  const response = await apiClient.post("/ai/storefront/merchandising", {
    product_ids: productIds,
  });
  return response.data;
}

export async function applyStorefrontPromotion(productId: number, discountPercent: number) {
  const response = await apiClient.post<StorefrontProductAction>(
    `/ai/storefront/products/${productId}/promotion`,
    { discount_percent: discountPercent },
  );
  return response.data;
}

export async function applyStorefrontBundle(
  productIds: number[],
  title: string,
  active: boolean,
) {
  const response = await apiClient.post("/ai/storefront/bundles", {
    product_ids: productIds,
    title,
    active,
  });
  return response.data;
}
