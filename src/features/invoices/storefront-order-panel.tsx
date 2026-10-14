"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Bike, CheckCircle2, Package, Truck } from "lucide-react";

import { apiClient } from "@/api/client";

import { OrderMessageThread } from "./order-message-thread";

export interface OrderEscrow {
  status: string;
  held: boolean;
  release_due_at: string | null;
  confirmed_at: string | null;
  settle_at?: string | null;
  release_approved_at?: string | null;
  payout_pending?: boolean;
  delivered_at: string | null;
  delivery_proof_note: string | null;
  delivery_proof_url: string | null;
  held_for_review: boolean;
  gross_naira: number;
  payout_naira: number;
  customer_name: string | null;
  customer_phone: string | null;
  dispatched_at: string | null;
  dispatch_tracking: string | null;
  dispatch_note: string | null;
  dispatch_carrier: string | null;
  dispatch_eta: string | null;
  dispatch_proof_url: string | null;
  dispatch_tracking_url: string | null;
  delivery_status: string | null;
  delivery_status_label: string | null;
  delivery_status_at: string | null;
  delivery_courier: string | null;
  delivery_service_type: string | null;
  delivery_dropoff_station: string | null;
  requires_delivery?: boolean;
  unread_messages?: number;
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "any moment now";
  const totalH = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalH / 24);
  const hours = totalH % 24;
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${totalH}h ${mins}m`;
}

// Format an ISO date (YYYY-MM-DD) as e.g. "Tue 14 Jul".
function formatEta(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Buyer-protection status for a storefront order, shown to the business on the
 * invoice. Renders nothing for non-storefront invoices (no escrow row).
 */
export function StorefrontOrderPanel({ invoiceId }: { invoiceId: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sentOpen, setSentOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [sentEta, setSentEta] = useState("");
  const [sentNote, setSentNote] = useState("");
  const [sentFile, setSentFile] = useState<File | null>(null);

  const { data: escrow, isError, refetch } = useQuery({
    queryKey: ["orderEscrow", invoiceId],
    queryFn: async () => {
      const res = await apiClient.get<{ escrow: OrderEscrow | null }>(
        `/inventory/storefront/orders/${invoiceId}`,
      );
      return res.data.escrow;
    },
    enabled: Boolean(invoiceId),
    retry: false,
    refetchInterval: (query) => {
      const order = query.state.data;
      const pending = ["booking_pending", "booking_in_progress"].includes(order?.delivery_status ?? "");
      const requestedAt = order?.delivery_status_at ? new Date(order.delivery_status_at).getTime() : 0;
      return pending && Date.now() - requestedAt < 120_000 ? 3000 : false;
    },
  });

  const markDelivered = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (note.trim()) fd.append("note", note.trim());
      if (file) fd.append("file", file);
      const res = await apiClient.post(
        `/inventory/storefront/orders/${invoiceId}/mark-delivered`,
        fd,
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Marked as delivered — saved as your proof.");
      setOpen(false);
      setNote("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["orderEscrow", invoiceId] });
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast.error(detail || "Could not mark delivered. Please try again.");
    },
  });

  const markRendered = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(
        `/inventory/storefront/orders/${invoiceId}/mark-delivered`,
        new FormData(),
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Marked as done — buyers can see the service was rendered.");
      qc.invalidateQueries({ queryKey: ["orderEscrow", invoiceId] });
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast.error(detail || "Could not update. Please try again.");
    },
  });

  const markSent = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (tracking.trim()) fd.append("tracking", tracking.trim());
      if (carrier.trim()) fd.append("carrier", carrier.trim());
      if (sentEta.trim()) fd.append("eta", sentEta.trim());
      if (sentNote.trim()) fd.append("note", sentNote.trim());
      if (sentFile) fd.append("file", sentFile);
      const res = await apiClient.post<{ escrow: OrderEscrow }>(
        `/inventory/storefront/orders/${invoiceId}/mark-sent`,
        fd,
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data.escrow.delivery_status === "booking_unknown") {
        toast.error("Booking is unconfirmed. Contact support before retrying.");
      } else if (data.escrow.delivery_status === "booking_failed") {
        toast.error("Courier booking failed. Review the order before retrying.");
      } else if (data.escrow.delivery_status?.startsWith("booking_")) {
        toast("Courier booking requested — wait for confirmation.");
      } else if (data.escrow.delivery_courier) {
        toast.success("Courier booking is confirmed. Check the order for delivery progress.");
      } else {
        toast.success("Marked as sent out — the buyer has been notified.");
      }
      setSentOpen(false);
      setTracking("");
      setCarrier("");
      setSentEta("");
      setSentNote("");
      setSentFile(null);
      qc.invalidateQueries({ queryKey: ["orderEscrow", invoiceId] });
    },
    onError: (err) => {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      toast.error(detail || "Could not update the order. Refresh its status before trying again.");
      qc.invalidateQueries({ queryKey: ["orderEscrow", invoiceId] });
    },
  });

  if (isError) return (
    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Could not load this order&apos;s payment-protection status.
      <button type="button" onClick={() => refetch()} className="ml-2 font-semibold underline">Retry</button>
    </div>
  );
  if (!escrow) return null;

  const statusLine = (() => {
    if (escrow.status === "released") return "✓ Released — paid out to you.";
    if (escrow.status === "refunded") return "Buyer refund initiated — bank processing times apply.";
    if (escrow.status === "refund_pending") return "Refund submission under review — no seller payout or second refund will be attempted.";
    if (escrow.status === "pending") return "Awaiting the buyer's payment.";
    if (escrow.status === "canceled") return "Unpaid checkout expired — no payout is due.";
    if (escrow.status === "disputed" || escrow.held_for_review)
      return "⚠ Under review — our team is checking this order.";
    if (escrow.payout_pending) return "Payout submitted — awaiting payment-provider confirmation.";
    const cleared = Boolean(escrow.confirmed_at || escrow.release_approved_at);
    if (escrow.held && escrow.delivery_courier && !cleared)
      return "Payment held — courier delivery and the buyer-inspection window must complete before automatic payout.";
    const dates = [cleared ? null : escrow.release_due_at, escrow.settle_at]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime()).filter(Number.isFinite);
    const earliest = dates.length ? Math.max(...dates) : null;
    if (escrow.held && earliest && earliest > Date.now())
      return `Payment held — eligible for payout in ${timeUntil(new Date(earliest).toISOString())}, subject to review and provider confirmation.`;
    if (escrow.held) return "Payment held — awaiting the next eligible payout run and provider confirmation.";
    return "Payment is being held safely.";
  })();

  // Delivery-proof uploads are allowed even while an order is under review — the
  // proof (photo/tracking) is exactly what helps our team resolve it. (These
  // actions never release funds; only the window/buyer code/admin do.)
  const showActions = escrow.held;
  const canAddEvidence = escrow.held || escrow.status === "disputed";
  const courierBooking = Boolean(escrow.delivery_courier);
  const bookingUnconfirmed = escrow.delivery_status?.startsWith("booking_");
  const canRequestBooking = !courierBooking || (
    !escrow.held_for_review && !escrow.confirmed_at &&
    (!escrow.delivery_status || escrow.delivery_status === "booking_failed")
  );

  // Service/digital orders don't ship — no dispatch/delivery workflow. Buyer
  // protection is still on: paid automatically after the window, or when the
  // buyer confirms.
  if (escrow.requires_delivery === false) {
    return (
      <div className="rounded-lg border border-brand-jade/30 bg-brand-jade/5 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-jade">
            Buyer protection
          </p>
          <span className="text-xs font-medium text-brand-textMuted">
            You get ₦{escrow.payout_naira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="mt-2 text-sm text-brand-text">{statusLine}</p>
        <div className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          🛠️ This is a service order — nothing to deliver. You&apos;ll be paid your
          full amount after protection clears and the settlement date is reached.
          Buyer confirmation clears protection; it does not make settlement instant.
        </div>
        {escrow.confirmed_at ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-jade">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Buyer confirmed the service was rendered.
          </p>
        ) : escrow.delivered_at ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-jade">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            You marked this as done — it shows as rendered on the receipt QR.
          </p>
        ) : canAddEvidence ? (
          <button
            type="button"
            onClick={() => markRendered.mutate()}
            disabled={markRendered.isPending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-jade px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-jade/90 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {markRendered.isPending ? "Saving…" : "Mark service as done"}
          </button>
        ) : null}
        {invoiceId && escrow.held ? (
          <OrderMessageThread invoiceId={invoiceId} unread={escrow.unread_messages ?? 0} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-jade/30 bg-brand-jade/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-jade">
          Buyer protection
        </p>
        <span className="text-xs font-medium text-brand-textMuted">
          You get ₦{escrow.payout_naira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <p className="mt-2 text-sm text-brand-text">{statusLine}</p>

      {escrow.delivery_status &&
        escrow.delivery_status_label &&
        escrow.delivery_status !== "delivered" && (
          <div className={`mt-2 flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-xs ${bookingUnconfirmed ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
            <span className="flex items-center gap-1 font-semibold"><Truck className="h-3.5 w-3.5 shrink-0" />{escrow.delivery_status_label}</span>
            {escrow.dispatch_tracking_url && (
              <a
                href={escrow.dispatch_tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-semibold underline"
              >
                Track live →
              </a>
            )}
      {bookingUnconfirmed && (
            <p className="mt-2 text-xs text-amber-900" role="status">
              {escrow.delivery_status === "booking_failed"
                ? "The courier did not accept this booking. You can retry below, or contact support if it fails again."
                : escrow.delivery_status === "booking_unknown"
                  ? "A booking may already exist. Contact support to check it before requesting another courier."
                  : "Wait for booking confirmation before expecting pickup or dropping off the parcel. If this does not update, contact support; do not book a second courier."}
            </p>
      )}
          </div>
        )}

      {escrow.held && !escrow.held_for_review && (
        <p className="mt-1 text-xs text-brand-textMuted">
          {courierBooking
            ? "Booking alone does not release payment. Courier delivery must be confirmed and the inspection window must end, or the buyer must confirm receipt."
            : "Payout requires the protection window and settlement date to pass, with no open review. Marking delivery adds proof; it does not release money."}
        </p>
      )}
      {escrow.held && escrow.held_for_review && (
        <p className="mt-1 text-xs text-brand-textMuted">
          While we review this order, add your dispatch/delivery proof below — a photo and
          tracking help us resolve it faster and protect your payout.
        </p>
      )}

      {/* Step 1 — Sent out (seller protection: dispatch proof before delivery).
          A courier/waybill code + a photo of the packaged item = timestamped
          proof you shipped a quality item, and the buyer is told it's on the way. */}
      {escrow.dispatched_at && !bookingUnconfirmed && !["booked", "pickup_enroute"].includes(escrow.delivery_status ?? "") ? (
        <div className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <Package className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" />
          {courierBooking ? "Courier reported the order on its way" : "You marked this sent out"}
          {escrow.dispatch_carrier ? ` via ${escrow.dispatch_carrier}` : ""}
          {escrow.dispatch_tracking ? ` — tracking ${escrow.dispatch_tracking}` : ""}
          {escrow.dispatch_eta ? ` · arriving ${formatEta(escrow.dispatch_eta)}` : ""}
          {escrow.dispatch_note ? `: “${escrow.dispatch_note}”` : ""}
          {escrow.dispatch_proof_url && (
            <>
              {" "}
              <a
                href={escrow.dispatch_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                view photo
              </a>
            </>
          )}
        </div>
      ) : showActions && canRequestBooking ? (
        <div className="mt-3">
          {sentOpen ? (
            <div className="space-y-2 rounded-md border border-sky-200 bg-sky-50/50 p-3">
              <p className="text-xs font-semibold text-sky-800">
                {courierBooking ? "Pack the order and request its courier booking." : "Sending it out? Add proof to protect yourself."}
              </p>
              {escrow.delivery_courier && (
                <div className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {escrow.delivery_service_type === "dropoff" ? (
                    <>
                      <Package className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" />
                      After booking is confirmed, drop this package off for{" "}
                      <span className="font-semibold">{escrow.delivery_courier}</span>
                      {escrow.delivery_dropoff_station
                        ? ` at: ${escrow.delivery_dropoff_station}`
                        : ""}
                      . Add the package photo and save below to request the booking first.
                    </>
                  ) : (
                    <>
                      <Bike className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" />
                      <span className="font-semibold">{escrow.delivery_courier}</span>{" "}
                      is the buyer&apos;s selected courier. The buyer paid for delivery.
                      Pack the order, add a photo and save to request pickup from your
                      store address. Wait for booking confirmation before expecting collection.
                    </>
                  )}
                </div>
              )}
              {/* For automated courier orders, Shipbubble fills in the courier,
                  tracking code and ETA when the pickup is booked — don't ask the
                  seller to type them. Self-shipped orders still show these. */}
              {!escrow.delivery_courier && (
                <>
                  <input
                    type="text"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value.slice(0, 120))}
                    placeholder="Courier / waybill tracking code (optional)"
                    className="block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                  />
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value.slice(0, 80))}
                    placeholder="Courier / company name — e.g. GIG Logistics (optional)"
                    className="block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                  />
                  <label className="block text-[11px] font-medium text-sky-800">
                    Expected delivery date (optional)
                  </label>
                  <input
                    type="date"
                    value={sentEta}
                    onChange={(e) => setSentEta(e.target.value)}
                    className="block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                  />
                </>
              )}
              <textarea
                value={sentNote}
                onChange={(e) => setSentNote(e.target.value.slice(0, 255))}
                rows={2}
                placeholder="Dispatch note (optional) — e.g. packed 2 items, sealed blue box"
                className="block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
              />
              <label htmlFor={`dispatch-photo-${invoiceId}`} className="block text-[11px] font-semibold text-sky-800">
                Photo of the packaged item <span className="text-rose-600">*</span>
              </label>
              <input
                id={`dispatch-photo-${invoiceId}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setSentFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-brand-textMuted"
              />
              <p className="text-[11px] text-brand-textMuted">
                {escrow.dispatch_proof_url
                  ? "Your saved package photo will be reused unless you choose a replacement."
                  : "A photo is required to record how the item was packaged. It does not confirm courier collection."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => markSent.mutate()}
                  disabled={markSent.isPending || (!sentFile && !escrow.dispatch_proof_url)}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {markSent.isPending ? "Saving…" : courierBooking ? "Request courier booking" : "Save & notify buyer"}
                </button>
                <button
                  type="button"
                  onClick={() => setSentOpen(false)}
                  className="rounded-md border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-textMuted hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSentOpen(true)}
              className="rounded-md border border-sky-600 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              {escrow.delivery_courier
                ? escrow.delivery_service_type === "dropoff"
                  ? "Book drop-off delivery"
                  : "Book courier pickup"
                : "Mark as sent out"}
            </button>
          )}
        </div>
      ) : null}

      {escrow.delivered_at ? (
        <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          ✓ You marked this delivered
          {escrow.delivery_proof_note ? `: “${escrow.delivery_proof_note}”` : ""}
          {escrow.delivery_proof_url && (
            <>
              {" "}
              <a
                href={escrow.delivery_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                view photo
              </a>
            </>
          )}
        </div>
      ) : canAddEvidence ? (
        <div className="mt-3">
          {open ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 255))}
                rows={2}
                placeholder="Delivery note (optional) — e.g. handed to customer at their gate"
                className="block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
              />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-brand-textMuted"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => markDelivered.mutate()}
                  disabled={markDelivered.isPending}
                  className="rounded-md bg-brand-jade px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-jadeHover disabled:opacity-60"
                >
                  {markDelivered.isPending ? "Saving…" : "Save delivery proof"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-textMuted hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md border border-brand-jade px-3 py-1.5 text-xs font-semibold text-brand-jade transition hover:bg-brand-jade/10"
            >
              Mark as delivered
            </button>
          )}
        </div>
      ) : null}
      {invoiceId && escrow.held ? (
        <OrderMessageThread invoiceId={invoiceId} unread={escrow.unread_messages ?? 0} />
      ) : null}
    </div>
  );
}
