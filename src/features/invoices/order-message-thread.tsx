"use client";

import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
  getOrderMessages,
  sendOrderMessage,
  type OrderMessage,
} from "@/api/order-messages";

/**
 * Seller-side order chat. Delivery coordination only — the backend masks any
 * contact/account/link the seller tries to share and blocks off-platform payment
 * pushes, and repeated attempts flag the store. Kept intentionally minimal.
 */
export function OrderMessageThread({
  invoiceId, unread = 0, readOnly = false,
}: { invoiceId: string; unread?: number; readOnly?: boolean }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: messages = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["orderMessages", invoiceId],
    queryFn: () => getOrderMessages(invoiceId),
    refetchInterval: 20000,
    retry: false,
  });

  const send = useMutation({
    mutationFn: () => sendOrderMessage(invoiceId, body.trim()),
    onSuccess: (res) => {
      if (res?.blocked) {
        toast.error(
          typeof res.message === "string"
            ? res.message
            : "Payments and contact must stay on SuoOps — that message wasn't sent.",
        );
      } else {
        setBody("");
        if (res?.warning) toast(res.warning, { icon: "⚠️" });
      }
      qc.invalidateQueries({ queryKey: ["orderMessages", invoiceId] });
    },
    onError: () => toast.error("Could not send. Please try again."),
  });

  const canSend = !readOnly && !isError && body.trim().length > 0 && !send.isPending;

  return (
    <div className="mt-3 border-t border-brand-jade/20 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
        Chat with buyer
        {unread > 0 && (
          <span className="ml-2 rounded-full bg-brand-jade px-2 py-0.5 text-[10px] font-bold text-white">
            {unread} new
          </span>
        )}
      </p>
      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-brand-textMuted">Loading…</p>
        ) : isError ? (
          <div role="alert" className="text-xs text-rose-700">
            <p>Could not load order messages.</p>
            <button type="button" onClick={() => void refetch()} className="mt-1 font-semibold underline">
              Retry messages
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-brand-textMuted">
            No messages yet. Coordinate delivery here — never share contact or bank details.
          </p>
        ) : (
          messages.map((m: OrderMessage) => (
            <div
              key={m.id}
              className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                  m.mine
                    ? "bg-brand-jade text-white"
                    : "bg-slate-100 text-brand-text"
                }`}
              >
                {m.body}
                {m.flagged && (
                  <span
                    className={`ml-1 text-[10px] ${m.mine ? "text-white/70" : "text-rose-500"}`}
                    title="Some details were hidden to keep the deal on SuoOps"
                  >
                    (hidden)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {readOnly ? (
        <p className="mt-2 text-xs text-brand-textMuted">
          Messaging is closed for this order. Your conversation is still available for reference.{" "}
          <a href="https://support.suoops.com" className="font-semibold text-brand-jade underline">
            Contact SuoOps support
          </a>
        </p>
      ) : (
      <div className="mt-2 flex items-end gap-2">
        <textarea
          aria-label="Message the buyer"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 1000))}
          rows={2}
          placeholder="Message the buyer about delivery…"
          className="block w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
        />
        <button
          type="button"
          onClick={() => send.mutate()}
          disabled={!canSend}
          className="shrink-0 rounded-md bg-brand-jade px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-jadeHover disabled:opacity-60"
        >
          {send.isPending ? "Sending…" : "Send"}
        </button>
      </div>
      )}
    </div>
  );
}
