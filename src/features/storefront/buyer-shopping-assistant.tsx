"use client";

import { FormEvent, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import type { StoreProduct } from "./store-catalog";

type ProductMatch = {
  product_id: number;
  name: string;
  price: number;
  original_price: number;
  discount_percent: number;
  category: string | null;
  fulfilment_type: string;
  reason: string;
};

type AssistantResponse = {
  answer: string;
  matches: ProductMatch[];
  detected_budget: number | null;
  ai_ranked: boolean;
  notice: string | null;
};

type Props = {
  apiBaseUrl: string;
  slug: string;
  products: StoreProduct[];
  cartProductIds: number[];
  canAddToCart: boolean;
  onAdd: (productId: number) => void;
};

const prompts = ["What do you recommend?", "Show me options under ₦10,000", "What services are available?"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(value);

export function BuyerShoppingAssistant({
  apiBaseUrl,
  slug,
  products,
  cartProductIds,
  canAddToCart,
  onAdd,
}: Props) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const ask = async (question: string) => {
    const clean = question.trim();
    if (clean.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/public/store/${encodeURIComponent(slug)}/shopping-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            query: clean,
            cart_product_ids: cartProductIds,
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(payload.detail || "The shopping assistant is unavailable right now.");
      }
      setResult((await response.json()) as AssistantResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The shopping assistant is unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(query);
  };

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-brand-jade/20 bg-white shadow-sm">
      <div className="bg-brand-evergreen px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-citrus" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Ask the shopping assistant</h2>
        </div>
        <p className="mt-1 text-xs text-white/70">
          Find and compare items using this store&apos;s current catalog, prices, and availability.
        </p>
      </div>
      <div className="space-y-3 p-4">
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="buyer-shopping-question" className="sr-only">
            What are you looking for?
          </label>
          <input
            id="buyer-shopping-question"
            value={query}
            onChange={(event) => setQuery(event.target.value.slice(0, 300))}
            placeholder="e.g. I need a gift under ₦15,000"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
          />
          <button
            type="submit"
            disabled={query.trim().length < 2 || loading}
            className="rounded-xl bg-brand-jade px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Checking…" : "Ask"}
          </button>
        </form>
        {!result && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setQuery(prompt);
                  void ask(prompt);
                }}
                className="whitespace-nowrap rounded-full bg-brand-jade/10 px-3 py-1.5 text-xs font-medium text-brand-jade"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {result && (
          <div className="space-y-3" aria-live="polite">
            <div>
              <p className="text-sm font-medium text-slate-800">{result.answer}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {result.ai_ranked ? "AI-ranked from verified store facts." : "Matched from verified store facts."}
              </p>
              {result.notice && <p className="mt-1 text-[11px] text-amber-700">{result.notice}</p>}
            </div>
            {result.matches.map((match) => {
              const product = productById.get(match.product_id);
              if (!product) return null;
              return (
                <article
                  key={match.product_id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{match.name}</p>
                    <p className="text-xs font-bold text-brand-evergreen">{formatCurrency(match.price)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{match.reason}</p>
                  </div>
                  {canAddToCart && (
                    <button
                      type="button"
                      onClick={() => onAdd(match.product_id)}
                      className="shrink-0 rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                  )}
                </article>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setQuery("");
              }}
              className="text-xs font-medium text-brand-jade"
            >
              Ask another question
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
