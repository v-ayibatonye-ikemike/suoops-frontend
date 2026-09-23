import { apiClient } from "./client";

export interface RevenueMetrics {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  overdue_revenue: number;
  growth_rate: number;
  average_invoice_value: number;
}

export interface InvoiceMetrics {
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  awaiting_confirmation: number;
  failed_invoices: number;
  conversion_rate: number;
}

export interface CustomerMetrics {
  total_customers: number;
  active_customers: number;
  new_customers: number;
  repeat_customer_rate: number;
}

export interface AgingReport {
  current: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  total_outstanding: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  invoice_count: number;
}

export interface AnalyticsDashboard {
  period: string;
  currency: string;
  start_date: string;
  end_date: string;
  revenue: RevenueMetrics;
  invoices: InvoiceMetrics;
  customers: CustomerMetrics;
  aging: AgingReport;
  monthly_trends: MonthlyTrend[];
}

export interface TopCustomer {
  name: string;
  total_revenue: number;
  invoice_count: number;
}

export interface ConversionFunnel {
  funnel: {
    created: number;
    sent: number;
    viewed: number;
    awaiting_confirmation: number;
    paid: number;
    failed: number;
  };
  conversion_rates: {
    sent_to_viewed: number;
    viewed_to_paid: number;
    overall: number;
  };
}

// ── Cash-First Dashboard ──────────────────────────────────────────

export interface CashPosition {
  cash_collected_today: number;
  cash_collected_this_week: number;
  total_outstanding: number;
  total_overdue: number;
  overdue_count: number;
  expected_inflow_7_days: number;
  invoices_created_today: number;
  expenses_today: number;
  net_today: number;
}

// ── Professionalism Score ─────────────────────────────────────────

export interface ProfessionalismScore {
  score: number;
  checks: Record<string, boolean>;
  tips: string[];
  level: string;
}

// ── Customer Insights ─────────────────────────────────────────────

export interface CustomerInsight {
  id: number;
  name: string;
  phone: string | null;
  total_spent: number;
  invoice_count: number;
  paid_count: number;
  payment_rate: number;
  last_purchase_days_ago: number;
  status: "vip" | "active" | "new" | "at_risk" | "dormant";
}

export interface CustomerInsights {
  customers: CustomerInsight[];
  summary: Record<string, number>;
  dormant_customers: CustomerInsight[];
  total_analyzed: number;
}

// ── API Functions ─────────────────────────────────────────────────

export async function getAnalyticsDashboard(
  period: "7d" | "30d" | "90d" | "1y" | "all" = "30d",
  currency: "NGN" | "USD" = "NGN"
): Promise<AnalyticsDashboard> {
  const response = await apiClient.get<AnalyticsDashboard>(
    `/analytics/dashboard?period=${period}&currency=${currency}`
  );
  return response.data;
}

export async function getTopCustomers(
  period: "7d" | "30d" | "90d" | "1y" | "all" = "30d",
  limit: number = 10,
  currency: "NGN" | "USD" = "NGN"
): Promise<{ period: string; customers: TopCustomer[] }> {
  const response = await apiClient.get(
    `/analytics/revenue-by-customer?period=${period}&limit=${limit}&currency=${currency}`
  );
  return response.data;
}

export interface ExchangeRateInfo {
  rate: number;
  currency_pair: string;
  description: string;
}

export async function getExchangeRate(): Promise<ExchangeRateInfo> {
  const response = await apiClient.get<ExchangeRateInfo>(
    "/analytics/exchange-rate"
  );
  return response.data;
}

export async function refreshExchangeRate(): Promise<ExchangeRateInfo> {
  const response = await apiClient.post<ExchangeRateInfo>(
    "/analytics/exchange-rate/refresh"
  );
  return response.data;
}

export async function getConversionFunnel(
  period: "7d" | "30d" | "90d" | "1y" | "all" = "30d"
): Promise<{ period: string } & ConversionFunnel> {
  const response = await apiClient.get(
    `/analytics/conversion-funnel?period=${period}`
  );
  return response.data;
}

export async function getCashPosition(): Promise<CashPosition> {
  const response = await apiClient.get<CashPosition>(
    "/analytics/cash-position"
  );
  return response.data;
}

export async function getProfessionalismScore(): Promise<ProfessionalismScore> {
  const response = await apiClient.get<ProfessionalismScore>(
    "/analytics/professionalism-score"
  );
  return response.data;
}

export async function getCustomerInsights(
  limit: number = 20
): Promise<CustomerInsights> {
  const response = await apiClient.get<CustomerInsights>(
    `/analytics/customer-insights?limit=${limit}`
  );
  return response.data;
}

// ── Business Snapshot ──────────────────────────────────────────────
// A composite SME activity signal assembled from data SuoOps already has
// (payment reliability, revenue consistency, professionalism, tax/VAT
// compliance, activity depth) — see the backend docstring. NOT a credit
// score; intended for sharing with a financial institution alongside its
// own underwriting and cross-bank data.

export interface BusinessSnapshotAging {
  current: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  total_outstanding: number;
}

export interface BusinessSnapshotPaymentReliability {
  paid_ratio: number;
  overdue_ratio: number;
  aging: BusinessSnapshotAging;
}

export interface BusinessSnapshotRevenueConsistency {
  months_with_revenue: number;
  months_checked: number;
}

export interface BusinessSnapshotTaxCompliance {
  vat_registered: boolean;
  has_generated_tax_report: boolean;
  business_size: string | null;
}

export interface BusinessSnapshotActivityMix {
  billed_invoice_count: number;
  billed_invoice_amount: number;
  walk_in_sale_count: number;
  walk_in_sale_amount: number;
}

export interface BusinessSnapshotDataProvenance {
  gateway_confirmed_amount: number;
  self_reported_amount: number;
}

export interface BusinessSnapshot {
  generated_at: string;
  period_months: number;
  composite_score: number;
  level: string;
  components: Record<string, number>;
  component_weights: Record<string, number>;
  payment_reliability: BusinessSnapshotPaymentReliability;
  revenue_consistency: BusinessSnapshotRevenueConsistency;
  professionalism_score: number;
  tax_compliance: BusinessSnapshotTaxCompliance;
  activity_mix: BusinessSnapshotActivityMix;
  data_provenance: BusinessSnapshotDataProvenance;
  disclaimer: string;
}

export async function getBusinessSnapshot(): Promise<BusinessSnapshot> {
  const response = await apiClient.get<BusinessSnapshot>(
    "/analytics/business-snapshot"
  );
  return response.data;
}

// ── Storefront Insights ───────────────────────────────────────────

export interface StorefrontTopProduct {
  name: string;
  units: number;
  revenue: number;
}

export interface StorefrontInsights {
  enabled: boolean;
  slug: string | null;
  store_url: string | null;
  // Store-lifetime counters
  views: number;
  reviews: number;
  avg_rating: number | null;
  conversion_rate: number;
  // Period-scoped order metrics
  period: string;
  orders: number;
  paid_orders: number;
  abandoned_orders: number;
  gmv: number;
  avg_order_value: number;
  awaiting_release: number;
  refunds: number;
  disputes: number;
  restock_requests: number;
  top_products: StorefrontTopProduct[];
  top_products_total: number;
}

export async function getStorefrontInsights(
  period: "7d" | "30d" | "90d" | "1y" | "all" = "30d",
  currency: "NGN" | "USD" = "NGN",
  topLimit = 5
): Promise<StorefrontInsights> {
  const response = await apiClient.get<StorefrontInsights>(
    `/analytics/storefront-insights?period=${period}&currency=${currency}&top_limit=${topLimit}`
  );
  return response.data;
}

