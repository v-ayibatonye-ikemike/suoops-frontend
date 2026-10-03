"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  createRecommendedPurchaseOrder,
  getInventoryAdvice,
  type InventoryPurchaseOrder,
  type InventoryRecommendation,
} from "@/api/inventory-adviser";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const label = (recommendation: InventoryRecommendation["recommendation"]) =>
  ({
    reorder_now: "Reorder now",
    watch: "Watch",
    healthy: "Healthy",
    slow_stock: "Slow stock",
    insufficient_data: "Learning",
  })[recommendation];

function RecommendationCard({
  item,
  selected,
  onSelected,
}: {
  item: InventoryRecommendation;
  selected: boolean;
  onSelected: (selected: boolean) => void;
}) {
  const actionable = item.recommendation === "reorder_now";
  const badge =
    item.recommendation === "reorder_now"
      ? "bg-red-100 text-red-700"
      : item.recommendation === "slow_stock"
        ? "bg-amber-100 text-amber-800"
        : item.recommendation === "watch"
          ? "bg-blue-100 text-blue-700"
          : "bg-emerald-100 text-emerald-700";

  return (
    <article className="rounded-xl border border-brand-border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {actionable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelected(event.target.checked)}
            aria-label={`Select ${item.product_name} for purchase order`}
            className="mt-1 h-4 w-4 rounded border-brand-border text-brand-jade focus:ring-brand-jade"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-brand-dark">{item.product_name}</h3>
              <p className="text-xs text-brand-muted">SKU: {item.sku}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${badge}`}>
              {label(item.recommendation)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-brand-muted">In stock</p>
              <p className="font-semibold text-brand-dark">
                {item.current_stock} {item.unit}
              </p>
            </div>
            <div>
              <p className="text-brand-muted">Sold in 30 days</p>
              <p className="font-semibold text-brand-dark">
                {item.units_sold_30_days} {item.unit}
              </p>
            </div>
            <div>
              <p className="text-brand-muted">Stock cover</p>
              <p className="font-semibold text-brand-dark">
                {item.days_of_stock === null ? "Not enough data" : `${item.days_of_stock} days`}
              </p>
            </div>
            <div>
              <p className="text-brand-muted">Demand</p>
              <p className="flex items-center gap-1 font-semibold capitalize text-brand-dark">
                {item.demand_trend === "rising" && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                )}
                {item.demand_trend === "falling" && (
                  <TrendingDown className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                )}
                {item.demand_trend.replace("_", " ")}
              </p>
            </div>
          </div>

          <p className="mt-3 rounded-lg bg-brand-background px-3 py-2 text-xs leading-relaxed text-brand-muted">
            {item.explanation}
          </p>
          {actionable && (
            <p className="mt-3 text-sm font-semibold text-brand-dark">
              Suggested order: {item.recommended_order_quantity} {item.unit}
              {item.estimated_order_cost !== null && (
                <span className="font-normal text-brand-muted">
                  {" "}
                  · about {formatCurrency(item.estimated_order_cost)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function InventoryAdviser() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<InventoryPurchaseOrder | null>(null);
  const advice = useQuery({
    queryKey: ["inventory-advice"],
    queryFn: () => getInventoryAdvice(false),
  });

  useEffect(() => {
    if (!advice.data) return;
    setSelected(
      advice.data.recommendations
        .filter((item) => item.recommendation === "reorder_now")
        .map((item) => item.product_id),
    );
  }, [advice.data]);

  const explain = useMutation({
    mutationFn: () => getInventoryAdvice(true),
    onSuccess: (result) => {
      queryClient.setQueryData(["inventory-advice"], result);
    },
  });
  const approve = useMutation({
    mutationFn: () => createRecommendedPurchaseOrder(selected),
    onSuccess: (result) => {
      setPurchaseOrder(result);
      setConfirming(false);
      void queryClient.invalidateQueries({ queryKey: ["inventory-advice"] });
    },
  });

  if (advice.isLoading) {
    return <div className="h-56 animate-pulse rounded-xl bg-white" aria-label="Loading inventory advice" />;
  }
  if (advice.error || !advice.data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        Inventory advice could not be loaded. Please try again.
      </p>
    );
  }

  const data = advice.data;
  const selectedRecommendations = data.recommendations.filter((item) =>
    selected.includes(item.product_id),
  );
  const selectedCost = selectedRecommendations.reduce(
    (sum, item) => sum + (item.estimated_order_cost ?? 0),
    0,
  );
  const selectedHasUnknownCost = selectedRecommendations.some(
    (item) => item.estimated_order_cost === null,
  );
  const hasUnknownReorderCost = data.recommendations.some(
    (item) => item.recommendation === "reorder_now" && item.estimated_order_cost === null,
  );

  return (
    <section className="overflow-hidden rounded-xl border border-brand-jade/30 bg-white shadow-card">
      <div className="bg-gradient-to-r from-brand-evergreen to-brand-teal p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-brand-citrus" aria-hidden />
              <h2 className="font-semibold">SuoOps Inventory Adviser</h2>
            </div>
            <h3 className="mt-3 text-xl font-bold">{data.headline}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/80">{data.summary}</p>
            {data.generation_notice && (
              <p className="mt-2 text-xs text-white/65">{data.generation_notice}</p>
            )}
          </div>
          <button
            type="button"
            disabled={explain.isPending}
            onClick={() => explain.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            {explain.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4 text-brand-citrus" aria-hidden />
            )}
            Explain with AI
          </button>
        </div>
        <p className="mt-3 text-[11px] text-white/60">
          Verified from {data.lookback_days}-day sales, current stock and open purchase orders
          {data.ai_generated ? " · AI explained" : ""}
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-xs text-red-700">Reorder recommendations</p>
            <p className="mt-1 text-xl font-bold text-red-900">{data.reorder_count}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Slow-moving products</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{data.slow_stock_count}</p>
          </div>
          <div className="rounded-lg bg-brand-mint p-3">
            <p className="text-xs text-brand-muted">Estimated reorder cost</p>
            <p className="mt-1 text-xl font-bold text-brand-dark">
              {hasUnknownReorderCost && data.estimated_reorder_cost === 0
                ? "Cost data needed"
                : formatCurrency(data.estimated_reorder_cost)}
            </p>
            {hasUnknownReorderCost && data.estimated_reorder_cost > 0 && (
              <p className="mt-1 text-[11px] text-brand-muted">Some product costs are missing</p>
            )}
          </div>
        </div>

        {purchaseOrder && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3" role="status">
            <div className="flex items-center gap-2 font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Draft {purchaseOrder.order_number}
            </div>
            <p className="mt-1 text-xs text-emerald-800">{purchaseOrder.notice}</p>
          </div>
        )}

        {approve.error && (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">
            The draft could not be created. Refresh the recommendations and try again.
          </p>
        )}

        {data.recommendations.length ? (
          <div className="space-y-3">
            {data.recommendations.map((item) => (
              <RecommendationCard
                key={item.product_id}
                item={item}
                selected={selected.includes(item.product_id)}
                onSelected={(checked) => {
                  setConfirming(false);
                  setSelected((current) =>
                    checked
                      ? [...new Set([...current, item.product_id])]
                      : current.filter((id) => id !== item.product_id),
                  );
                }}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-brand-background p-4 text-sm text-brand-muted">
            Add tracked physical products and record sales to receive inventory advice.
          </p>
        )}

        {selected.length > 0 &&
          (confirming ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" aria-hidden />
                <p className="text-xs leading-relaxed text-amber-900">
                  Create one draft purchase order for {selected.length} selected product
                  {selected.length === 1 ? "" : "s"} with an estimated cost of{" "}
                  {selectedHasUnknownCost
                    ? selectedCost > 0
                      ? `at least ${formatCurrency(selectedCost)}; some costs are missing`
                      : "an amount that needs cost-price information"
                    : formatCurrency(selectedCost)}
                  ? Nothing will be sent to a supplier.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {approve.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Confirm draft
                </button>
                <button
                  type="button"
                  disabled={approve.isPending}
                  onClick={() => setConfirming(false)}
                  className="px-3 py-2 text-xs font-medium text-brand-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-evergreen px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              Review draft purchase order
            </button>
          ))}
      </div>
    </section>
  );
}
