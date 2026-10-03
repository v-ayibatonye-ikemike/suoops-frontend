"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  Loader2,
  ShoppingBag,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import {
  applyStorefrontBundle,
  applyStorefrontCopy,
  applyStorefrontPromotion,
  draftStorefrontCopy,
  getStorefrontAdvice,
  saveFeaturedProducts,
  type StorefrontListingAdvice,
} from "@/api/storefront-adviser";
import { copyText } from "@/lib/download";

type PendingAction =
  | { kind: "promotion"; item: StorefrontListingAdvice; percent: number }
  | { kind: "bundle"; productIds: number[]; title: string; active: boolean }
  | null;

export function StorefrontAdviser() {
  const queryClient = useQueryClient();
  const [featured, setFeatured] = useState<number[]>([]);
  const [confirmFeatured, setConfirmFeatured] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [copyDraft, setCopyDraft] = useState<{ productId: number; description: string } | null>(
    null,
  );
  const advice = useQuery({
    queryKey: ["storefront-advice"],
    queryFn: getStorefrontAdvice,
  });

  useEffect(() => {
    if (!advice.data) return;
    setFeatured(advice.data.listings.filter((item) => item.featured).map((item) => item.product_id));
  }, [advice.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["storefront-advice"] });
    void queryClient.invalidateQueries({ queryKey: ["storefrontStatus"] });
  };
  const copyGenerator = useMutation({
    mutationFn: draftStorefrontCopy,
    onSuccess: (result) =>
      setCopyDraft({ productId: result.product_id, description: result.description }),
  });
  const copyApply = useMutation({
    mutationFn: ({ productId, description }: { productId: number; description: string }) =>
      applyStorefrontCopy(productId, description),
    onSuccess: () => {
      setCopyDraft(null);
      refresh();
    },
  });
  const featureApply = useMutation({
    mutationFn: () => saveFeaturedProducts(featured),
    onSuccess: () => {
      setConfirmFeatured(false);
      refresh();
    },
  });
  const promotionApply = useMutation({
    mutationFn: ({ item, percent }: { item: StorefrontListingAdvice; percent: number }) =>
      applyStorefrontPromotion(item.product_id, percent),
    onSuccess: () => {
      setPendingAction(null);
      refresh();
    },
  });
  const bundleApply = useMutation({
    mutationFn: ({
      productIds,
      title,
      active,
    }: {
      productIds: number[];
      title: string;
      active: boolean;
    }) => applyStorefrontBundle(productIds, title, active),
    onSuccess: () => {
      setPendingAction(null);
      refresh();
    },
  });

  const activeBundles = useMemo(() => {
    const grouped = new Map<string, number[]>();
    advice.data?.listings.forEach((item) => {
      if (!item.bundle_label) return;
      grouped.set(item.bundle_label, [...(grouped.get(item.bundle_label) ?? []), item.product_id]);
    });
    return Array.from(grouped.entries()).filter(([, ids]) => ids.length >= 2);
  }, [advice.data]);

  if (advice.isLoading) {
    return <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-50" aria-label="Loading storefront advice" />;
  }
  if (advice.error || !advice.data) {
    return (
      <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">
        Storefront advice could not be loaded.
      </p>
    );
  }
  const data = advice.data;
  const actionError =
    copyGenerator.error || copyApply.error || featureApply.error || promotionApply.error || bundleApply.error;

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-brand-jade/25">
      <div className="bg-brand-evergreen p-4 text-white">
        <div className="flex items-center gap-2">
          <WandSparkles className="h-4 w-4 text-brand-citrus" aria-hidden />
          <h3 className="text-sm font-semibold">SuoOps Storefront Adviser</h3>
        </div>
        <p className="mt-2 text-base font-bold">{data.headline}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/75">{data.summary}</p>
        <p className="mt-2 text-[11px] text-white/60">
          Quality score {data.quality_score}/100 · based on verified listings and paid orders
        </p>
      </div>

      <div className="space-y-5 bg-white p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Views", data.funnel.views_lifetime],
            ["Paid (30d)", data.funnel.paid_orders_30_days],
            ["Abandoned (30d)", data.funnel.abandoned_orders_30_days],
            ["Conversion", `${data.funnel.lifetime_conversion_rate.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] uppercase text-brand-textMuted">{label}</p>
              <p className="font-bold text-brand-text">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-brand-textMuted">{data.funnel.explanation}</p>

        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
              Listing actions
            </h4>
            <button
              type="button"
              onClick={() => setConfirmFeatured(true)}
              className="text-xs font-semibold text-brand-jade"
            >
              Save featured products
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {data.listings.map((item) => (
              <div key={item.product_id} className="rounded-lg border border-brand-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-brand-text">
                    <input
                      type="checkbox"
                      checked={featured.includes(item.product_id)}
                      onChange={(event) =>
                        setFeatured((current) =>
                          event.target.checked
                            ? [...new Set([...current, item.product_id])]
                            : current.filter((id) => id !== item.product_id),
                        )
                      }
                      aria-label={`Feature ${item.product_name}`}
                    />
                    {item.product_name}
                  </label>
                  <span className="text-xs font-bold text-brand-jade">{item.quality_score}/100</span>
                </div>
                <p className="mt-1 text-xs text-brand-textMuted">{item.explanation}</p>
                {item.issues.length > 0 && (
                  <p className="mt-1 text-[11px] text-amber-700">{item.issues.join(" · ")}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={copyGenerator.isPending}
                    onClick={() => copyGenerator.mutate(item.product_id)}
                    className="inline-flex items-center gap-1 rounded-md border border-brand-border px-2 py-1 text-[11px] font-semibold"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden />
                    Draft verified copy
                  </button>
                  {item.suggested_discount_percent > 0 && item.current_discount_percent === 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAction({
                          kind: "promotion",
                          item,
                          percent: item.suggested_discount_percent,
                        })
                      }
                      className="rounded-md border border-brand-jade px-2 py-1 text-[11px] font-semibold text-brand-jade"
                    >
                      Review {item.suggested_discount_percent}% promotion
                    </button>
                  )}
                  {item.current_discount_percent > 0 && (
                    <button
                      type="button"
                      onClick={() => setPendingAction({ kind: "promotion", item, percent: 0 })}
                      className="rounded-md px-2 py-1 text-[11px] text-rose-600"
                    >
                      Remove {item.current_discount_percent}% promotion
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {confirmFeatured && (
          <Confirmation
            text={`Show ${featured.length} selected product${featured.length === 1 ? "" : "s"} first in the storefront?`}
            busy={featureApply.isPending}
            onConfirm={() => featureApply.mutate()}
            onCancel={() => setConfirmFeatured(false)}
          />
        )}

        {(data.bundle_suggestions.length > 0 || activeBundles.length > 0) && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
              Shop-together bundles
            </h4>
            <div className="mt-2 space-y-2">
              {data.bundle_suggestions.map((bundle) => (
                <div key={bundle.title} className="rounded-lg bg-brand-mint/50 p-3">
                  <p className="text-sm font-semibold text-brand-text">{bundle.title}</p>
                  <p className="mt-1 text-xs text-brand-textMuted">{bundle.reason}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingAction({
                        kind: "bundle",
                        productIds: bundle.product_ids,
                        title: bundle.title,
                        active: true,
                      })
                    }
                    className="mt-2 text-xs font-semibold text-brand-jade"
                  >
                    Review bundle
                  </button>
                </div>
              ))}
              {activeBundles.map(([title, productIds]) => (
                <button
                  key={title}
                  type="button"
                  onClick={() =>
                    setPendingAction({ kind: "bundle", productIds, title, active: false })
                  }
                  className="text-xs text-rose-600"
                >
                  Remove “{title}”
                </button>
              ))}
            </div>
          </div>
        )}

        {pendingAction?.kind === "promotion" && (
          <Confirmation
            text={
              pendingAction.percent
                ? `Apply a ${pendingAction.percent}% storefront discount to ${pendingAction.item.product_name}? The server will reject anything above its ${pendingAction.item.max_safe_discount_percent}% margin-safe cap.`
                : `Remove the storefront discount from ${pendingAction.item.product_name}?`
            }
            busy={promotionApply.isPending}
            onConfirm={() => promotionApply.mutate(pendingAction)}
            onCancel={() => setPendingAction(null)}
          />
        )}
        {pendingAction?.kind === "bundle" && (
          <Confirmation
            text={
              pendingAction.active
                ? `Publish “${pendingAction.title}” as a shop-together group at normal verified prices?`
                : `Remove the “${pendingAction.title}” shop-together group?`
            }
            busy={bundleApply.isPending}
            onConfirm={() => bundleApply.mutate(pendingAction)}
            onCancel={() => setPendingAction(null)}
          />
        )}

        {copyDraft && (
          <div className="rounded-lg border border-brand-jade/30 bg-brand-mint/40 p-3">
            <label className="text-xs font-semibold text-brand-text">
              Review exact product description
              <textarea
                value={copyDraft.description}
                maxLength={800}
                rows={4}
                onChange={(event) =>
                  setCopyDraft((current) =>
                    current ? { ...current, description: event.target.value } : current,
                  )
                }
                className="mt-1 w-full rounded-lg border border-brand-border p-2 text-sm font-normal"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={copyApply.isPending || copyDraft.description.trim().length < 20}
                onClick={() => copyApply.mutate(copyDraft)}
                className="rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Apply this description
              </button>
              <button type="button" onClick={() => setCopyDraft(null)} className="text-xs text-brand-textMuted">
                Cancel
              </button>
            </div>
          </div>
        )}

        {data.reengagement_drafts.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
              Requested restock follow-ups
            </h4>
            <p className="mt-1 text-[11px] text-brand-textMuted">
              Drafts appear only for open WhatsApp windows where the buyer asked for a restock alert.
            </p>
            {data.reengagement_drafts.map((draft) => (
              <div key={draft.notification_id} className="mt-2 rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-brand-text">{draft.message}</p>
                <button
                  type="button"
                  onClick={() => void copyText(draft.message)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-jade"
                >
                  <Copy className="h-3 w-3" aria-hidden />
                  Copy reviewed draft
                </button>
              </div>
            ))}
          </div>
        )}

        {actionError && (
          <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700" role="alert">
            The storefront change could not be applied. Refresh the advice and try again.
          </p>
        )}
      </div>
    </section>
  );
}

function Confirmation({
  text,
  busy,
  onConfirm,
  onCancel,
}: {
  text: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs leading-relaxed text-amber-900">{text}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />}
          Confirm change
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="text-xs text-brand-textMuted">
          Cancel
        </button>
      </div>
    </div>
  );
}
