import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStorefrontInsights } from "@/api/analytics";

interface StorefrontInsightsCardProps {
  period: "7d" | "30d" | "90d" | "1y" | "all";
  currency: "NGN" | "USD";
}

const PERIOD_LABEL: Record<string, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "1y": "last year",
  all: "all time",
};

export function StorefrontInsightsCard({
  period,
  currency,
}: StorefrontInsightsCardProps) {
  // Show the top 5 by default; expand to pull the full list of sold products.
  const [showAllProducts, setShowAllProducts] = useState(false);
  const topLimit = showAllProducts ? 100 : 5;
  const { data, isLoading } = useQuery({
    queryKey: ["storefrontInsights", period, currency, topLimit],
    queryFn: () => getStorefrontInsights(period, currency, topLimit),
    staleTime: 60000,
  });

  const symbol = currency === "NGN" ? "₦" : "$";
  const money = (v: number) =>
    `${symbol}${(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  if (isLoading || !data) {
    return (
      <div className="rounded-lg border border-brand-border bg-white p-4 sm:p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded bg-brand-background" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded bg-brand-background" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No storefront yet — gentle prompt to set one up.
  if (!data.enabled) {
    return (
      <div className="rounded-lg border border-dashed border-brand-border bg-white p-6 shadow-card text-center">
        <span className="text-3xl" role="img" aria-label="Store">
          🛍️
        </span>
        <h3 className="mt-2 text-base sm:text-lg font-semibold text-brand-text">
          Storefront insights
        </h3>
        <p className="mt-1 text-sm text-brand-textMuted">
          Turn on your storefront to sell online and track views, orders and
          ratings right here.
        </p>
        <a
          href="/dashboard/settings#storefront"
          className="mt-3 inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Set up storefront
        </a>
      </div>
    );
  }

  const tiles = [
    {
      label: "Orders",
      value: data.orders.toLocaleString(),
      sub: `${data.paid_orders} paid · ${data.abandoned_orders} abandoned`,
      accent: "text-teal-900",
      bg: "bg-teal-50 border-teal-200",
    },
    {
      label: "Sales (goods)",
      value: money(data.gmv),
      sub: "you keep the full price",
      accent: "text-emerald-900",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Avg order",
      value: money(data.avg_order_value),
      sub: "per paid order",
      accent: "text-teal-900",
      bg: "bg-teal-50 border-teal-200",
    },
    {
      label: "Awaiting release",
      value: money(data.awaiting_release),
      sub: "held in buyer protection",
      accent: "text-amber-900",
      bg: "bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="rounded-lg border border-brand-border bg-white p-4 sm:p-6 shadow-card">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Store">
            🛍️
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-brand-text">
              Storefront
            </h3>
            <p className="text-xs text-brand-textMuted">
              Orders & sales · {PERIOD_LABEL[period] ?? period}
            </p>
          </div>
        </div>
        {data.store_url && (
          <a
            href={data.store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            View store ↗
          </a>
        )}
      </div>

      {/* Lifetime counters */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <LifetimeStat
          label="Views"
          value={data.views.toLocaleString()}
          hint="all time"
        />
        <LifetimeStat
          label="Rating"
          value={data.avg_rating != null ? `★ ${data.avg_rating.toFixed(1)}` : "—"}
          hint={`${data.reviews} review${data.reviews === 1 ? "" : "s"}`}
        />
        <LifetimeStat
          label="Conversion"
          value={`${data.conversion_rate.toFixed(1)}%`}
          hint="paid ÷ views"
        />
      </div>

      {/* Period KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-lg border p-3 ${t.bg}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {t.label}
            </p>
            <p className={`mt-1 text-lg sm:text-xl font-bold ${t.accent}`}>
              {t.value}
            </p>
            <p className="mt-0.5 text-[11px] text-brand-textMuted">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Signal chips */}
      {(data.disputes > 0 ||
        data.refunds > 0 ||
        data.restock_requests > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {data.disputes > 0 && (
            <Chip tone="rose">
              {data.disputes} dispute{data.disputes === 1 ? "" : "s"}
            </Chip>
          )}
          {data.refunds > 0 && (
            <Chip tone="amber">
              {data.refunds} refund{data.refunds === 1 ? "" : "s"}
            </Chip>
          )}
          {data.restock_requests > 0 && (
            <Chip tone="blue">{data.restock_requests} waiting on restock</Chip>
          )}
        </div>
      )}

      {/* Top products */}
      {data.top_products.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
            {showAllProducts ? "All products" : "Top products"} ({PERIOD_LABEL[period] ?? period})
          </p>
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {data.top_products.map((p, i) => (
              <li
                key={`${p.name}-${i}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-4 text-xs font-bold text-brand-textMuted">
                    {i + 1}
                  </span>
                  <span className="truncate text-brand-text">{p.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-brand-textMuted">{p.units} sold</span>
                  <span className="font-semibold text-brand-text">
                    {money(p.revenue)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {(data.top_products_total > data.top_products.length ||
            showAllProducts) && (
            <button
              type="button"
              onClick={() => setShowAllProducts((v) => !v)}
              className="mt-3 text-xs font-semibold text-brand-jadeText hover:underline"
            >
              {showAllProducts
                ? "Show top 5"
                : `Show all ${data.top_products_total} products →`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LifetimeStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg bg-brand-background/60 p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-textMuted">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-brand-text">{value}</p>
      <p className="text-[10px] text-brand-textMuted">{hint}</p>
    </div>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "rose" | "amber" | "blue";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-teal-200 bg-teal-50 text-teal-700",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
