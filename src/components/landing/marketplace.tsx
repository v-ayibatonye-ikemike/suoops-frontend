"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { getConfig } from "@/lib/config";

type StoreCard = {
  slug: string;
  business_name: string | null;
  logo_url: string | null;
};

// Jumia-style category tiles. Each seeds the /stores search term — the backend
// already matches product names/categories — so no new API is needed.
const CATEGORIES: { label: string; term: string; emoji: string }[] = [
  { label: "Fashion", term: "fashion", emoji: "👗" },
  { label: "Food", term: "food", emoji: "🍲" },
  { label: "Beauty", term: "beauty", emoji: "💄" },
  { label: "Electronics", term: "electronics", emoji: "📱" },
  { label: "Home", term: "home", emoji: "🏠" },
  { label: "Health", term: "health", emoji: "💊" },
  { label: "Kids", term: "kids", emoji: "🧸" },
  { label: "Services", term: "service", emoji: "🛠️" },
];

/**
 * Marketplace hero band — the first thing on the landing page.
 *
 * Signals loudly that Suoops is a marketplace: a big headline, a product/shop
 * search that deep-links into /stores, and a live strip of real shops.
 */
export function Marketplace() {
  const { apiBaseUrl } = getConfig();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<StoreCard[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/public/stores?page_size=14`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { stores?: StoreCard[] };
        if (active) setStores((data.stores ?? []).filter((s) => s.logo_url));
      } catch {
        /* silent — the band still shows the search + CTA */
      }
    })();
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/stores?q=${encodeURIComponent(q)}` : "/stores");
  };

  return (
    <section
      id="marketplace"
      className="relative scroll-mt-16 overflow-hidden border-b border-brand-teal/10 bg-gradient-to-b from-white to-brand-mint px-4 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-jade/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-teal">
          <ShoppingBag className="h-3.5 w-3.5" />
          Suoops Marketplace
        </span>
        <h2 className="mt-4 font-heading text-3xl font-bold text-brand-evergreen sm:text-4xl lg:text-5xl">
          Buy from real Nigerian shops — protected
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-brand-charcoal/70 sm:text-lg">
          Find a product, order in minutes, and pay by bank transfer. Your payment
          is protected through delivery on eligible orders.
        </p>

        {/* Search → /stores */}
        <form
          onSubmit={submit}
          className="mx-auto mt-7 flex max-w-2xl flex-col items-stretch gap-2 sm:flex-row sm:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-charcoal/40"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories or shops…"
              className="w-full rounded-xl border border-brand-teal/20 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20 sm:text-base"
            />
          </div>
          <button
            type="submit"
            className="w-full shrink-0 rounded-xl bg-brand-jade px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-jadeHover sm:w-auto sm:px-7 sm:text-base"
          >
            Search
          </button>
        </form>

        {/* Category tiles (Jumia-style quick entry) */}
        <div className="mx-auto mt-7 grid max-w-3xl grid-cols-4 gap-3 sm:grid-cols-8">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              href={`/stores?q=${encodeURIComponent(c.term)}`}
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white px-2 py-3 shadow-sm ring-1 ring-brand-teal/10 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-jade/10 text-2xl transition group-hover:bg-brand-jade/20">
                {c.emoji}
              </span>
              <span className="text-[11px] font-medium text-brand-charcoal/80">
                {c.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Live shops strip */}
        {stores.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-charcoal/50">
              Popular shops
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {stores.map((s) => {
                const name = s.business_name || "Store";
                return (
                  <Link
                    key={s.slug}
                    href={`/store/${s.slug}`}
                    title={name}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.logo_url as string}
                      alt={name}
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 rounded-2xl bg-white object-cover shadow-sm ring-1 ring-brand-teal/10 transition group-hover:scale-105 group-hover:shadow-md sm:h-16 sm:w-16"
                    />
                    <span className="max-w-[72px] truncate text-[11px] text-brand-charcoal/50">
                      {name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <Link
          href="/stores"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-jade px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:scale-105 hover:bg-brand-jadeHover"
        >
          Browse all shops →
        </Link>
      </div>
    </section>
  );
}
