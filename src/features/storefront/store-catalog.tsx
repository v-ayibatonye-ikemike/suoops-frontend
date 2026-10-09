"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { storefrontFee } from "@/constants/pricing";
import { getConfig } from "@/lib/config";
import { BuyerShoppingAssistant } from "./buyer-shopping-assistant";
import { CurrentLocationCapture, type CapturedLocation } from "./current-location-capture";

export type StoreProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  original_price?: number | null;
  discount_percent?: number;
  featured?: boolean;
  bundle_label?: string | null;
  unit: string | null;
  image_url: string | null;
  in_stock: boolean;
  category?: string | null;
  category_id?: number | null;
  fulfilment_type?: "physical" | "service" | "digital" | null;
  pack_price?: number | null;
};

type Props = {
  slug: string;
  storeName: string;
  products: StoreProduct[];
  onlinePaymentsEnabled: boolean;
};

const formatCurrency = (value: number | null) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(value);
};

export function StoreCatalog({
  slug,
  storeName,
  products,
  onlinePaymentsEnabled,
}: Props) {
  const { apiBaseUrl } = getConfig();

  const [cart, setCart] = useState<Record<number, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Courier delivery options (buyer-pays-delivery). Empty/disabled → no fee.
  type CourierOption = {
    courier_id: string;
    service_code: string;
    name: string;
    image: string | null;
    amount: number;
    currency: string;
    delivery_eta: string | null;
    service_type: string | null;
  };
  const [deliveryOptions, setDeliveryOptions] = useState<CourierOption[]>([]);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryRetry, setDeliveryRetry] = useState(0);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);
  // Buyer explicitly opted out of courier delivery (service order / self-pickup).
  // When true, no courier is sent and no delivery fee is charged.
  const [declinedDelivery, setDeclinedDelivery] = useState(false);

  // Discovery: search + category filter.
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // "Notify me when back in stock" for a sold-out product.
  const [notifyFor, setNotifyFor] = useState<StoreProduct | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== "All" && p.category !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, activeCategory]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const cartEntries = Object.entries(cart).filter(([, q]) => q > 0);
  const count = cartEntries.reduce((s, [, q]) => s + q, 0);
  const total = cartEntries.reduce(
    (s, [id, q]) => s + (productById.get(Number(id))?.price ?? 0) * q,
    0,
  );

  const add = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));
  const bundles = useMemo(() => {
    const grouped = new Map<string, StoreProduct[]>();
    products.forEach((product) => {
      if (!product.bundle_label || !product.in_stock) return;
      grouped.set(product.bundle_label, [...(grouped.get(product.bundle_label) ?? []), product]);
    });
    return Array.from(grouped.entries()).filter(([, items]) => items.length >= 2);
  }, [products]);
  const addBundle = (items: StoreProduct[]) =>
    setCart((current) => {
      const next = { ...current };
      items.forEach((item) => {
        next[item.id] = (next[item.id] ?? 0) + 1;
      });
      return next;
    });

  // Deep link from a product's scan-to-pay QR: /store/{slug}?p={id}. Pre-add
  // that product and open checkout so a customer who scanned just pays.
  useEffect(() => {
    if (typeof window === "undefined" || !onlinePaymentsEnabled) return;
    const pid = Number(new URLSearchParams(window.location.search).get("p"));
    if (!pid) return;
    const product = productById.get(pid);
    if (product && product.in_stock) {
      setCart((c) => (c[pid] ? c : { ...c, [pid]: 1 }));
      setCheckoutOpen(true);
    }
  }, [productById, onlinePaymentsEnabled]);

  // Deep link from a category QR: /store/{slug}?category_id={id} (rename-proof)
  // — resolve the category's CURRENT name from its id. Falls back to a legacy
  // ?category={name} link. Pre-filters the catalog to that category.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const idRaw = params.get("category_id");
    if (idRaw) {
      const id = Number(idRaw);
      const named = products.find((p) => p.category_id === id && p.category);
      if (named?.category) {
        setActiveCategory(named.category);
        return;
      }
    }
    const raw = params.get("category");
    if (!raw) return;
    const match = categories.find(
      (c) => c.toLowerCase() === raw.trim().toLowerCase(),
    );
    if (match) setActiveCategory(match);
  }, [categories, products]);

  const cartSig = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => `${id}:${q}`)
        .join(","),
    [cart],
  );
  const noDelivery =
    cartEntries.length > 0 &&
    cartEntries.every(([id]) => {
      const ft = productById.get(Number(id))?.fulfilment_type ?? "physical";
      return ft === "service" || ft === "digital";
    });

  // Fetch live courier options once the buyer has a phone + location + items.
  // Debounced; refetched when the cart or location changes. When the store's
  // courier integration is off (or no options), delivery is simply skipped.
  useEffect(() => {
    if (
      !checkoutOpen ||
      noDelivery ||
      customerPhone.trim().length < 6 ||
      !location ||
      cartSig === ""
    ) {
      setDeliveryOptions([]);
      setSelectedCourier(null);
      setDeclinedDelivery(false);
      setDeliveryEnabled(false);
      setDeliveryLoading(false);
      setDeliveryError(null);
      return;
    }
    const ctrl = new AbortController();
    setDeliveryLoading(true);
    setDeliveryError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/public/store/${slug}/delivery-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: ctrl.signal,
          body: JSON.stringify({
            customer_name: customerName.trim() || "Customer",
            customer_phone: customerPhone.trim(),
            customer_lat: location.lat,
            customer_lng: location.lng,
            items: cartEntries.map(([id, q]) => ({
              product_id: Number(id),
              quantity: q,
            })),
          }),
        });
        if (!res.ok) {
          throw new Error("Could not load delivery options. Please retry or choose self-pickup.");
        }
        const data = (await res.json()) as {
          enabled?: boolean;
          options?: CourierOption[];
        };
        if (ctrl.signal.aborted) return;
        setDeliveryEnabled(Boolean(data.enabled));
        const opts = data.options ?? [];
        setDeliveryOptions(opts);
        // Keep the buyer's prior choice if it's still offered; otherwise leave
        // it unselected so they consciously pick a courier (we only *advise*
        // the cheapest via a badge — we never choose for them).
        setSelectedCourier((prev) =>
          prev
            ? opts.find(
            (o) =>
              o.courier_id === prev.courier_id &&
              o.service_code === prev.service_code,
          ) ?? null
            : null,
        );
      } catch {
        if (ctrl.signal.aborted) return;
        setDeliveryOptions([]);
        setSelectedCourier(null);
        setDeliveryError("Could not load delivery options. Please retry or choose self-pickup.");
      } finally {
        if (!ctrl.signal.aborted) setDeliveryLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen, customerPhone, location, cartSig, slug, apiBaseUrl, noDelivery, deliveryRetry]);

  const deliveryFee = selectedCourier?.amount ?? 0;
  // Automatic packaging: ONE flat pack per order — the highest pack price among
  // items in the cart whose category carries a pack fee. Mirrors the backend.
  const packFee = (() => {
    const prices = cartEntries
      .map(([id]) => productById.get(Number(id))?.pack_price ?? 0)
      .filter((v) => v > 0);
    return prices.length ? Math.max(...prices) : 0;
  })();
  // The buyer pays a small service fee on top of the goods so the seller keeps
  // the full listed price. Mirrors the backend charge (3%, min ₦20, capped).
  const serviceFee = storefrontFee(total + packFee);
  const grandTotal = total + packFee + serviceFee + deliveryFee;
  const cheapestAmount = deliveryOptions.length
    ? Math.min(...deliveryOptions.map((o) => o.amount))
    : 0;

  const canSubmit =
    onlinePaymentsEnabled &&
    customerName.trim().length > 0 &&
    customerPhone.trim().length >= 6 &&
    count > 0 &&
    !submitting &&
    // Service/digital orders need no delivery details; physical orders do.
    (noDelivery ||
      (location != null &&
        !deliveryLoading &&
        // A delivery address / landmark is required (the GPS pin may not be
        // where the buyer wants delivery).
        deliveryNote.trim().length >= 4 &&
        // If the store offers couriers, the buyer must either pick one or
        // explicitly opt out of delivery (self-pickup).
        (declinedDelivery ||
          (!deliveryError &&
            (!deliveryEnabled ||
              deliveryOptions.length === 0 ||
              selectedCourier != null)))));

  const submitOrder = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/public/store/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_lat: location?.lat,
          customer_lng: location?.lng,
          delivery_note: deliveryNote.trim(),
          delivery_courier_id: selectedCourier?.courier_id,
          delivery_service_code: selectedCourier?.service_code,
          items: cartEntries.map(([id, q]) => ({
            product_id: Number(id),
            quantity: q,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail || "Could not place your order. Please try again.");
      }
      const data = (await res.json()) as {
        authorization_url?: string;
        delivery_code?: string;
        invoice_id?: string;
      };
      if (data.authorization_url) {
        // Held order → stash the buyer-only RELEASE code in sessionStorage so we
        // can reveal it AFTER payment (on the /pay return page). sessionStorage
        // (not localStorage) is deliberate: it survives the payment redirect
        // round-trip in this same tab but is wiped when the tab closes, so the
        // code never lingers on a shared/public device. The durable copy is the
        // buyer's WhatsApp. Note the code only ever RELEASES funds to the
        // legitimate seller, so it is not a credential an attacker can monetise.
        if (data.delivery_code && data.invoice_id) {
          try {
            window.sessionStorage.setItem(
              `suoops_release:${data.invoice_id}`,
              data.delivery_code,
            );
          } catch {
            /* storage blocked — the code still arrives via WhatsApp */
          }
        }
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("Could not start payment. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      {!onlinePaymentsEnabled && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
          🔒 This store isn&apos;t taking online orders yet. Check back soon — ordering opens once
          the seller turns on secure online payments.
        </div>
      )}
      <BuyerShoppingAssistant
        apiBaseUrl={apiBaseUrl}
        slug={slug}
        products={products}
        cartProductIds={cartEntries.map(([id]) => Number(id))}
        canAddToCart={onlinePaymentsEnabled}
        onAdd={add}
      />
      {/* Search + category filter */}
      {products.length > 4 && (
        <div className="mb-4 space-y-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${storeName}'s products…`}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
          />
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    activeCategory === c
                      ? "bg-brand-evergreen text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {bundles.length > 0 && activeCategory === "All" && !search.trim() && (
        <div className="mb-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Shop together
          </p>
          {bundles.map(([bundleLabel, items]) => (
            <div
              key={bundleLabel}
              className="flex items-center justify-between gap-3 rounded-xl border border-brand-jade/20 bg-brand-jade/5 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{bundleLabel}</p>
                <p className="text-xs text-slate-500">{items.map((item) => item.name).join(" + ")}</p>
              </div>
              {onlinePaymentsEnabled && (
                <button
                  type="button"
                  onClick={() => addBundle(items)}
                  className="shrink-0 rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white"
                >
                  Add all
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pb-24 sm:grid-cols-3">
        {visibleProducts.map((p) => {
          const qty = cart[p.id] ?? 0;
          return (
            <div
              key={p.id}
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100"
            >
              <div className="aspect-square w-full bg-slate-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width={360}
                    height={360}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</h2>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span>
                    <span className="text-sm font-bold text-brand-evergreen">
                      {formatCurrency(p.price)}
                      {p.unit ? (
                        <span className="text-[10px] font-normal text-slate-400">/{p.unit}</span>
                      ) : null}
                    </span>
                    {(p.discount_percent ?? 0) > 0 && (
                      <span className="ml-1 text-[10px] text-slate-400 line-through">
                        {formatCurrency(p.original_price ?? null)}
                      </span>
                    )}
                  </span>
                  {!p.in_stock && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Sold out
                    </span>
                  )}
                </div>

                {p.in_stock && onlinePaymentsEnabled ? (
                  qty > 0 ? (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-jade/10 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => dec(p.id)}
                        aria-label="Remove one"
                        className="h-6 w-6 rounded-md bg-white text-sm font-bold text-brand-jade shadow-sm"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold text-brand-jade">{qty}</span>
                      <button
                        type="button"
                        onClick={() => add(p.id)}
                        aria-label="Add one"
                        className="h-6 w-6 rounded-md bg-white text-sm font-bold text-brand-jade shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => add(p.id)}
                      className="mt-2 rounded-lg bg-brand-jade py-2 text-xs font-semibold text-white transition hover:bg-brand-jadeHover"
                    >
                      Add
                    </button>
                  )
                ) : !p.in_stock ? (
                  <button
                    type="button"
                    onClick={() => setNotifyFor(p)}
                    className="mt-2 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Notify me
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating checkout bar */}
      {onlinePaymentsEnabled && count > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-xl bg-brand-jade px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-jadeHover"
          >
            <span>
              {count} item{count > 1 ? "s" : ""} · {formatCurrency(total)}
            </span>
            <span>Checkout →</span>
          </button>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Your order</h3>
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 max-h-40 space-y-2 overflow-auto">
              {cartEntries.map(([id, q]) => {
                const p = productById.get(Number(id));
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {q}× {p.name}
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency((p.price ?? 0) * q)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2 text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-900">{formatCurrency(total)}</span>
              </div>
              {packFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Packaging</span>
                  <span className="text-slate-900">{formatCurrency(packFee)}</span>
                </div>
              )}
              {serviceFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Service fee</span>
                  <span className="text-slate-900">{formatCurrency(serviceFee)}</span>
                </div>
              )}
              {selectedCourier && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Delivery ({selectedCourier.name})
                  </span>
                  <span className="text-slate-900">
                    {formatCurrency(selectedCourier.amount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
              />
              <input
                type="tel"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Your phone (e.g. 08012345678)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
              />
              {noDelivery ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-700">
                  ✓ No delivery needed — this is a service/digital order. Your
                 payment remains protected until you confirm it’s done.
                </div>
              ) : (
              <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-700">Your delivery location</p>
                <p className="mb-2 text-[11px] text-slate-500">
                  Required for buyer protection — we use your current location to
                  keep your payment safe until your order arrives.
                </p>
                <CurrentLocationCapture
                  onCapture={setLocation}
                  ctaLabel="Share my current location"
                />
              </div>

              {location &&
                customerPhone.trim().length >= 6 &&
                (deliveryLoading || deliveryError || deliveryOptions.length > 0) && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-medium text-slate-700">
                      Choose your courier
                    </p>
                    {!deliveryLoading &&
                      !deliveryError &&
                      !selectedCourier &&
                      !declinedDelivery &&
                      deliveryOptions.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-amber-600">
                          Tap an option to continue — or choose “I don’t need
                          delivery”.
                        </p>
                      )}
                    {deliveryLoading ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        Fetching courier options…
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {deliveryError && (
                          <div>
                            <p role="alert" className="text-xs text-rose-700">
                              {deliveryError}
                            </p>
                            <button
                              type="button"
                              onClick={() => setDeliveryRetry((value) => value + 1)}
                              className="mt-2 text-xs font-semibold text-brand-jade underline"
                            >
                              Retry delivery options
                            </button>
                          </div>
                        )}
                        {deliveryOptions.map((o) => {
                          const sel =
                            selectedCourier?.courier_id === o.courier_id &&
                            selectedCourier?.service_code === o.service_code;
                          return (
                            <button
                              key={`${o.courier_id}:${o.service_code}`}
                              type="button"
                              onClick={() => {
                                setSelectedCourier(o);
                                setDeclinedDelivery(false);
                              }}
                              className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition ${
                                sel
                                  ? "border-brand-jade bg-brand-jade/5"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {o.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={o.image}
                                  alt={o.name}
                                  className="h-8 w-8 rounded object-contain"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-sm">
                                  🚚
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                                  {o.name}
                                  {deliveryOptions.length > 1 &&
                                    o.amount === cheapestAmount && (
                                      <span className="shrink-0 rounded-full bg-brand-jade/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-jade">
                                        Cheapest
                                      </span>
                                    )}
                                </p>
                                {o.delivery_eta && (
                                  <p className="text-[11px] text-slate-500">
                                    {o.delivery_eta}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 text-sm font-bold text-brand-jade">
                                {formatCurrency(o.amount)}
                              </span>
                            </button>
                          );
                        })}
                        {/* Opt-out: service orders or buyers who self-pickup. */}
                        <button
                          type="button"
                          onClick={() => {
                            setDeclinedDelivery(true);
                            setSelectedCourier(null);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition ${
                            declinedDelivery
                              ? "border-brand-jade bg-brand-jade/5"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-sm">
                            🖐️
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              I don’t need delivery
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Service order, or I’ll pick it up myself
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-slate-500">
                            Free
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              <div>
                <p className="mb-1 text-xs font-medium text-slate-700">
                  Delivery address &amp; landmark
                </p>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value.slice(0, 200))}
                  rows={2}
                  placeholder="Full delivery address + landmark — e.g. 12 Bourdillon Rd, Ikoyi; blue gate, call on arrival"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Required — your GPS pin may not be where you want delivery, so
                  tell the seller exactly where to send it.
                </p>
              </div>
              </>
              )}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
            )}

            <button
              type="button"
              onClick={submitOrder}
              disabled={!canSubmit}
              className="mt-4 w-full rounded-xl bg-brand-jade py-3 text-sm font-semibold text-white transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Starting secure checkout…" : `Pay ${formatCurrency(grandTotal)}`}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Secure payment · you&apos;ll get a receipt on confirmation
            </p>
          </div>
        </div>
      )}
      {/* Notify-me when back in stock */}
      {notifyFor && (
        <NotifyModal
          slug={slug}
          apiBaseUrl={apiBaseUrl}
          product={notifyFor}
          onClose={() => setNotifyFor(null)}
        />
      )}
    </>
  );
}

function NotifyModal({
  slug,
  apiBaseUrl,
  product,
  onClose,
}: {
  slug: string;
  apiBaseUrl: string;
  product: StoreProduct;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (phone.trim().length < 6) return;
    setState("saving");
    try {
      const res = await fetch(`${apiBaseUrl}/public/store/${slug}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ product_id: product.id, phone: phone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not save. Please try again.");
      setMessage(data.message ?? "We'll text you when it's back.");
      setState("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Notify me</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        {state === "done" ? (
          <p className="py-4 text-sm text-emerald-700">{message}</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{product.name}</span> is sold out.
              Drop your number and we&apos;ll text you when it&apos;s back.
            </p>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone (e.g. 08012345678)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
            />
            {state === "error" && message && (
              <p className="mt-2 text-xs text-rose-600">{message}</p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={phone.trim().length < 6 || state === "saving"}
              className="mt-4 w-full rounded-xl bg-brand-jade py-3 text-sm font-semibold text-white transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "saving" ? "Saving…" : "Notify me"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
