"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, Copy, CreditCard, Download, ExternalLink, QrCode, Store } from "lucide-react";

import {
  disableStorefront,
  disableOnlinePayments,
  enableOnlinePayments,
  enableStorefront,
  getStorefront,
  getStorefrontQr,
  saveStorefrontLocation,
  updateStorefront,
} from "@/api/payments-storefront";
import { getBankDetails } from "@/api/bank-details";
import { CurrentLocationCapture, type CapturedLocation } from "@/features/storefront/current-location-capture";
import { copyText, downloadDataUrl } from "@/lib/download";
import { StorefrontSetupGuide } from "./storefront-setup-guide";

// The generated OpenAPI types don't yet include online_payments_enabled on the
// bank-details response; extend locally until types are regenerated.
type BankDetails = Awaited<ReturnType<typeof getBankDetails>> & {
  online_payments_enabled?: boolean;
};

function errorMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response
    ?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

// 0 = Monday (matches the backend's weekday index).
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Storefronts may only open between 7am and 6pm — times are clamped to this range.
const HOURS_MIN = "07:00";
const HOURS_MAX = "18:00";
const clampTime = (v: string): string =>
  !v ? v : v < HOURS_MIN ? HOURS_MIN : v > HOURS_MAX ? HOURS_MAX : v;

export function PaymentsStorefrontSection() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const storefront = useQuery({
    queryKey: ["storefrontStatus"],
    queryFn: getStorefront,
    retry: false,
    staleTime: 60000,
  });

  // Online-payments state + bank presence both come from the bank-details
  // response, so the settings page doesn't fire a separate (slow) status call.
  const bankDetails = useQuery({
    queryKey: ["bankDetails"],
    queryFn: getBankDetails,
    retry: false,
    staleTime: 60000,
    refetchOnMount: "always",
  });

  const enablePayments = useMutation({
    mutationFn: enableOnlinePayments,
    onSuccess: () => {
      toast.success("Online payments enabled — storefront orders can now be paid online.");
      // The Paystack subaccount is created server-side on success, so flip the
      // card immediately, then reconcile.
      queryClient.setQueryData<BankDetails | undefined>(
        ["bankDetails"],
        (old) => (old ? { ...old, online_payments_enabled: true } : old),
      );
      queryClient.invalidateQueries({ queryKey: ["bankDetails"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not enable online payments.")),
  });

  const disablePayments = useMutation({
    mutationFn: disableOnlinePayments,
    onSuccess: () => {
      toast.success("Online payments turned off.");
      queryClient.setQueryData<BankDetails | undefined>(
        ["bankDetails"],
        (old) => (old ? { ...old, online_payments_enabled: false } : old),
      );
      queryClient.invalidateQueries({ queryKey: ["bankDetails"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not turn off online payments.")),
  });

  const enableShop = useMutation({
    mutationFn: () => enableStorefront(),
    onSuccess: (data) => {
      if ((data?.product_count ?? 0) === 0) {
        toast(
          "Storefront enabled — but it's empty. Add products so customers can order.",
          { icon: "🛍️", duration: 6000 },
        );
      } else {
        toast.success("Storefront enabled.");
      }
      queryClient.invalidateQueries({ queryKey: ["storefrontStatus"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not enable your storefront.")),
  });

  const disableShop = useMutation({
    mutationFn: disableStorefront,
    onSuccess: () => {
      toast.success("Storefront hidden.");
      queryClient.invalidateQueries({ queryKey: ["storefrontStatus"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not hide your storefront.")),
  });

  const toggleSocialPromotion = useMutation({
    mutationFn: (opt_in: boolean) => updateStorefront({ social_promotion_opt_in: opt_in }),
    onSuccess: (data) => {
      toast.success(
        data.social_promotion_opt_in
          ? "Your products may now be featured on SuoOps's Facebook & Instagram."
          : "Turned off — your products won't be featured on SuoOps's social media.",
      );
      queryClient.invalidateQueries({ queryKey: ["storefrontStatus"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not update this setting.")),
  });

  const [desc, setDesc] = useState("");
  useEffect(() => {
    if (storefront.data?.description != null) setDesc(storefront.data.description);
  }, [storefront.data?.description]);

  // Editable store-link slug. Renaming the business does NOT auto-change it (that
  // would break links already shared), so the seller edits it here deliberately.
  const [slug, setSlug] = useState("");
  useEffect(() => {
    if (storefront.data?.slug != null) setSlug(storefront.data.slug);
  }, [storefront.data?.slug]);

  // Store details (announcement + GPS-derived city/state). Address/city/state are
  // NOT hand-typed — they come from the GPS pin (anti-fraud, exact location).
  const [details, setDetails] = useState({
    city: "",
    state: "",
    announcement: "",
  });
  // Weekly opening hours: {"0".. "6": {open, close}} (0=Mon). Absent day = closed.
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({});
  useEffect(() => {
    const d = storefront.data;
    if (!d) return;
    setDetails({
      city: d.city ?? "",
      state: d.state ?? "",
      announcement: d.announcement ?? "",
    });
    setHours(d.hours ?? {});
  }, [storefront.data]);

  const toggleDay = (i: number) =>
    setHours((h) => {
      const key = String(i);
      const next = { ...h };
      if (next[key]) delete next[key];
      else next[key] = { open: "09:00", close: "18:00" };
      return next;
    });
  const setDayTime = (i: number, field: "open" | "close", value: string) =>
    setHours((h) => ({ ...h, [String(i)]: { ...h[String(i)], [field]: clampTime(value) } }));

  // One Save for the whole storefront tab: description + announcement + hours.
  // (Location is saved the moment you pin it via GPS.)
  const saveStore = useMutation({
    mutationFn: () =>
      updateStorefront({
        slug:
          slug.trim() && slug.trim() !== (storefront.data?.slug ?? "")
            ? slug.trim()
            : undefined,
        description: desc.trim(),
        announcement: details.announcement.trim(),
        hours,
      }),
    onSuccess: () => {
      toast.success("Storefront saved.");
      queryClient.invalidateQueries({ queryKey: ["storefrontStatus"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Could not save your storefront.")),
  });

  // GPS location capture — server derives the state for the buyer-protection window.
  const [locBusy, setLocBusy] = useState(false);
  const handleLocate = async (loc: CapturedLocation) => {
    setLocBusy(true);
    try {
      const res = await saveStorefrontLocation(loc.lat, loc.lng, loc.accuracy);
      setDetails((d) => ({
        ...d,
        city: res.city ?? d.city,
        state: res.state ?? d.state,
      }));
      queryClient.invalidateQueries({ queryKey: ["storefrontStatus"] });
      toast.success(res.state ? `Store location saved — ${res.state}` : "Store location saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save your location. Please try again."));
    } finally {
      setLocBusy(false);
    }
  };

  const bank = bankDetails.data as BankDetails | undefined;
  const payEnabled = bank?.online_payments_enabled ?? false;
  const hasBank = Boolean(
    bank?.bank_name && bank?.account_number && bank?.account_name,
  );
  const storeEnabled = storefront.data?.enabled ?? false;
  const link = storefront.data?.link ?? null;
  const hasLogo = storefront.data?.has_logo ?? false;
  const hasListableProduct = (storefront.data?.listable_product_count ?? 0) > 0;

  // Everything on the storefront tab is required before it can be saved.
  const stateSet = Boolean(details.state.trim());
  const hoursSet = Object.keys(hours).length > 0;
  const descSet = desc.trim().length > 0;
  const detailsComplete = descSet && stateSet && hoursSet;
  const savedDetailsComplete = Boolean(
    storefront.data?.description?.trim() &&
    storefront.data?.state?.trim() &&
    Object.keys(storefront.data?.hours ?? {}).length > 0,
  );

  const storefrontQr = useQuery({
    queryKey: ["storefrontQr"],
    queryFn: getStorefrontQr,
    enabled: showQr && storeEnabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const copyLink = async () => {
    if (!link) return;
    if (await copyText(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Online Payments ── */}
      <div id="online-payments" className="scroll-mt-20 rounded-xl border border-brand-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-jade" />
            <h3 className="text-sm font-semibold text-brand-text">Online payments</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              payEnabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${payEnabled ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {payEnabled ? "Enabled" : "Off"}
          </span>
        </div>
        <p className="mt-2 text-xs text-brand-textMuted">
          Accept card &amp; transfer payments on your storefront. When a customer
          orders from your storefront link they pay instantly and it&apos;s
          confirmed automatically — no pack used, we keep a 3% commission. Your
          manually-created invoices are unaffected: those stay on bank transfer
          and packs.
        </p>

        {payEnabled ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-emerald-700">
              ✓ Storefront orders can be paid online and confirm instantly.
            </p>
            <button
              type="button"
              onClick={() => disablePayments.mutate()}
              disabled={disablePayments.isPending}
              className="shrink-0 text-xs font-medium text-brand-textMuted underline-offset-2 hover:text-rose-600 hover:underline disabled:opacity-60"
            >
              {disablePayments.isPending ? "Turning off…" : "Turn off"}
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => enablePayments.mutate()}
              disabled={!hasBank || enablePayments.isPending || bankDetails.isLoading}
              className="rounded-lg bg-brand-jade px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enablePayments.isPending ? "Enabling…" : "Enable online payments"}
            </button>
            {!hasBank && (
              <p className="mt-2 text-xs text-amber-600">
                Add your bank details above first — we verify them with your bank
                to set this up.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Public Storefront ── */}
      <div id="storefront" className="scroll-mt-20 rounded-xl border border-brand-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-brand-jade" />
            <h3 className="text-sm font-semibold text-brand-text">Public storefront</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              storeEnabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${storeEnabled ? "bg-emerald-500" : "bg-slate-400"}`}
            />
            {storeEnabled ? "Live" : "Off"}
          </span>
        </div>
        <p className="mt-2 text-xs text-brand-textMuted">
          A shareable page of your products. Customers browse, order, and — with
          online payments on — pay instantly. Share the link on WhatsApp,
          Instagram, or your bio.
        </p>

        <StorefrontSetupGuide
          storeEnabled={storeEnabled}
          hasLogo={hasLogo}
          detailsComplete={savedDetailsComplete}
          hasListableProduct={hasListableProduct}
          hasBankDetails={hasBank}
          paymentsEnabled={payEnabled}
          storeLink={link}
          enablingStore={enableShop.isPending}
          enablingPayments={enablePayments.isPending}
          onEnableStore={() => enableShop.mutate()}
          onEnablePayments={() => enablePayments.mutate()}
        />

        {storeEnabled && link ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="flex-1 truncate text-sm text-brand-text">{link}</span>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </a>
              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                <QrCode className="h-3.5 w-3.5" />
                {showQr ? "Hide QR" : "QR code"}
              </button>
            </div>
            {showQr ? (
              <div className="rounded-lg border border-brand-border bg-white p-4 text-center">
                {storefrontQr.isLoading ? (
                  <div className="mx-auto h-44 w-44 animate-pulse rounded-xl bg-slate-100" />
                ) : storefrontQr.data ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={storefrontQr.data.qr_png}
                      alt="Storefront QR code"
                      className="mx-auto h-44 w-44"
                    />
                    <p className="mt-2 text-xs text-brand-textMuted">
                      Scan to open your storefront. Print it, put it on your shop,
                      flyers or packaging.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const qr = storefrontQr.data?.qr_png;
                        if (qr) downloadDataUrl(qr, "storefront-qr.png", "My storefront");
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-jadeHover"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </>
                ) : (
                  <p className="py-6 text-xs text-amber-600">
                    Could not generate the QR code. Try again in a moment.
                  </p>
                )}
              </div>
            ) : null}
            <div id="storefront-details" className="scroll-mt-20">
              <label className="block text-xs font-medium text-brand-textMuted">
                Store link
              </label>
              <div className="mt-1 flex items-center rounded-lg border border-brand-border bg-white focus-within:border-brand-jade focus-within:ring-1 focus-within:ring-brand-jade">
                <span className="whitespace-nowrap pl-3 text-sm text-brand-textMuted">
                  suoops.com/store/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 58),
                    )
                  }
                  placeholder="your-store"
                  className="block w-full rounded-r-lg bg-transparent px-1 py-2 text-sm text-brand-text focus:outline-none"
                />
              </div>
              <span className="mt-1 block text-[11px] text-brand-textMuted">
                Renaming your business doesn&apos;t change this. Editing it updates your
                store URL — links you already shared will stop working.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-textMuted">
                What do you sell?{" "}
                <span className="text-rose-500">*</span>{" "}
                <span className="font-normal">(shown in the Shops directory)</span>
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 160))}
                rows={2}
                maxLength={160}
                placeholder="e.g. Fresh cakes, pastries & small chops for events."
                className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
              />
              <span className="mt-1 block text-xs text-brand-textMuted">{desc.length}/160</span>
            </div>

            {/* Store details: location, announcement, opening hours */}
            <div className="space-y-3 rounded-lg border border-brand-border p-3">
              <p className="text-xs font-semibold text-brand-text">Store details</p>

              <div className="rounded-lg bg-brand-background/60 p-3">
                <p className="text-xs font-medium text-brand-text">
                  Store location (GPS) <span className="text-rose-500">*</span>
                </p>
                <p className="mb-2 text-[11px] text-brand-textMuted">
                  Tap to pin your shop&apos;s exact spot. This sets your store&apos;s
                  state and powers safe-payment protection for your buyers.
                </p>
                <CurrentLocationCapture
                  onCapture={handleLocate}
                  busy={locBusy}
                  confirmedLabel={details.state || null}
                  ctaLabel="Pin my store location"
                />
                {details.state ? (
                  <p className="mt-2 text-[11px] font-medium text-emerald-700">
                    ✓ Location set{details.city ? ` — ${details.city}, ` : " — "}
                    {details.state}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-amber-600">
                    Required — pin your location to set your state.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-textMuted">
                  Announcement <span className="font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={details.announcement}
                  onChange={(e) => setDetails((d) => ({ ...d, announcement: e.target.value.slice(0, 200) }))}
                  placeholder="Announcement banner — e.g. 🎉 20% off this week"
                  className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-brand-textMuted">
                  Opening hours <span className="text-rose-500">*</span>{" "}
                  <span className="font-normal">(7am–6pm only — shows an “Open / Closed” badge)</span>
                </p>
                <div className="space-y-1.5">
                  {DAY_LABELS.map((label, i) => {
                    const key = String(i);
                    const day = hours[key];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <label className="flex w-16 shrink-0 items-center gap-1.5 text-xs text-brand-text">
                          <input
                            type="checkbox"
                            checked={!!day}
                            onChange={() => toggleDay(i)}
                          />
                          {label}
                        </label>
                        {day ? (
                          <div className="flex min-w-0 flex-1 items-center gap-1 text-xs text-brand-textMuted">
                            <input
                              type="time"
                              min={HOURS_MIN}
                              max={HOURS_MAX}
                              value={day.open}
                              onChange={(e) => setDayTime(i, "open", e.target.value)}
                              className="w-full min-w-0 rounded-md border border-brand-border bg-white px-2 py-1 text-xs text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                            />
                            <span className="shrink-0">–</span>
                            <input
                              type="time"
                              min={HOURS_MIN}
                              max={HOURS_MAX}
                              value={day.close}
                              onChange={(e) => setDayTime(i, "close", e.target.value)}
                              className="w-full min-w-0 rounded-md border border-brand-border bg-white px-2 py-1 text-xs text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-brand-textMuted">Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!detailsComplete && (
                <p className="text-xs text-amber-600">
                  To save, add a description, pin your location, and set at least one
                  opening day.
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => saveStore.mutate()}
                  disabled={saveStore.isPending || !detailsComplete}
                  className="rounded-md bg-brand-jade px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveStore.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {/* Social media auto-promotion opt-in — a curated daily batch,
                not every product, on SuoOps's own Facebook/Instagram. */}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-border p-3">
              <div>
                <p className="text-xs font-semibold text-brand-text">
                  Feature my products on SuoOps&apos;s social media
                </p>
                <p className="mt-1 text-[11px] text-brand-textMuted">
                  A few of your products may be picked for a free feature post on
                  SuoOps&apos;s official Facebook &amp; Instagram — extra free exposure,
                  not guaranteed for every item. You can exclude specific products
                  in Inventory, or turn this off any time.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(storefront.data?.social_promotion_opt_in)}
                onClick={() =>
                  toggleSocialPromotion.mutate(!storefront.data?.social_promotion_opt_in)
                }
                disabled={toggleSocialPromotion.isPending}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                  storefront.data?.social_promotion_opt_in ? "bg-brand-jade" : "bg-brand-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    storefront.data?.social_promotion_opt_in ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => disableShop.mutate()}
              disabled={disableShop.isPending}
              className="text-xs font-medium text-brand-textMuted underline-offset-2 hover:text-rose-600 hover:underline disabled:opacity-60"
            >
              {disableShop.isPending ? "Hiding…" : "Hide storefront"}
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => enableShop.mutate()}
              disabled={enableShop.isPending || storefront.isLoading}
              className="rounded-lg bg-brand-jade px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enableShop.isPending ? "Enabling…" : "Enable storefront"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
