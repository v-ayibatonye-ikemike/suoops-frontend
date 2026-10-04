import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getConfig } from "@/lib/config";
import { StoreCatalog } from "@/features/storefront/store-catalog";
import { StoreReviews } from "@/features/storefront/store-reviews";
import { BuyerProtectionNotice } from "@/features/storefront/buyer-protection-notice";
import { ConfirmReceipt } from "@/features/storefront/confirm-receipt";
import { BuyerMessages } from "@/features/storefront/order-messages";

type StoreProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  unit: string | null;
  image_url: string | null;
  in_stock: boolean;
  category: string | null;
  fulfilment_type?: "physical" | "service" | "digital" | null;
};

type Storefront = {
  slug: string;
  business_name: string | null;
  description: string | null;
  logo_url: string | null;
  storefront_cover_url: string | null;
  online_payments_enabled: boolean;
  whatsapp_url: string | null;
  announcement: string | null;
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
    maps_url: string | null;
  };
  hours: Record<string, { open: string; close: string }> | null;
  open_now: boolean;
  open_from: string | null;
  open_to: string | null;
  reviews: { count: number; average: number | null };
  products: StoreProduct[];
  // Present only when the slug exists but the store isn't live (owner hasn't
  // enabled it yet, or it's under moderation). Other fields may be absent.
  offline?: boolean;
  offline_reason?: "disabled" | "suspended" | "delisted";
};

type RouteProps = { params: Promise<{ slug: string }> };

// Cache the storefront HTML on Vercel's CDN for 60s so repeat visits render
// instantly instead of blocking on a fresh backend round-trip every time. Order
// actions are client-side, so this only affects the catalog snapshot.
export const revalidate = 60;

async function fetchStore(slug: string, apiBaseUrl: string): Promise<Storefront | null> {
  const res = await fetch(`${apiBaseUrl}/public/store/${encodeURIComponent(slug)}`, {
    // Match the page revalidate so a refresh reuses the same fetch.
    next: { revalidate: 60 },
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Unable to load storefront. Please try again later.");
  return (await res.json()) as Storefront;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const { apiBaseUrl } = getConfig();
  try {
    const store = await fetchStore(slug, apiBaseUrl);
    if (!store) return { title: "Store Not Found — Suoops" };
    const name = store.business_name || "Store";
    if (store.offline) return { title: `${name} — currently offline · Suoops` };
    const base =
      store.description || `Browse ${name}'s products and order online.`;
    const description = `${base} Eligible orders include SuoOps payment protection through delivery.`;
    return {
      title: `${name} — Shop safely on Suoops`,
      description,
      manifest: `/store/${slug}/manifest.webmanifest`,
      openGraph: {
        title: `${name} — Shop safely on Suoops`,
        description,
        siteName: "Suoops",
        type: "website",
        url: `https://suoops.com/store/${slug}`,
      },
      twitter: {
        card: "summary_large_image",
        title: `${name} — Shop safely on Suoops`,
        description,
      },
    };
  } catch {
    return { title: "Store — Suoops" };
  }
}

export default async function StorePage({ params }: RouteProps) {
  const { slug } = await params;
  const { apiBaseUrl } = getConfig();
  const store = await fetchStore(slug, apiBaseUrl);
  if (!store) notFound();

  // Slug exists but the store isn't live — show a friendly "offline" screen
  // instead of a dead 404 (e.g. owner shared the link before enabling it).
  if (store.offline) {
    const offName = store.business_name || "This store";
    const offInitial = offName[0]?.toUpperCase() ?? "S";
    const offMsg =
      store.offline_reason === "suspended"
        ? "This store is temporarily unavailable while under review."
        : store.offline_reason === "delisted"
          ? "This store is no longer available."
          : "This store is currently offline.";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-evergreen text-2xl font-bold text-white shadow-lg">
          {offInitial}
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-800">{offName}</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{offMsg}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-400">
          Please check back soon, or contact the seller directly.
        </p>
        <a
          href="https://suoops.com"
          className="mt-6 rounded-full bg-brand-evergreen px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Discover other stores
        </a>
      </div>
    );
  }

  const name = store.business_name || "Store";
  const initial = name[0]?.toUpperCase() ?? "S";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="relative min-h-[220px] overflow-hidden bg-brand-evergreen px-4 pb-8 pt-6 sm:min-h-[280px]">
        {store.storefront_cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.storefront_cover_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className={`absolute inset-0 ${store.storefront_cover_url ? "bg-black/55" : "bg-transparent"}`} />
        <div className="relative mx-auto flex max-w-3xl items-center gap-3">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo_url}
              alt={name}
              className="h-14 w-14 rounded-2xl border-2 border-white/20 bg-white object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10 text-2xl font-bold text-white shadow-lg">
              {initial}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{name}</h1>
            {store.description && (
              <p className="mt-0.5 text-sm text-emerald-100">{store.description}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {store.hours && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    store.open_now
                      ? "bg-emerald-400/20 text-emerald-200"
                      : "bg-white/10 text-emerald-100"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${store.open_now ? "bg-emerald-300" : "bg-slate-300"}`}
                  />
                  {store.open_now
                    ? `Open${store.open_to ? ` · closes ${store.open_to}` : ""}`
                    : "Closed"}
                </span>
              )}
              {store.reviews.count > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200">
                  ★ {store.reviews.average} ({store.reviews.count})
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-emerald-300">Powered by Suoops · suoops.com</p>
          </div>
        </div>
        {store.location.address && (
          <div className="relative mx-auto mt-3 max-w-3xl">
            <a
              href={store.location.maps_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-100 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {store.location.address} · Get directions
            </a>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <BuyerProtectionNotice className="mb-4" />
        {store.announcement && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {store.announcement}
          </div>
        )}
        {store.products.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              This store hasn&apos;t listed any products yet. Check back soon.
            </p>
          </div>
        ) : (
          <StoreCatalog
            slug={store.slug}
            storeName={name}
            products={store.products}
            onlinePaymentsEnabled={store.online_payments_enabled}
          />
        )}
        <ConfirmReceipt slug={store.slug} />
        <div className="mt-2">
          <BuyerMessages slug={store.slug} />
        </div>
        <StoreReviews slug={store.slug} summary={store.reviews} />
      </main>
    </div>
  );
}
