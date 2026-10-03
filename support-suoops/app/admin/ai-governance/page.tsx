"use client";

import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, RefreshCw, Save, ShieldAlert } from "lucide-react";

import { useAdminAuth } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";

type FeatureMetric = {
  feature: string;
  label: string;
  operations: number;
  succeeded: number;
  failed: number;
  blocked: number;
  success_rate: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  average_duration_ms: number | null;
  positive_feedback: number;
  negative_feedback: number;
};

type FeatureControl = {
  feature: string;
  label: string;
  enabled: boolean;
  rollout_percent: number;
  allowlisted_owner_ids: number[];
  reason: string | null;
  updated_at: string | null;
};

type Overview = {
  period_days: number;
  master_enabled: boolean;
  provider: string;
  default_model: string;
  total_operations: number;
  total_cost_usd: number;
  disabled_tenants: number;
  features: FeatureMetric[];
  controls: FeatureControl[];
};

export default function AIGovernancePage() {
  const { authFetch, token, user } = useAdminAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [drafts, setDrafts] = useState<Record<string, FeatureControl>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch(`${API}/admin/ai-governance?days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not load AI governance");
      const data = body as Overview;
      setOverview(data);
      setDrafts(Object.fromEntries(data.controls.map((control) => [control.feature, control])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load AI governance");
    } finally {
      setLoading(false);
    }
  }, [authFetch, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveControl(control: FeatureControl) {
    setSaving(control.feature);
    try {
      const response = await authFetch(
        `${API}/admin/ai-governance/features/${encodeURIComponent(control.feature)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            enabled: control.enabled,
            rollout_percent: control.rollout_percent,
            allowlisted_owner_ids: control.allowlisted_owner_ids,
            reason: control.reason,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not update feature control");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update feature control");
    } finally {
      setSaving(null);
    }
  }

  if (loading && !overview) {
    return <p className="text-sm text-slate-500">Loading AI governance…</p>;
  }
  if (error || !overview) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error || "AI governance is unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-bold text-slate-900">AI governance</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Controlled rollout, reliability, feedback, cost, and emergency shutdown
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {!overview.master_enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            The deployment-level AI master switch is OFF. Database controls cannot override it.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Provider" value={`${overview.provider} · ${overview.default_model}`} />
        <Metric label="Operations (30d)" value={overview.total_operations.toLocaleString()} />
        <Metric label="Estimated cost (30d)" value={`$${overview.total_cost_usd.toFixed(4)}`} />
        <Metric label="Merchant opt-outs" value={overview.disabled_tenants.toLocaleString()} />
      </div>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Feature health</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Feature</th>
                <th className="px-4 py-3">Operations</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Failed / blocked</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.features.map((feature) => (
                <tr key={feature.feature}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{feature.label}</td>
                  <td className="px-4 py-3">{feature.operations}</td>
                  <td className="px-4 py-3">{feature.success_rate.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    {feature.failed} / {feature.blocked}
                  </td>
                  <td className="px-4 py-3">
                    {feature.average_duration_ms == null ? "—" : `${feature.average_duration_ms} ms`}
                  </td>
                  <td className="px-4 py-3">
                    +{feature.positive_feedback} / -{feature.negative_feedback}
                  </td>
                  <td className="px-4 py-3">${feature.estimated_cost_usd.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Rollout and kill switches</h2>
        <p className="mt-1 text-xs text-slate-500">
          Rollout assignment is deterministic per merchant. Allowlisted merchant IDs bypass the percentage,
          but never bypass a disabled feature or the deployment master switch.
        </p>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {overview.controls.map((persisted) => {
            const control = drafts[persisted.feature] ?? persisted;
            const canEdit = Boolean(user?.is_super_admin);
            return (
              <article key={control.feature} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{control.label}</h3>
                    <p className="text-[11px] text-slate-400">{control.feature}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={control.enabled}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [control.feature]: { ...control, enabled: event.target.checked },
                        }))
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Enabled
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-600">
                    Rollout percentage
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={control.rollout_percent}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [control.feature]: {
                            ...control,
                            rollout_percent: Math.max(0, Math.min(100, Number(event.target.value))),
                          },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Canary merchant IDs
                    <input
                      value={control.allowlisted_owner_ids.join(", ")}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [control.feature]: {
                            ...control,
                            allowlisted_owner_ids: event.target.value
                              .split(",")
                              .map((value) => Number(value.trim()))
                              .filter((value) => Number.isInteger(value) && value > 0),
                          },
                        }))
                      }
                      placeholder="12, 44"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-medium text-slate-600">
                  Change reason
                  <input
                    value={control.reason ?? ""}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [control.feature]: { ...control, reason: event.target.value },
                      }))
                    }
                    placeholder="Canary rollout, incident containment…"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                {canEdit && (
                  <button
                    type="button"
                    disabled={saving === control.feature}
                    onClick={() => void saveControl(control)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving === control.feature ? "Saving…" : "Save control"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}
