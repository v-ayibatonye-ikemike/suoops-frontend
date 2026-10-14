"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { components } from "@/api/types";
import { formatPaidAt } from "../../../src/utils/formatDate";
import { printPdf } from "../../../src/utils/printPdf";

type InvoicePublic = components["schemas"]["InvoicePublicOut"] & {
  pdf_url?: string | null;
  receipt_pdf_url?: string | null;
  online_payments_enabled?: boolean;
  online_only?: boolean;
};

type Props = {
  initialInvoice: InvoicePublic;
  invoiceId: string;
  apiBaseUrl: string;
};

const formatCurrency = (value: string | null | undefined, currency = "NGN") => {
  if (!value) return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  const cur = currency === "USD" ? "USD" : "NGN";
  const locale = cur === "USD" ? "en-US" : "en-NG";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: cur === "USD" ? 2 : 0,
  }).format(amount);
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/* ──────────────────────────── */
/*  Tiny SVG icons (inline to avoid external dependencies) */
/* ──────────────────────────── */
function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function InvoiceClient({ initialInvoice, invoiceId, apiBaseUrl }: Props) {
  const [invoice, setInvoice] = useState<InvoicePublic>(initialInvoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  // Buyer-only escrow RELEASE code for held storefront orders. It's stashed in
  // this tab's sessionStorage at checkout (keyed by invoice) and revealed here
  // AFTER payment. sessionStorage is deliberate: it survives the payment redirect
  // but is wiped when the tab closes, so the code never persists on a shared
  // device. It never reaches the seller or the rider, and the WhatsApp message
  // is the durable copy.
  const [releaseCode, setReleaseCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    try {
      const code = window.sessionStorage.getItem(`suoops_release:${invoiceId}`);
      if (code) setReleaseCode(code);
    } catch {
      /* storage blocked — the code is also on the buyer's WhatsApp */
    }
  }, [invoiceId]);

  const isPaid = invoice.status === "paid";
  const isAwaiting = invoice.status === "awaiting_confirmation";
  const isClosed = invoice.status === "cancelled";
  const cur = invoice.currency ?? "NGN";

  // Security: if the checkout was cancelled/closed, wipe the stashed release
  // code. An unpaid order's code is meaningless and must never linger on the
  // device (a cancelled Paystack checkout redirects back to this page).
  useEffect(() => {
    if (isClosed) {
      try {
        window.sessionStorage.removeItem(`suoops_release:${invoiceId}`);
      } catch {
        /* ignore */
      }
      setReleaseCode(null);
    }
  }, [isClosed, invoiceId]);

  const handleConfirmTransfer = useCallback(async () => {
    if (isSubmitting || isPaid || isAwaiting || isClosed) return;

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/public/invoices/${invoiceId}/confirm-transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to update invoice. Please try again.");
      }

      const data = (await response.json()) as InvoicePublic;
      setInvoice(data);
      setFeedback(
        "Business notified! You’ll receive your receipt once they confirm.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }, [apiBaseUrl, invoiceId, isAwaiting, isClosed, isPaid, isSubmitting]);

  const handlePayNow = useCallback(async () => {
    if (payLoading || isPaid || isClosed) return;
    setPayLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/public/invoices/${invoiceId}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("Unable to start payment. Please try again.");
      }
      const data = (await response.json()) as { authorization_url?: string };
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("Payment could not be started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPayLoading(false);
    }
  }, [apiBaseUrl, invoiceId, isClosed, isPaid, payLoading]);

  // A paid invoice may still need escrow activation after a partial webhook.
  // The backend verifies on the original collecting provider.
  useEffect(() => {
    if (isClosed) return;
    let reference: string | null = null;
    try {
      reference = new URLSearchParams(window.location.search).get("ref");
    } catch {
      reference = null;
    }
    if (!reference) return;
    let cancelled = false;
    setVerificationError(false);
    (async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/public/invoices/${invoiceId}/verify?reference=${encodeURIComponent(reference)}`,
          { method: "POST" },
        );
        if (cancelled) return;
        if (!res.ok) throw new Error("Payment verification unavailable");
        const data = (await res.json()) as { status?: string };
        if (data.status === "paid") {
          const fresh = await fetch(`${apiBaseUrl}/public/invoices/${invoiceId}`, { cache: "no-store" });
          if (!fresh.ok) throw new Error("Could not refresh payment receipt");
          if (!cancelled) setInvoice((await fresh.json()) as InvoicePublic);
        }
      } catch (err) {
        console.warn("[verify] failed:", err);
        if (!cancelled) setVerificationError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, invoiceId, isClosed, verificationAttempt]);

  // Poll for status updates with exponential backoff
  useEffect(() => {
    if (isPaid || isClosed) return;
    setIsPolling(true);
    let delay = 8_000;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/public/invoices/${invoiceId}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Could not refresh invoice status");
        const data = (await res.json()) as InvoicePublic;
        if (cancelled) return;
        setInvoice(data);
        if (data.status === "paid" || data.status === "cancelled") {
          setIsPolling(false);
          return;
        }
      } catch (err) {
        console.warn("[poll] status fetch failed:", err);
      }
      delay = Math.min(delay * 1.5, 30_000);
      if (!cancelled) timer = setTimeout(poll, delay);
    };

    timer = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiBaseUrl, invoiceId, isPaid, isClosed]);

  const copyField = useCallback(
    async (field: string, value: string | null | undefined) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const statusConfig = useMemo(() => {
    if (isPaid)
      return { text: "Payment Confirmed", dotColor: "bg-emerald-400" };
    if (isAwaiting)
      return { text: "Awaiting Confirmation", dotColor: "bg-amber-400" };
    if (isClosed) return { text: "Cancelled", dotColor: "bg-slate-300" };
    return { text: "Pending Payment", dotColor: "bg-blue-400" };
  }, [isPaid, isAwaiting, isClosed]);

  const businessInitial = (invoice.business_name || "S")[0].toUpperCase();
  const createdDate = formatDate(invoice.created_at ?? null);
  const lines = invoice.lines ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Trust Bar */}
      <div className="bg-brand-evergreen">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2 px-4 py-2">
          <LockIcon className="h-3 w-3 text-emerald-300" />
          <span className="text-[11px] font-medium tracking-wide text-emerald-200">
            Secure payment page &bull; suoops.com
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-brand-evergreen px-4 pb-8 pt-4">
        <div className="mx-auto max-w-lg">
          {/* Business Identity */}
          <div className="flex items-center gap-3">
            {invoice.business_logo_url ? (
              // external per-business logo URL (arbitrary host); next/image would
              // require allow-listing every seller's image host in next.config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.business_logo_url}
                alt={invoice.business_name ?? "Business"}
                className="h-11 w-11 rounded-xl border-2 border-white/20 bg-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-white/20 bg-white/10 text-lg font-bold text-white shadow-lg">
                {businessInitial}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">
                {invoice.business_name || "Business"}
              </h1>
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-emerald-300">
                  Verified on Suoops
                </span>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/70">
              {invoice.invoice_id.length > 12
                ? `${invoice.invoice_id.slice(0, 8)}…`
                : invoice.invoice_id}
            </span>
          </div>

          {/* Personalized greeting */}
          {invoice.customer_name && !isPaid && !isClosed && (
            <p className="mt-4 text-sm text-white/70">
              Hi {invoice.customer_name}, here&apos;s your invoice from{" "}
              <span className="font-semibold text-white">
                {invoice.business_name || "this business"}
              </span>
              .
            </p>
          )}
        </div>
      </header>

      {/* Main Card */}
      <main className="-mt-1 px-4 pb-10">
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
            {/* Amount Section */}
            <div className="border-b border-slate-100 px-6 py-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {isPaid ? "Amount Paid" : "Amount Due"}
              </p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
                {formatCurrency(invoice.amount, cur)}
              </p>
              {!isPaid && !isClosed && invoice.amount && (
                <button
                  onClick={() => copyField("amount", String(invoice.amount))}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-200"
                  aria-label="Copy amount"
                >
                  {copiedField === "amount" ? "✓ Copied" : "Copy amount"}
                </button>
              )}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-100">
                <span
                  className={`h-2 w-2 rounded-full ${statusConfig.dotColor} animate-pulse`}
                />
                <span className="text-xs font-semibold text-slate-600">
                  {statusConfig.text}
                </span>
              </div>

              {/* Date info */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                {createdDate && <span>Issued {createdDate}</span>}
                {invoice.due_date && !isPaid && (
                  <>
                    <span>•</span>
                    <span>Due {formatDate(invoice.due_date)}</span>
                  </>
                )}
                {isPaid && invoice.paid_at && (
                  <span className="font-medium text-emerald-600">
                    Paid {formatPaidAt(invoice.paid_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Buyer-only escrow RELEASE code (held storefront orders). Shown
                ONLY after payment is confirmed (never on a cancelled/abandoned
                checkout) and on the buyer's own device — this is NOT the courier
                code and the rider never needs it. */}
            {releaseCode && isPaid && (
              <div className="border-b border-slate-100 bg-brand-jade/5 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-jadeText">
                    Your release code
                  </h3>
                  <button
                    onClick={() => {
                      copyField("release", releaseCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-jade ring-1 ring-brand-jade/20 transition hover:bg-brand-jade/10"
                    aria-label="Copy release code"
                  >
                    {codeCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="my-3 rounded-xl bg-white py-4 text-center text-3xl font-bold tracking-[0.4em] text-brand-jade ring-1 ring-brand-jade/10">
                  {releaseCode}
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  Share this code with the <span className="font-semibold">seller</span>{" "}
                  <span className="font-semibold">only after you&apos;ve received what you paid for</span> — it
                  releases your payment. Don&apos;t share it before then, or with anyone else. We&apos;ve
                  also sent it to your WhatsApp.
                </p>
              </div>
            )}

            {/* Line Items — Transparency builds trust */}
            {lines.length > 0 && (
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  What you&apos;re paying for
                </h3>
                <div className="space-y-2.5">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {line.description}
                        </p>
                        <p className="text-xs text-slate-400">
                          {line.quantity} ×{" "}
                          {formatCurrency(line.unit_price, cur)}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold text-slate-700">
                        {formatCurrency(
                          String(line.quantity * Number(line.unit_price)),
                          cur,
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Total
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {formatCurrency(invoice.amount, cur)}
                  </span>
                </div>
              </div>
            )}

            {/* Bank Details — For unpaid invoices */}
            {!isPaid && !isClosed && !invoice.online_only && (
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Bank Transfer Details
                </h3>

                <div className="space-y-3">
                  {/* Bank Name */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Bank
                      </p>
                      <p className="font-semibold text-slate-900">
                        {invoice.bank_name || "—"}
                      </p>
                    </div>
                    {invoice.bank_name && (
                      <button
                        onClick={() => copyField("bank", invoice.bank_name)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                      >
                        {copiedField === "bank" ? "✓" : "Copy"}
                      </button>
                    )}
                  </div>

                  {/* Account Number — Most important, visually prominent */}
                  <div className="flex items-center justify-between rounded-xl bg-brand-evergreen/5 px-4 py-3 ring-1 ring-brand-evergreen/10">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Account Number
                      </p>
                      <p className="font-mono text-lg font-bold tracking-wider text-slate-900">
                        {invoice.account_number || "—"}
                      </p>
                    </div>
                    {invoice.account_number && (
                      <button
                        onClick={() =>
                          copyField("account", invoice.account_number)
                        }
                        className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-primary/90"
                      >
                        {copiedField === "account" ? "✓ Copied" : "Copy"}
                      </button>
                    )}
                  </div>

                  {/* Account Name */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Account Name
                      </p>
                      <p className="font-semibold text-slate-900">
                        {invoice.account_name || "—"}
                      </p>
                    </div>
                    {invoice.account_name && (
                      <button
                        onClick={() =>
                          copyField("name", invoice.account_name)
                        }
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                      >
                        {copiedField === "name" ? "✓" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Messages */}
            {verificationError && (
              <div role="alert" className="mx-6 mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>We couldn&apos;t finish checking this payment. If you were debited, don&apos;t pay again.</p>
                <button
                  type="button"
                  onClick={() => setVerificationAttempt((attempt) => attempt + 1)}
                  className="mt-2 font-semibold underline"
                >
                  Check payment again
                </button>
                {" · "}
                <a href="https://support.suoops.com" className="font-semibold underline">Contact support</a>
              </div>
            )}
            {error && (
              <div
                className="mx-6 mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {error}
              </div>
            )}
            {feedback && (
              <div
                className="mx-6 mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                aria-live="polite"
              >
                {feedback}
              </div>
            )}

            {/* Action Area */}
            <div className="px-6 py-6">
              {!isPaid && !isClosed && (
                <>
                  {/* Pay Now — online payment via the business's Paystack subaccount */}
                  {invoice.online_payments_enabled && !isAwaiting && (
                    <div className="mb-5">
                      <button
                        onClick={handlePayNow}
                        disabled={payLoading}
                        className="w-full rounded-xl bg-brand-jade py-4 text-base font-semibold text-white shadow-lg transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {payLoading
                          ? "Starting secure checkout…"
                          : `Pay ${formatCurrency(invoice.amount, cur)} now`}
                      </button>
                      <p className="mt-2 text-center text-[11px] text-slate-400">
                        Secure card or bank payment · instant confirmation
                      </p>
                      <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          or pay by transfer
                        </span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>
                  )}

                  {/* How It Works — Reduces fear */}
                  {!isAwaiting && !invoice.online_only && (
                    <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3.5 ring-1 ring-blue-100">
                      <p className="mb-2 text-xs font-semibold text-blue-800">
                        How it works:
                      </p>
                      <ol className="space-y-1.5 text-xs text-blue-700">
                        <li className="flex gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800">
                            1
                          </span>
                          Transfer the exact amount to the bank details above
                        </li>
                        <li className="flex gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800">
                            2
                          </span>
                          Tap the button below to notify{" "}
                          {invoice.business_name || "the business"}
                        </li>
                        <li className="flex gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[10px] font-bold text-blue-800">
                            3
                          </span>
                          You&apos;ll receive your receipt once payment is
                          confirmed
                        </li>
                      </ol>
                    </div>
                  )}

                  {!invoice.online_only && (
                    <button
                      onClick={handleConfirmTransfer}
                      disabled={isSubmitting || isAwaiting}
                      className="w-full rounded-xl bg-brand-primary py-4 text-base font-semibold text-white shadow-lg transition hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isAwaiting
                        ? "✓ Business Notified — Awaiting Confirmation"
                        : isSubmitting
                          ? "Notifying..."
                          : "I’ve sent the transfer"}
                    </button>
                  )}

                  {isAwaiting && (
                    <p className="mt-3 text-center text-xs text-slate-400">
                      {invoice.business_name || "The business"} has been
                      notified. This page will update automatically once they
                      confirm your payment.
                    </p>
                  )}

                  {isPolling && !isAwaiting && (
                    <p className="mt-2 text-center text-xs text-slate-400">
                      Auto-checking status…
                    </p>
                  )}
                </>
              )}

              {isPaid && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 px-4 py-5 text-center ring-1 ring-emerald-100">
                    <CheckCircleIcon className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2 text-lg font-bold text-emerald-800">
                      Payment Confirmed
                    </p>
                    <p className="mt-1 text-sm text-emerald-600">
                      Thank you! Your receipt{" "}
                      {invoice.receipt_pdf_url
                        ? "is ready below"
                        : "has been sent"}
                      .
                    </p>
                  </div>

                  {(invoice.receipt_pdf_url || invoice.pdf_url) && (
                    <div className="flex flex-wrap gap-2">
                      {invoice.receipt_pdf_url && (
                        <a
                          href={invoice.receipt_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          📄 Download Receipt
                        </a>
                      )}
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          🧾 View Invoice
                        </a>
                      )}
                      {(invoice.receipt_pdf_url || invoice.pdf_url) && (
                        <button
                          type="button"
                          onClick={() => {
                            const url =
                              invoice.receipt_pdf_url || invoice.pdf_url;
                            if (url) printPdf(url);
                          }}
                          className="flex-1 rounded-lg border border-emerald-600 bg-emerald-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                          aria-label="Print receipt to a connected printer"
                        >
                          🖨 Print Receipt
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isClosed && (
                <div className="rounded-xl bg-slate-100 px-4 py-5 text-center">
                  <p className="font-semibold text-slate-700">
                    Invoice Cancelled
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Contact {invoice.business_name || "the business"} for a new
                    invoice.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Trust Footer */}
          <div className="mt-6 space-y-4">
            {/* Security badge */}
            <div className="flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
              <ShieldIcon className="h-5 w-5 text-emerald-500" />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-700">
                  Protected by Suoops
                </p>
                <p className="text-[10px] text-slate-400">
                  Secure invoicing &amp; payment tracking
                </p>
              </div>
            </div>

            {/* Fine print */}
            <div className="space-y-1.5 text-center">
              <p className="text-[11px] text-slate-400">
                This invoice was created by{" "}
                <span className="font-medium text-slate-500">
                  {invoice.business_name || "a verified business"}
                </span>{" "}
                using Suoops.
              </p>
              <p className="text-[11px] text-slate-400">
                Suoops does not process payments. You pay the business directly
                via bank transfer.
              </p>
              <p className="mt-3 text-[11px] text-slate-300">
                Having trouble? Contact the business directly.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
