"use client";

import { useQuery } from "@tanstack/react-query";
import { getBusinessSnapshot } from "@/api/analytics";

const COMPONENT_LABELS: Record<string, string> = {
  payment_reliability: "Payment reliability",
  revenue_consistency: "Revenue consistency",
  professionalism: "Professionalism",
  tax_compliance: "Tax / VAT tracking",
  activity_depth: "Activity depth",
  fulfillment_reliability: "Delivery & fulfillment",
};

function formatAmount(amount: number): string {
  return `₦${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Composite SME activity snapshot — the "prove it to a bank" card.
 *
 * Every number here comes straight from the backend's documented,
 * auditable calculation (see analytics_service.calculate_business_snapshot).
 * This is deliberately NOT styled or worded like a credit score: the
 * disclaimer is always shown, never hidden behind a tooltip.
 */
export function BusinessSnapshotCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["business-snapshot"],
    queryFn: getBusinessSnapshot,
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-brand-background" />;
  }

  if (error || !data) return null;

  const levelColor =
    data.level === "Excellent"
      ? "text-emerald-500"
      : data.level === "Good"
        ? "text-blue-500"
        : data.level === "Fair"
          ? "text-amber-500"
          : "text-slate-500";

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, data.composite_score)) / 100) * circumference;

  return (
    <div className="rounded-lg border border-brand-border bg-white p-4 shadow-card sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Score ring */}
        <div className="relative flex-shrink-0 self-center sm:self-start">
          <svg width="88" height="88" className="-rotate-90">
            <circle cx="44" cy="44" r="36" stroke="#e5e7eb" strokeWidth="7" fill="none" />
            <circle
              cx="44"
              cy="44"
              r="36"
              stroke="currentColor"
              strokeWidth="7"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={levelColor}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-brand-dark">{data.composite_score}</span>
            <span className="text-[10px] text-brand-muted">/ 100</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-brand-dark">Business Snapshot</h3>
          <p className={`text-xs font-medium ${levelColor}`}>{data.level}</p>
          <p className="mt-1 text-xs text-brand-muted">
            Based on the last {data.period_months} months of activity on SuoOps.
          </p>

          {/* Component breakdown */}
          <ul className="mt-3 space-y-1.5">
            {Object.entries(data.components).map(([key, value]) => {
              const weight = data.component_weights[key];
              return (
                <li key={key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-brand-muted">
                    {COMPONENT_LABELS[key] || key}
                    {weight != null && (
                      <span className="ml-1 text-[10px] text-brand-muted/70">
                        ({Math.round(weight * 100)}%)
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-brand-dark">{value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Activity mix + data provenance */}
      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-brand-border pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
            Billed vs walk-in sales
          </p>
          <p className="mt-1 text-xs text-brand-dark">
            {formatAmount(data.activity_mix.billed_invoice_amount)} billed (
            {data.activity_mix.billed_invoice_count}) ·{" "}
            {formatAmount(data.activity_mix.walk_in_sale_amount)} walk-in (
            {data.activity_mix.walk_in_sale_count})
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
            Payment confirmation source
          </p>
          <p className="mt-1 text-xs text-brand-dark">
            {formatAmount(data.data_provenance.gateway_confirmed_amount)} gateway-confirmed ·{" "}
            {formatAmount(data.data_provenance.self_reported_amount)} self-reported
          </p>
        </div>
        {data.fulfillment_reliability.total_storefront_orders > 0 && (
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
              Storefront delivery & fulfillment
            </p>
            <p className="mt-1 text-xs text-brand-dark">
              {data.fulfillment_reliability.delivered_and_released_count} delivered &amp; confirmed ·{" "}
              {data.fulfillment_reliability.disputed_count} disputed ·{" "}
              {data.fulfillment_reliability.refunded_count} refunded (out of{" "}
              {data.fulfillment_reliability.total_storefront_orders} escrow-protected orders)
            </p>
          </div>
        )}
      </div>

      {/* Independently verified identity — a stronger signal than self-declared fields */}
      {(data.tax_compliance.tin_verified || data.tax_compliance.cac_verified) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.tax_compliance.tin_verified && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700">
              ✅ TIN verified
            </span>
          )}
          {data.tax_compliance.cac_verified && (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-700">
              ✅ CAC verified{data.tax_compliance.cac_registered_name ? `: ${data.tax_compliance.cac_registered_name}` : ""}
            </span>
          )}
        </div>
      )}

      {/* Disclaimer — always visible, never hidden */}
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-[11px] leading-snug text-slate-500">
        ℹ️ {data.disclaimer}
      </p>
    </div>
  );
}
