import { apiClient } from "./client";

export type InventoryRecommendationType =
  | "reorder_now"
  | "watch"
  | "healthy"
  | "slow_stock"
  | "insufficient_data";

export interface InventoryRecommendation {
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  current_stock: number;
  incoming_stock: number;
  units_sold_30_days: number;
  daily_sales_velocity: number;
  days_of_stock: number | null;
  demand_trend: "rising" | "steady" | "falling" | "no_sales";
  recommendation: InventoryRecommendationType;
  recommended_order_quantity: number;
  estimated_order_cost: number | null;
  explanation: string;
  reason_codes: string[];
}

export interface InventoryAdvice {
  generated_at: string;
  lookback_days: number;
  target_cover_days: number;
  headline: string;
  summary: string;
  ai_generated: boolean;
  generation_notice: string | null;
  reorder_count: number;
  slow_stock_count: number;
  estimated_reorder_cost: number;
  recommendations: InventoryRecommendation[];
}

export interface InventoryPurchaseOrder {
  id: number;
  order_number: string;
  status: "draft";
  total_amount: number;
  lines: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    unit_cost: number | null;
    total_cost: number | null;
  }>;
  created: boolean;
  notice: string;
}

export async function getInventoryAdvice(enhance = false): Promise<InventoryAdvice> {
  const response = await apiClient.get<InventoryAdvice>(
    `/ai/inventory/advice?enhance=${enhance}`,
  );
  return response.data;
}

export async function createRecommendedPurchaseOrder(
  productIds: number[],
): Promise<InventoryPurchaseOrder> {
  const response = await apiClient.post<InventoryPurchaseOrder>(
    "/ai/inventory/purchase-orders",
    { product_ids: productIds },
  );
  return response.data;
}
