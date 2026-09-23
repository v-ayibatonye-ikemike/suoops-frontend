"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsDashboard } from "@/api/analytics";
import { RevenueCards } from "@/features/analytics/revenue-cards";
import { InvoiceMetricsCard } from "@/features/analytics/invoice-metrics-card";
import { CustomerMetricsCard } from "@/features/analytics/customer-metrics-card";
import { AgingReportCard } from "@/features/analytics/aging-report-card";
import { MonthlyTrendsChart } from "@/features/analytics/monthly-trends-chart";
import { TopCustomersCard } from "@/features/analytics/top-customers-card";
import { ConversionFunnelCard } from "@/features/analytics/conversion-funnel-card";
import { StorefrontInsightsCard } from "@/features/analytics/storefront-insights-card";
import { BusinessSnapshotCard } from "@/features/analytics/business-snapshot-card";
import { useCurrencyStore } from "@/stores/currency-store";
import { useCurrency } from "@/hooks/use-currency";

type Period = "7d" | "30d" | "90d" | "1y" | "all";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const { rateDescription, refreshRate, isRefreshing } = useCurrency();

  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analytics", period, currency],
    queryFn: () => getAnalyticsDashboard(period, currency),
    staleTime: 60000, // 1 minute
  });

  const periodOptions: { value: Period; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Insights
            </h1>
            <p className="mt-1 text-sm text-brand-mint">
              Track your business performance and insights
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-text shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "NGN" | "USD")}
              className="rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-text shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="NGN">₦ NGN</option>
              <option value="USD">$ USD</option>
            </select>
            {currency === "USD" && rateDescription && (
              <button
                type="button"
                onClick={refreshRate}
                disabled={isRefreshing}
                title="Click to refresh exchange rate"
                className="self-center rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer disabled:opacity-50"
              >
                <span className={isRefreshing ? "inline-block animate-spin" : ""}>🔄</span>{" "}
                {isRefreshing ? "Refreshing…" : `Live: ${rateDescription}`}
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-brand-border bg-white p-4 sm:p-6 shadow-card"
              >
                <div className="h-4 w-24 rounded bg-brand-background mb-3" />
                <div className="h-8 w-32 rounded bg-brand-background" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 sm:p-6">
            <p className="text-sm font-medium text-rose-900">
              Failed to load analytics data. Please try again.
            </p>
          </div>
        )}

        {/* Analytics Content */}
        {analytics && (
          <div className="space-y-8">
            {/* Business Snapshot — for sharing with a financial institution */}
            <section className="space-y-4">
              <SectionHeading
                title="Business Snapshot"
                subtitle="A shareable activity summary — for financial institution conversations"
              />
              <BusinessSnapshotCard />
            </section>

            {/* Revenue */}
            <section className="space-y-4">
              <SectionHeading
                title="Revenue"
                subtitle="Money earned, awaiting payment and overdue"
              />
              <RevenueCards metrics={analytics.revenue} currency={currency} />
            </section>

            {/* Storefront */}
            <section className="space-y-4">
              <SectionHeading
                title="Storefront"
                subtitle="Your online store — views, orders, ratings and demand"
              />
              <StorefrontInsightsCard period={period} currency={currency} />
            </section>

            {/* Invoices & customers */}
            <section className="space-y-4">
              <SectionHeading
                title="Invoices & customers"
                subtitle="Status breakdown, customer mix and what's owed"
              />
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
                <InvoiceMetricsCard metrics={analytics.invoices} />
                <CustomerMetricsCard metrics={analytics.customers} />
                <AgingReportCard aging={analytics.aging} currency={currency} />
              </div>
            </section>

            {/* Trends & conversion */}
            <section className="space-y-4">
              <SectionHeading
                title="Trends & conversion"
                subtitle="How revenue moves over time and where invoices convert"
              />
              <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
                <MonthlyTrendsChart
                  trends={analytics.monthly_trends}
                  currency={currency}
                />
                <ConversionFunnelCard period={period} />
              </div>
              <TopCustomersCard period={period} currency={currency} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-white/10 pb-2">
      <h2 className="text-lg sm:text-xl font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-brand-mint">{subtitle}</p>}
    </div>
  );
}
