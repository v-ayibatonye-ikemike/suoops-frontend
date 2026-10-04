import { apiClient } from "./client";

export interface PaymentTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "cancelled" | "refunded";
  plan_before: string;
  plan_after: string;
  payment_method?: string;
  card_last4?: string;
  card_brand?: string;
  bank_name?: string;
  created_at: string;
  paid_at?: string;
  billing_start_date?: string;
  billing_end_date?: string;
  failure_reason?: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentTransaction[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    total_paid: number;
    successful_count: number;
    pending_count: number;
    failed_count: number;
  };
}

export interface PaymentDetailResponse extends PaymentTransaction {
  provider: string;
  customer_email: string;
  customer_phone?: string;
  paystack_transaction_id?: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
}

/**
 * Get payment history for current user.
 */
export async function getPaymentHistory(params?: {
  limit?: number;
  offset?: number;
  status_filter?: string;
}): Promise<PaymentHistoryResponse> {
  const response = await apiClient.get("/subscriptions/history", { params });
  return response.data;
}

/**
 * Get detailed information about a specific payment.
 */
export async function getPaymentDetail(
  paymentId: number
): Promise<PaymentDetailResponse> {
  const response = await apiClient.get(`/subscriptions/history/${paymentId}`);
  return response.data;
}

// ============================================
// Invoice Pack Purchase API
// ============================================

export interface InvoicePackPurchaseResponse {
  authorization_url: string;
  reference: string;
  amount: number;
  invoices_to_add: number;
  wallet_credit_naira?: number;
}

/**
 * Initialize a Paystack payment to top up the prepaid invoice wallet.
 * @param amount Top-up amount in Naira (must be an offered tier: 1250/5000/20000)
 */
export async function initializeWalletTopup(
  amount: number = 1250
): Promise<InvoicePackPurchaseResponse> {
  const response = await apiClient.post("/invoices/purchase-pack", null, {
    params: { amount },
  });
  return response.data;
}

// ============================================
// Subscription Status & Cancellation
// ============================================

export interface SubscriptionStatusResponse {
  plan: string;
  is_recurring: boolean;
  subscription_started_at: string | null;
  expires_at: string | null;
  invoice_balance: number;
}

export interface CancelSubscriptionResponse {
  status: "success" | "info" | "error";
  message: string;
  plan?: string;
  expires_at: string | null;
}

/**
 * Get current subscription status including billing info.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const response = await apiClient.get("/subscriptions/status");
  return response.data;
}

/**
 * Cancel recurring subscription (stop auto-renewal).
 * User keeps their plan until the current billing period ends.
 */
export async function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  const response = await apiClient.post("/subscriptions/cancel");
  return response.data;
}
