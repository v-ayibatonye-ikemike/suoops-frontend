"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../layout";

type Rate = { numerator: number; denominator: number; percent: number | null };
type Performance = {
  returning_active_businesses: number; invoices_created: number; payments_recorded: number;
  gmv: number; recorded_commission: number; missing_fee_records: number;
  gmv_per_active_merchant: number | null; commission_per_active_merchant: number | null;
  invoice_to_payment_conversion: Rate;
  reactivation_rate_itt: Rate; reactivation_rate_contacted: Rate; whatsapp_response_rate: Rate;
  delivered_businesses: number; unknown_or_failed_contacts: number; accepted_contacts: number;
};
type Overview = {
  outreach_configured: boolean;
  activation_7_day: Rate;
  retention: Record<string, Rate>;
  mean_hours_to_first_invoice: number | null;
  mean_hours_to_first_payment: number | null;
  last_30_days: Performance;
  definitions: Record<string, string>;
  experiment: null | {
    enabled: boolean; started_at: string | null; ends_at: string | null; complete?: boolean;
    arms: Record<string, Performance>;
    assignments: { user_id: number; arm: string; initial_state: string }[];
    reactivation_lift_percentage_points?: number | null;
  };
};
type Candidate = {
  user_id: number; business_name: string; state: string; health_score: number; days_inactive: number;
  eligible: boolean; whatsapp_opted_in: boolean; phone_verified: boolean;
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
  const [selected, setSelected] = useState<number[]>([]);
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
      <summary className="cursor-pointer font-semibold text-slate-900">Merchant retention pilot</summary>
      <div className="mt-4 space-y-4 text-sm text-slate-700">
        <p>
          A 30-day experiment: 25 control, 25 treatment. Enrollment alone never sends messages.
          Both groups are excluded from overlapping merchant campaigns; normal transaction notifications remain.
          Customer reminders still require the existing Collections review flow.
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
          {!data.experiment ? <>
            <p>Preview real business facts and select exactly 50 eligible sellers. No opt-in is inferred from phone verification.</p>
            <button type="button" disabled={pending || next === null} className="rounded border px-3 py-2 disabled:opacity-50"
              onClick={() => void perform(async () => {
                const result = await request<Candidates>(`/candidates?after_id=${next ?? 0}`);
                setCandidates((old) => [...old, ...result.businesses]);
                setNext(result.next_after_id);
              })}>{candidates.length ? "Load more businesses" : "Preview candidates"}</button>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {candidates.map((candidate) => (
                <label key={candidate.user_id} className="flex items-start gap-3 rounded-lg border p-3">
                  <input type="checkbox" aria-label={`Enroll ${candidate.business_name}`}
                    checked={selected.includes(candidate.user_id)}
                    disabled={pending || !candidate.eligible || (selected.length >= 50 && !selected.includes(candidate.user_id))}
                    onChange={(event) => {
                      setReviewed(false);
                      setSelected((old) => event.target.checked ? [...old, candidate.user_id] : old.filter((id) => id !== candidate.user_id));
                    }} className="mt-1 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    <strong>{candidate.business_name}</strong> - {candidate.state.replaceAll("_", " ")} - health {candidate.health_score}
                    <span className="block">{candidate.recommendation?.reason || "No grounded outreach action right now."}</span>
                    {!candidate.eligible && <span className="block text-xs text-slate-500">
                      {!candidate.whatsapp_opted_in ? "Explicit opt-in required. " : ""}
                      {!candidate.phone_verified ? "Phone verification required. " : ""}
                      Must be an at-risk/dormant seller with a useful action.
                    </span>}
                  </span>
                </label>
              ))}
            </div>
            <p>{selected.length}/50 selected. Assignment is random, balanced, and cannot be reshuffled.</p>
            <button type="button" disabled={pending || selected.length !== 50} className="rounded bg-emerald-700 px-3 py-2 text-white disabled:opacity-50"
              onClick={() => void perform(async () => {
                setData(await request<Overview>("/pilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_ids: selected }) }));
                setReviewed(false);
              })}>Create paused pilot</button>
          </> : <>
            <p className="font-semibold">{data.experiment.complete ? "Pilot complete" : data.experiment.enabled ? "Pilot enabled" : "Pilot paused"}.
              {data.experiment.ends_at && ` Ends ${new Date(data.experiment.ends_at).toLocaleString()}.`}
            </p>
            {!data.outreach_configured && <p className="text-amber-800">Outreach is blocked until the deployment kill switch and approved WhatsApp template are configured.</p>}
            <details><summary className="cursor-pointer">Review fixed assignments</summary>
              <ul className="mt-2 max-h-48 overflow-y-auto">{data.experiment.assignments.map((entry) =>
                <li key={entry.user_id}>Business #{entry.user_id}: {entry.arm} ({entry.initial_state})</li>)}</ul>
            </details>
            {!data.experiment.enabled && !data.experiment.complete && <label className="flex items-start gap-2">
              <input type="checkbox" checked={reviewed} disabled={pending} onChange={(event) => setReviewed(event.target.checked)} />
              I reviewed the cohort and approved template. Enable at most one merchant nudge per week; never automatically send customer reminders.
            </label>}
            <button type="button"
              disabled={pending || data.experiment.complete || (!data.experiment.enabled && (!reviewed || !data.outreach_configured))}
              className="rounded bg-emerald-700 px-3 py-2 text-white disabled:opacity-50"
              onClick={() => void perform(async () => {
                setData(await request<Overview>("/pilot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !data.experiment?.enabled }) }));
                setReviewed(false);
              })}>{data.experiment.enabled ? "Pause outreach" : "Enable pilot outreach"}</button>
            <div className="grid gap-4 sm:grid-cols-2">{Object.entries(data.experiment.arms).map(([arm, result]) => (
              <div key={arm} className="rounded-lg border p-3">
                <h3 className="font-semibold capitalize">{arm}</h3>
                <ul className="mt-2 space-y-1">
                  <li>Reactivation (all assigned): {rate(result.reactivation_rate_itt)}</li>
                  <li>Dormant contacted reactivation: {rate(result.reactivation_rate_contacted)}</li>
                  <li>Returning active businesses: {result.returning_active_businesses}</li>
                  <li>Invoices: {result.invoices_created}; payments recorded: {result.payments_recorded}</li>
                  <li>GMV: {money(result.gmv)}; commission: {money(result.recorded_commission)}</li>
                  <li>Delivered businesses: {result.delivered_businesses}; responses: {rate(result.whatsapp_response_rate)}</li>
                  <li>Accepted, awaiting delivery: {result.accepted_contacts}; unknown/failed: {result.unknown_or_failed_contacts}</li>
                  <li>Missing historical fees: {result.missing_fee_records}</li>
                </ul>
              </div>
            ))}</div>
            <p>Reactivation lift: {data.experiment.reactivation_lift_percentage_points ?? "Not yet measurable"} percentage points.
              This small pilot is an experiment, not proof of improvement.</p>
          </>}
          <details><summary className="cursor-pointer">Metric definitions</summary><ul className="mt-2 space-y-1">
            {Object.entries(data.definitions).map(([key, text]) => <li key={key}>{text}</li>)}
          </ul></details>
        </>}
      </div>
    </details>
  );
}
