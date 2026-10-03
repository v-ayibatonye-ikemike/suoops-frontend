"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";

import {
  dismissCollectionDraft,
  getCollectionMetrics,
  getCollectionPriorities,
  improveCollectionDraft,
  sendCollectionDraft,
  updateCollectionDraft,
  type CollectionDraft,
  type CollectionDraftUpdate,
} from "@/api/collections-assistant";

const currency = (amount: number, code = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);

function DraftCard({
  draft,
  onChanged,
}: {
  draft: CollectionDraft;
  onChanged: () => void;
}) {
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [message, setMessage] = useState(draft.message);
  const [confirming, setConfirming] = useState(false);
  const update: CollectionDraftUpdate = {
    subject: draft.channel === "email" ? subject.trim() || null : null,
    message: message.trim(),
  };

  useEffect(() => {
    setSubject(draft.subject ?? "");
    setMessage(draft.message);
  }, [draft]);

  const save = useMutation({
    mutationFn: () => updateCollectionDraft(draft.id, update),
    onSuccess: onChanged,
  });
  const improve = useMutation({
    mutationFn: async () => {
      await updateCollectionDraft(draft.id, update);
      return improveCollectionDraft(draft.id);
    },
    onSuccess: (result) => {
      setSubject(result.subject ?? "");
      setMessage(result.message);
      onChanged();
    },
  });
  const send = useMutation({
    mutationFn: () => sendCollectionDraft(draft.id, update),
    onSuccess: () => {
      setConfirming(false);
      onChanged();
    },
  });
  const dismiss = useMutation({
    mutationFn: () => dismissCollectionDraft(draft.id),
    onSuccess: onChanged,
  });
  const pending = save.isPending || improve.isPending || send.isPending || dismiss.isPending;
  const error = save.error || improve.error || send.error || dismiss.error;

  return (
    <article className="rounded-xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-brand-dark">{draft.customer_name}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                draft.priority_level === "critical" || draft.priority_level === "high"
                  ? "bg-red-100 text-red-700"
                  : draft.priority_level === "medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {draft.priority_level} priority · {draft.priority_score}/100
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-muted">
            Invoice {draft.invoice_id} · {draft.days_overdue} days overdue
          </p>
        </div>
        <p className="text-lg font-bold text-brand-dark">
          {currency(draft.amount, draft.currency)}
        </p>
      </div>

      <p className="mt-3 rounded-lg bg-brand-background px-3 py-2 text-xs leading-relaxed text-brand-muted">
        {draft.explanation}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-brand-muted">
        {draft.channel === "whatsapp" ? (
          <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden />
        ) : draft.channel === "email" ? (
          <Mail className="h-4 w-4 text-brand-jade" aria-hidden />
        ) : (
          <X className="h-4 w-4 text-amber-600" aria-hidden />
        )}
        <span className="capitalize">{draft.channel}</span>
        {draft.recipient_masked && <span>· {draft.recipient_masked}</span>}
      </div>

      {draft.channel === "email" && (
        <label className="mt-4 block text-xs font-medium text-brand-dark">
          Subject
          <input
            value={subject}
            maxLength={200}
            onChange={(event) => {
              setSubject(event.target.value);
              setConfirming(false);
            }}
            className="mt-1 w-full rounded-lg border border-brand-border px-3 py-2 text-sm font-normal outline-none focus:border-brand-jade focus:ring-2 focus:ring-brand-jade/20"
          />
        </label>
      )}
      <label className="mt-3 block text-xs font-medium text-brand-dark">
        Reminder message
        <textarea
          value={message}
          maxLength={2000}
          rows={7}
          onChange={(event) => {
            setMessage(event.target.value);
            setConfirming(false);
          }}
          className="mt-1 w-full resize-y rounded-lg border border-brand-border px-3 py-2 text-sm font-normal leading-relaxed outline-none focus:border-brand-jade focus:ring-2 focus:ring-brand-jade/20"
        />
      </label>

      {draft.ai_generated && (
        <p className="mt-2 text-[11px] text-brand-muted">
          AI adjusted the tone. Invoice facts remain verified from SuoOps.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          The reminder could not be updated. Please try again.
        </p>
      )}

      {confirming ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs leading-relaxed text-amber-900">
            Send this exact reminder to {draft.recipient_masked}? SuoOps will not send it
            automatically.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending || !message.trim()}
              onClick={() => send.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-jade px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {send.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              )}
              Confirm and send
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3 py-2 text-xs font-medium text-brand-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !message.trim()}
            onClick={() => save.mutate()}
            className="rounded-lg border border-brand-border px-3 py-2 text-xs font-semibold text-brand-dark disabled:opacity-50"
          >
            Save edits
          </button>
          <button
            type="button"
            disabled={pending || !message.trim()}
            onClick={() => improve.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-jade px-3 py-2 text-xs font-semibold text-brand-jade disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Improve with AI
          </button>
          {draft.can_send ? (
            <button
              type="button"
              disabled={pending || !message.trim()}
              onClick={() => setConfirming(true)}
              className="rounded-lg bg-brand-evergreen px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Send reminder
            </button>
          ) : (
            <span className="self-center text-xs text-amber-700">
              Add a permitted customer contact channel before sending.
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => dismiss.mutate()}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-brand-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden />
            Dismiss
          </button>
        </div>
      )}
    </article>
  );
}

export function CollectionsAssistant() {
  const queryClient = useQueryClient();
  const priorities = useQuery({
    queryKey: ["collection-priorities"],
    queryFn: getCollectionPriorities,
  });
  const metrics = useQuery({
    queryKey: ["collection-metrics"],
    queryFn: getCollectionMetrics,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["collection-priorities"] });
    void queryClient.invalidateQueries({ queryKey: ["collection-metrics"] });
  };

  if (priorities.isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-white" aria-label="Loading collections" />;
  }
  if (priorities.error || !priorities.data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        Collections could not be loaded. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-border bg-white p-4">
          <p className="text-xs text-brand-muted">Ready to review</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">{priorities.data.eligible_count}</p>
          <p className="mt-1 text-xs text-brand-muted">
            {currency(priorities.data.total_overdue_amount)} overdue
          </p>
        </div>
        <div className="rounded-xl border border-brand-border bg-white p-4">
          <p className="text-xs text-brand-muted">Recovered after reminders</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">
            {currency(metrics.data?.recovered_amount ?? 0)}
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            {metrics.data?.recovered_invoices ?? 0} paid invoices
          </p>
        </div>
        <div className="rounded-xl border border-brand-border bg-white p-4">
          <p className="text-xs text-brand-muted">Recovery rate</p>
          <p className="mt-1 text-2xl font-bold text-brand-dark">
            {(metrics.data?.recovery_rate ?? 0).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            From {metrics.data?.sent_reminders ?? 0} sent reminders
          </p>
        </div>
      </div>

      {priorities.data.drafts.length ? (
        <div className="space-y-4">
          {priorities.data.drafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onChanged={refresh} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden />
          <h2 className="mt-3 font-semibold text-emerald-900">No reminders need review</h2>
          <p className="mt-1 text-sm text-emerald-700">
            Recently contacted and paid invoices are automatically left out.
          </p>
        </div>
      )}
    </div>
  );
}
