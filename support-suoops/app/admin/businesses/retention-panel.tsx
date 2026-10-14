"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../layout";

type Rate = { numerator: number; denominator: number; percent: number | null };
type Performance = {
  gmv_per_active_merchant: number | null; commission_per_active_merchant: number | null;
  invoice_to_payment_conversion: Rate;
};
type Overview = {
  outreach_configured: boolean;
  activation_7_day: Rate;
  retention: Record<string, Rate>;
  mean_hours_to_first_invoice: number | null;
  mean_hours_to_first_payment: number | null;
  last_30_days: Performance;
  definitions: Record<string, string>;
  outreach?: {
    enabled: boolean;
    channels: { email: boolean; whatsapp: boolean };
    accepted_last_30_days: { email: number; whatsapp: number };
    unknown_or_failed: number;
    active_after_contact: Rate;
  };
};
type Candidate = {
  user_id: number; business_name: string; state: string; health_score: number; days_inactive: number;
  eligible: boolean; whatsapp_opted_in: boolean; phone_verified: boolean;
  channel: "email" | "whatsapp" | null;
  recommendation: null | { title: string; reason: string; action_url: string };
};
type Candidates = { businesses: Candidate[]; next_after_id: number | null };
const rate = (value: Rate) => value.percent === null ? "Not yet measurable" : `${value.percent}% (${value.numerator}/${value.denominator})`;
const money = (value: number | null) => value === null ? "Not yet measurable" : `NGN ${value.toLocaleString()}`;

export function RetentionPanel() {
  const { user, authFetch } = useAdminAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com"}/admin/retention${path}`, options);
    const body = await response.json();
    if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`);
    return body;
  }, [authFetch]);

  useEffect(() => {
    if (!user?.is_super_admin) return;
    const controller = new AbortController();
    request<Overview>("", { signal: controller.signal }).then(setData).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [request, user?.is_super_admin]);

  const perform = async (operation: () => Promise<void>) => {
    setPending(true);
    setError("");
    try { await operation(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Retention request failed."); }
    finally { setPending(false); }
  };
  if (!user?.is_super_admin) return null;
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold text-slate-900">Merchant retention outreach</summary>
      <div className="mt-4 space-y-4 text-sm text-slate-700">
        <p>
          Ongoing, relevant messages for existing businesses, with no cohort or enrollment limit.
          Email carries personalized recommendations; existing WhatsApp unpaid-alert messages are used
          where appropriate and opted in. At most one nudge per week across channels.
          Customer reminders still require review; login codes and transaction messages are unchanged.
        </p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        <button type="button" disabled={pending} className="rounded border px-3 py-2 disabled:opacity-50"
          onClick={() => void perform(async () => setData(await request<Overview>("")))}>Refresh retention metrics</button>
        {!data ? <p>Metrics have not loaded yet.</p> : <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt>7-day activation</dt><dd className="font-semibold">{rate(data.activation_7_day)}</dd></div>
            {Object.entries(data.retention).map(([days, value]) => <div key={days}><dt>{days}-day retention</dt><dd className="font-semibold">{rate(value)}</dd></div>)}
            <div><dt>Mean hours to first invoice</dt><dd>{data.mean_hours_to_first_invoice ?? "Not yet measurable"}</dd></div>
            <div><dt>Mean hours to first payment</dt><dd>{data.mean_hours_to_first_payment ?? "Not yet measurable"}</dd></div>
            <div><dt>30-day GMV / active merchant</dt><dd>{money(data.last_30_days.gmv_per_active_merchant)}</dd></div>
            <div><dt>30-day commission / active merchant</dt><dd>{money(data.last_30_days.commission_per_active_merchant)}</dd></div>
            <div><dt>Invoice-to-payment conversion</dt><dd>{rate(data.last_30_days.invoice_to_payment_conversion)}</dd></div>
          </dl>
          {!data.outreach ? <p role="alert">Outreach controls are unavailable until the backend update is deployed.</p> : <>
            <p className="font-semibold">{data.outreach.enabled ? "Ongoing outreach enabled" : "Outreach paused"}</p>
            <p>Email: {data.outreach.channels.email ? "configured" : "not configured"}.
              WhatsApp unpaid alerts: {data.outreach.channels.whatsapp ? "configured; opt-in required" : "not configured"}.</p>
            {!data.outreach_configured && <p className="text-amber-800">The deployment switch and an existing sender must be configured before enabling.</p>}
            {!data.outreach.enabled && <label className="flex items-start gap-2">
              <input type="checkbox" checked={reviewed} disabled={pending} onChange={(event) => setReviewed(event.target.checked)} />
              Enable ongoing outreach to eligible existing accounts, respecting preferences and the weekly limit.
            </label>}
            <button type="button"
              disabled={pending || (!data.outreach.enabled && (!reviewed || !data.outreach_configured))}
              className="rounded bg-emerald-700 px-3 py-2 text-white disabled:opacity-50"
              onClick={() => void perform(async () => {
                setData(await request<Overview>("/outreach", {
                  method: "PATCH", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enabled: !data.outreach?.enabled }),
                }));
                setReviewed(false);
              })}>{data.outreach.enabled ? "Pause outreach" : "Enable ongoing outreach"}</button>
            <p>Accepted in the last 30 days: {data.outreach.accepted_last_30_days.email} email,
              {" "}{data.outreach.accepted_last_30_days.whatsapp} WhatsApp. Provider acceptance is not proof of delivery.</p>
            <p>Unknown, failed or reserved contacts: {data.outreach.unknown_or_failed}.</p>
            <p>Dormant businesses active after contact: {rate(data.outreach.active_after_contact)}.
              This is observed activity, not proof the message caused it.</p>
          </>}
          <div>
            <p>Preview the channel and recommendation for each business. Previewing does not send anything.</p>
            <button type="button" disabled={pending || next === null} className="rounded border px-3 py-2 disabled:opacity-50"
              onClick={() => void perform(async () => {
                const result = await request<Candidates>(`/candidates?after_id=${next ?? 0}`);
                setCandidates((old) => [...old, ...result.businesses]);
                setNext(result.next_after_id);
              })}>{candidates.length ? "Load more businesses" : "Preview candidates"}</button>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {candidates.map((candidate) => (
                <div key={candidate.user_id} className="rounded-lg border p-3">
                  <span className="min-w-0 break-words">
                    <strong>{candidate.business_name}</strong> - {candidate.state.replaceAll("_", " ")} - health {candidate.health_score}
                    <span className="block">{candidate.eligible ? `Channel: ${candidate.channel}` : "No eligible recommendation/channel right now."}</span>
                    <span className="block">{candidate.recommendation?.reason || "No grounded outreach action right now."}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <details><summary className="cursor-pointer">Metric definitions</summary><ul className="mt-2 space-y-1">
            {Object.entries(data.definitions).filter(([key]) => key !== "experiment").map(([key, text]) => <li key={key}>{text}</li>)}
          </ul></details>
        </>}
      </div>
    </details>
  );
}
