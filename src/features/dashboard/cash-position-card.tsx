"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Coins, Hourglass, TrendingUp } from "lucide-react";
import { getCashPosition } from "@/api/analytics";
import { useCurrency } from "@/hooks/use-currency";

export function CashPositionCard() {
  const { formatCompact } = useCurrency();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["cash-position"],
    queryFn: getCashPosition,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-brand-background"
          />
        ))}
      </div>
    );
  }

  if (error || !data) return (
    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Could not load your money snapshot. No totals are shown until it is available.
      <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">
        Retry snapshot
      </button>
    </div>
  );

  const cards = [
    {
      label: "Cash In Today (WAT)",
      value: formatCompact(data.cash_collected_today),
      sub: `Last 7 days: ${formatCompact(data.cash_collected_this_week)}`,
      Icon: Coins,
      color: "text-emerald-400",
    },
    {
      label: "Outstanding",
      value: formatCompact(data.total_outstanding),
      sub: `${data.outstanding_count === undefined ? "" : `${data.outstanding_count} invoices · `}${data.overdue_count} overdue`,
      Icon: Hourglass,
      color: data.total_outstanding > 0 ? "text-amber-400" : "text-emerald-400",
    },
    {
      label: "Overdue",
      value: formatCompact(data.total_overdue),
      sub: data.overdue_count > 0 ? "Send reminders →" : "All clear ✓",
      Icon: AlertTriangle,
      color: data.total_overdue > 0 ? "text-red-400" : "text-emerald-400",
    },
    {
      label: "Expected (7 days)",
      value: formatCompact(data.expected_inflow_7_days),
      sub: `${data.invoices_created_today} invoices today`,
      Icon: TrendingUp,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-brand-border bg-white p-3 shadow-card sm:p-4"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <card.Icon className={`h-4 w-4 ${card.color}`} />
            <span className="text-[11px] font-medium text-brand-muted sm:text-xs">
              {card.label}
            </span>
          </div>
          <p className={`text-lg font-bold sm:text-xl ${card.color}`}>
            {card.value}
          </p>
          <p className="mt-0.5 text-[10px] text-brand-muted sm:text-xs">
            {card.sub}
          </p>
        </div>
      ))}
      <p className="col-span-2 text-[11px] text-brand-muted sm:col-span-4">
        Outstanding covers all dates and includes payments awaiting confirmation. Unpaid storefront checkouts are excluded.
      </p>
    </div>
  );
}
