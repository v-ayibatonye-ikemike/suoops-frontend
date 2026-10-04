/**
 * Centralized pricing configuration — single source of truth.
 *
 * BILLING MODEL v2 (commission-based, no plans):
 * - One free tier. All features are free for everyone.
 * - Fees as low as 0.5%:
 *   • Manual invoices: 0.5% (min ₦100), capped at ₦400 for invoices under
 *     ₦500,000; from ₦500,000 up it's uncapped 0.5% (₦500k → ₦2,500).
 *   • Storefront orders: 3% commission when the customer pays online,
 *     capped at ₦2,000 per ₦500,000.
 * - Wallet top-ups replace "packs": ₦1,250 / ₦5,000 / ₦20,000.
 *
 * Keep in sync with backend app/utils/feature_gate.py
 * (MANUAL_FEE_PERCENT, MANUAL_MIN_FEE_KOBO, STOREFRONT_FEE_PERCENT, WALLET_TOPUP_TIERS).
 */

/** Manual-invoice (wallet) commission (percent). */
export const MANUAL_FEE_PERCENT = 0.5;
/** Storefront / online commission. */
export const STOREFRONT_FEE_PERCENT = 3;
/** Back-compat alias (headline rate historically referenced as 3%). */
export const PLATFORM_FEE_PERCENT = STOREFRONT_FEE_PERCENT;
/** Minimum fee (₦) charged per manual invoice. */
export const MANUAL_INVOICE_MIN_FEE = 100;
/** Flat fee ceiling (₦) for manual invoices BELOW the uncap threshold. */
export const MANUAL_INVOICE_MAX_FEE = 400;
/** Manual invoices at/above this amount (₦) pay uncapped 0.5%. */
export const MANUAL_UNCAP_THRESHOLD_NAIRA = 500_000;
/** Transaction value (₦) per fee-cap tier (storefront default). */
export const FEE_CAP_TIER_NAIRA = 500_000;
/** Wallet top-up amounts (₦) sold to fund manual invoicing. */
export const WALLET_TOPUP_TIERS = [1250, 5000, 20000] as const;

// ── Human-readable fee copy — SINGLE SOURCE OF TRUTH ───────────────────────
// Built from the numbers above so the wording can never drift from the actual
// rates. Every screen that describes fees (the Billing card in Settings, the
// wallet top-up page, etc.) MUST use these instead of re-typing the copy.
const _uncapStr = MANUAL_UNCAP_THRESHOLD_NAIRA.toLocaleString();
const _uncapFeeStr = Math.round(
  (MANUAL_UNCAP_THRESHOLD_NAIRA * MANUAL_FEE_PERCENT) / 100,
).toLocaleString();

/** Short headline, e.g. "Fees from 0.5% · all features free". */
export const FEE_HEADLINE = `Fees from ${MANUAL_FEE_PERCENT}% · all features free`;

/** Ultra-short headline, e.g. "Fees as low as 0.5%". */
export const FEE_TAGLINE_SHORT = `Fees as low as ${MANUAL_FEE_PERCENT}%`;

/** One-line "who pays what" summary for the billing card. */
export const FEE_SUMMARY_SHORT = `Every feature is included. Manual invoices are just ${MANUAL_FEE_PERCENT}%, and on your storefront the customer pays the ${STOREFRONT_FEE_PERCENT}% — you keep your full price.`;

/** Wallet card subtitle. */
export const WALLET_FEE_TAGLINE = `Funds manual invoices (${MANUAL_FEE_PERCENT}%, min ₦${MANUAL_INVOICE_MIN_FEE}, ₦${MANUAL_INVOICE_MAX_FEE} cap under ₦${MANUAL_UNCAP_THRESHOLD_NAIRA / 1000}k, charged at creation)`;

/** Full explainer for the top-up page header. */
export const FEE_EXPLAINER = `Fees as low as ${MANUAL_FEE_PERCENT}%. We take just ${MANUAL_FEE_PERCENT}% per invoice (minimum ₦${MANUAL_INVOICE_MIN_FEE}, capped at ₦${MANUAL_INVOICE_MAX_FEE} for invoices under ₦${_uncapStr} — uncapped ${MANUAL_FEE_PERCENT}% above), charged from your wallet when you create one. Storefront orders pay ${STOREFRONT_FEE_PERCENT}% only when the customer pays online.`;

/** Fine print for the top-up summary. */
export const WALLET_FEE_FINEPRINT = `Each invoice takes a small ${MANUAL_FEE_PERCENT}% fee from your wallet — minimum ₦${MANUAL_INVOICE_MIN_FEE}, capped at ₦${MANUAL_INVOICE_MAX_FEE} for invoices under ₦${_uncapStr}. So a ₦100,000 invoice costs ₦${MANUAL_INVOICE_MAX_FEE}; from ₦${_uncapStr} up it's a flat ${MANUAL_FEE_PERCENT}% (₦${_uncapStr} → ₦${_uncapFeeStr}).`;

/** Fee (₦) charged from the wallet for a manual invoice of `amount` (₦). */
export function manualInvoiceFee(amount: number): number {
  const pct = Math.round((amount * MANUAL_FEE_PERCENT) / 100);
  // Flat ₦400 cap below ₦500,000; uncapped 0.5% at/above ₦500,000.
  const capped = amount < MANUAL_UNCAP_THRESHOLD_NAIRA
    ? Math.min(pct, MANUAL_INVOICE_MAX_FEE)
    : pct;
  return Math.max(capped, MANUAL_INVOICE_MIN_FEE);
}

/**
 * Storefront service fee (₦) the BUYER pays on top of the goods, for a goods
 * subtotal of `amount` (₦): 3%, min ₦20, capped at ₦2,000 per ₦500,000 band.
 * Mirrors backend app/utils/feature_gate.py `platform_fee_kobo(channel="storefront")`.
 */
export function storefrontFee(amount: number): number {
  if (amount <= 0) return 0;
  const feeKobo = Math.round(amount * STOREFRONT_FEE_PERCENT); // amount(₦) * 3 = kobo
  const floorKobo = 2000; // ₦20
  const capKobo = 200_000 * Math.max(1, Math.ceil(amount / FEE_CAP_TIER_NAIRA));
  return Math.min(Math.max(feeKobo, floorKobo), capKobo) / 100;
}

/** Convert a kobo wallet balance to whole Naira. */
export function walletNaira(kobo: number | null | undefined): number {
  return Math.floor((kobo ?? 0) / 100);
}

/** Roughly how much invoicing a top-up covers, at the 0.5% manual rate. */
export function topupCoverage(amount: number): number {
  return Math.round((amount / MANUAL_FEE_PERCENT) * 100);
}

export type PlanTier = "FREE";

export interface Plan {
  id: PlanTier;
  name: string;
  displayName: string;
  price: number;
  priceDisplay: string;
  invoicesDisplay: string;
  features: string[];
  icon?: string;
  description?: string;
}

/** The single free tier. All features are included; you only pay 0.5% per invoice. */
export const FREE_PLAN: Plan = {
  id: "FREE",
  name: "Free",
  displayName: "Free",
  price: 0,
  priceDisplay: "₦0",
  invoicesDisplay: "All features free · 0.5% per invoice",
  icon: "🚀",
  description: "Everything included. You pay commission only when you transact.",
  features: [
    "All features included — no plans",
    "0.5% per invoice (min ₦100, ₦400 cap under ₦500k), from your wallet",
    "Buyer-protected storefront with courier delivery",
    "Storefront: 3% only when the customer pays",
    "Custom branding, inventory, team & voice",
    "Tax reports, insights & daily summary",
    "WhatsApp & Email delivery, PDF & QR",
  ],
};

/** Get display price with currency. */
export function formatPrice(price: number): string {
  return `₦${price.toLocaleString()}`;
}
