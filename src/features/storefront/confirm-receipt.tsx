"use client";

import { useState } from "react";

import { getConfig } from "@/lib/config";

/**
 * Buyer-only release-code confirmation clears protection, not settlement time.
 */
export function ConfirmReceipt({ slug }: { slug: string }) {
  const { apiBaseUrl } = getConfig();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  return (
    <section className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-brand-jade hover:underline"
      >
        Got what you paid for? Confirm you received it
      </button>
      <button
        type="button"
        onClick={() => setReporting(true)}
        className="text-xs font-semibold text-slate-500 hover:underline"
      >
        Problem with your order? Report it
      </button>
      {open && <ConfirmModal slug={slug} apiBaseUrl={apiBaseUrl} onClose={() => setOpen(false)} />}
      {reporting && (
        <ReportModal slug={slug} apiBaseUrl={apiBaseUrl} onClose={() => setReporting(false)} />
      )}
    </section>
  );
}

function ConfirmModal({
  slug,
  apiBaseUrl,
  onClose,
}: {
  slug: string;
  apiBaseUrl: string;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (code.trim().length < 4) return;
    setState("saving");
    try {
      const res = await fetch(`${apiBaseUrl}/public/store/${slug}/confirm-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail || data.message || "Could not confirm your order.");
      setMessage(data.message ?? "Thank you for confirming!");
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
          <h3 className="text-base font-bold text-slate-900">Confirm you got what you paid for</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {state === "done" ? (
          <p className="py-4 text-sm text-emerald-700">{message}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Only confirm once you have received and checked your order — this ends your
              protection window and approves seller payout on the settlement schedule.
              Enter the <span className="font-semibold">release code</span> we sent you
              (also shown on your payment page). It&apos;s not the rider&apos;s code.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit release code"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
            />
            {state === "error" && message && (
              <p className="mt-2 text-xs text-rose-600">{message}</p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={code.trim().length < 4 || state === "saving"}
              className="mt-4 w-full rounded-xl bg-brand-jade py-3 text-sm font-semibold text-white transition hover:bg-brand-jadeHover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "saving" ? "Confirming…" : "Yes, I received my order"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReportModal({
  slug,
  apiBaseUrl,
  onClose,
}: {
  slug: string;
  apiBaseUrl: string;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (code.trim().length < 4 || reason.trim().length < 3) return;
    setState("saving");
    try {
      const res = await fetch(`${apiBaseUrl}/public/store/${slug}/report-problem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ code: code.trim(), reason: reason.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; detail?: string };
      if (!res.ok) throw new Error(data.detail || data.message || "Could not send your report.");
      setMessage(data.message ?? "Thanks — our team will review this.");
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
          <h3 className="text-base font-bold text-slate-900">Report a problem</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {state === "done" ? (
          <p className="py-4 text-sm text-emerald-700">{message}</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Your payment is safely held. Tell us what went wrong and our team will step in —
              enter your 6-digit release code so we know it&apos;s you.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit release code"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 255))}
              rows={3}
              placeholder="What went wrong? (e.g. never delivered, wrong item)"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-jade focus:outline-none focus:ring-2 focus:ring-brand-jade/20"
            />
            {state === "error" && message && (
              <p className="mt-2 text-xs text-rose-600">{message}</p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={code.trim().length < 4 || reason.trim().length < 3 || state === "saving"}
              className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "saving" ? "Sending…" : "Submit report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
