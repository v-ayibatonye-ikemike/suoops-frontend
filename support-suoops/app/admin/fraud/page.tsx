"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Users,
  Fingerprint,
  Globe,
  ChevronDown,
  ChevronUp,
  FileSearch,
} from "lucide-react";
import { useAdminAuth } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";

// ─── Types ───────────────────────────────────────────────────────

interface RiskUser {
  id: number;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  signup_source: string | null;
  signup_ip: string | null;
  signup_device_id: string | null;
  signup_user_agent: string | null;
  risk_score: number;
  risk_signals: string[];
  flagged_for_review: boolean;
  store_status: string;
  storefront_slug: string | null;
  linked_account_count: number;
}

interface RiskListResponse {
  users: RiskUser[];
  total: number;
  page: number;
  page_size: number;
  counts: Record<string, number>;
}

interface LinkedAccount {
  id: number;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  risk_score: number;
  flagged_for_review: boolean;
  store_status: string;
  same_ip: boolean;
  same_device: boolean;
}

interface Dossier {
  identity: {
    id: number;
    name: string;
    business_name: string | null;
    phone: string | null;
    email: string | null;
    created_at: string | null;
    last_login: string | null;
    phone_verified: boolean;
    role: string;
    store_status: string;
    store_status_reason: string | null;
    storefront_slug: string | null;
    has_logo: boolean;
  };
  signup_forensics: {
    signup_source: string | null;
    signup_ip: string | null;
    signup_device_id: string | null;
    signup_user_agent: string | null;
    risk_score: number;
    risk_signals: string[];
    flagged_for_review: boolean;
    circumvention_attempts: number;
  };
  financials: {
    wallet_balance_naira: number;
    has_bank_details: boolean;
    bank_name: string | null;
    account_number_masked: string | null;
    account_name: string | null;
    held_escrow_naira: number;
  };
  activity: {
    total_invoices: number;
    paid_invoices: number;
    storefront_orders: number;
    paid_revenue_naira: number;
    unique_customers: number;
    escrow_by_status: Record<string, { count: number; gross_naira: number }>;
  };
  buyer_reputation: { disputes: number; false_disputes: number; flagged: boolean } | null;
  recent_orders: {
    escrow_id: number;
    invoice_public_id: string | null;
    status: string;
    held_for_review: boolean;
    review_reason: string | null;
    gross_naira: number;
    buyer_name: string | null;
    buyer_phone: string | null;
    created_at: string | null;
    disputed_at: string | null;
    dispatch_proof_url: string | null;
    delivery_proof_url: string | null;
  }[];
  circumvention_evidence: {
    id: number;
    escrow_id: number;
    sender_role: string;
    body_raw: string;
    flag_reasons: string | null;
    blocked: boolean;
    created_at: string | null;
  }[];
  linked_accounts: LinkedAccount[];
}

type ViewMode = "flagged" | "risky" | "all";

// ─── Helpers ─────────────────────────────────────────────────────

const SIGNAL_LABELS: Record<string, string> = {
  disposable_email: "Disposable email",
  ip_velocity: "IP velocity",
  ip_velocity_high: "IP velocity (high)",
  device_reuse: "Device reuse",
  device_reuse_high: "Device reuse (high)",
  no_device_id: "No device ID",
  no_user_agent: "No user-agent",
  bot_user_agent: "Bot user-agent",
};

function riskColor(score: number): string {
  if (score >= 60) return "text-red-700 bg-red-100";
  if (score >= 40) return "text-orange-700 bg-orange-100";
  if (score >= 20) return "text-amber-700 bg-amber-100";
  return "text-slate-600 bg-slate-100";
}

function signalBadge(sig: string) {
  const critical = sig.includes("high") || sig === "disposable_email";
  return (
    <span key={sig} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
      {SIGNAL_LABELS[sig] || sig}
    </span>
  );
}

function money(n: number): string {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function orderBadge(s: string): string {
  switch (s) {
    case "held": return "bg-blue-100 text-blue-700";
    case "disputed": return "bg-amber-100 text-amber-700";
    case "refunded": return "bg-rose-100 text-rose-700";
    case "released": return "bg-emerald-100 text-emerald-700";
    case "pending": return "bg-slate-100 text-slate-500";
    default: return "bg-slate-100 text-slate-600";
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-xs text-slate-800 wrap-break-word">{value ?? "—"}</dd>
    </div>
  );
}

function DossierPanel({ d }: { d: Dossier }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Identity */}
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Identity</h4>
          <dl className="space-y-1.5">
            <Field label="Business" value={d.identity.business_name || d.identity.name} />
            <Field label="Contact person" value={d.identity.name} />
            <Field label="Phone" value={<span>{d.identity.phone || "—"}{d.identity.phone_verified && <span className="ml-1 rounded-sm bg-emerald-100 px-1 text-[9px] text-emerald-700">verified</span>}</span>} />
            <Field label="Email" value={d.identity.email} />
            <Field label="Store" value={<span className="inline-flex items-center gap-1"><span className={`rounded-full px-1.5 py-0.5 text-[10px] ${d.identity.store_status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{d.identity.store_status}</span>{d.identity.storefront_slug ? `/${d.identity.storefront_slug}` : ""}</span>} />
            {d.identity.store_status_reason && <Field label="Store status reason" value={d.identity.store_status_reason} />}
            <Field label="Joined" value={fmtDate(d.identity.created_at)} />
            <Field label="Last login" value={fmtDate(d.identity.last_login)} />
          </dl>
        </section>
        {/* Signup forensics */}
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signup forensics</h4>
          <dl className="space-y-1.5">
            <Field label="Risk score" value={<span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${riskColor(d.signup_forensics.risk_score)}`}>{d.signup_forensics.risk_score}</span>} />
            <Field label="Signals" value={<div className="flex flex-wrap gap-1">{d.signup_forensics.risk_signals.length ? d.signup_forensics.risk_signals.map(signalBadge) : "none"}</div>} />
            <Field label="Source" value={d.signup_forensics.signup_source} />
            <Field label="Signup IP" value={d.signup_forensics.signup_ip} />
            <Field label="Device ID" value={d.signup_forensics.signup_device_id} />
            <Field label="User agent" value={<span className="block max-w-full truncate" title={d.signup_forensics.signup_user_agent || ""}>{d.signup_forensics.signup_user_agent || "—"}</span>} />
            <Field label="Off-platform attempts" value={<span className={d.signup_forensics.circumvention_attempts > 0 ? "font-semibold text-red-600" : ""}>{d.signup_forensics.circumvention_attempts}</span>} />
          </dl>
        </section>
        {/* Financials */}
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Financials</h4>
          <dl className="space-y-1.5">
            <Field label="Wallet balance" value={money(d.financials.wallet_balance_naira)} />
            <Field label="Held in escrow" value={money(d.financials.held_escrow_naira)} />
            <Field label="Bank" value={d.financials.has_bank_details ? (d.financials.bank_name || "—") : "Not set"} />
            <Field label="Account no." value={d.financials.account_number_masked} />
            <Field label="Account name" value={d.financials.account_name} />
          </dl>
        </section>
        {/* Activity */}
        <section className="rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Activity</h4>
          <dl className="space-y-1.5">
            <Field label="Paid revenue" value={money(d.activity.paid_revenue_naira)} />
            <Field label="Invoices" value={`${d.activity.paid_invoices} paid / ${d.activity.total_invoices} total`} />
            <Field label="Storefront orders" value={d.activity.storefront_orders} />
            <Field label="Unique customers" value={d.activity.unique_customers} />
            {d.buyer_reputation && (
              <Field label="As a buyer" value={<span>{d.buyer_reputation.disputes} disputes · {d.buyer_reputation.false_disputes} false{d.buyer_reputation.flagged && <span className="ml-1 rounded-sm bg-red-100 px-1 text-[9px] text-red-700">flagged buyer</span>}</span>} />
            )}
            <Field label="Escrow" value={<div className="flex flex-wrap gap-1">{Object.entries(d.activity.escrow_by_status).map(([s, v]) => <span key={s} className={`rounded-full px-1.5 py-0.5 text-[10px] ${orderBadge(s)}`}>{s} {v.count}</span>)}{Object.keys(d.activity.escrow_by_status).length === 0 && "—"}</div>} />
          </dl>
        </section>
      </div>

      {/* Recent orders */}
      {d.recent_orders.length > 0 && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent storefront orders</h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-400">
                <tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Buyer</th><th className="px-3 py-2">Photos</th><th className="px-3 py-2">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.recent_orders.map((o) => (
                  <tr key={o.escrow_id}>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{o.invoice_public_id || o.escrow_id}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-1.5 py-0.5 text-[10px] ${orderBadge(o.status)}`}>{o.status}</span>{o.held_for_review && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700" title={o.review_reason || ""}>review</span>}</td>
                    <td className="px-3 py-2">{money(o.gross_naira)}</td>
                    <td className="px-3 py-2">{o.buyer_name || "—"}<span className="block text-[10px] text-slate-400">{o.buyer_phone || ""}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {o.dispatch_proof_url && (
                          <a href={o.dispatch_proof_url} target="_blank" rel="noopener noreferrer" title="Packaged item (sent-out proof)">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={o.dispatch_proof_url} alt="sent-out proof" className="h-9 w-9 rounded-sm object-cover ring-1 ring-slate-200 hover:ring-sky-400" />
                          </a>
                        )}
                        {o.delivery_proof_url && (
                          <a href={o.delivery_proof_url} target="_blank" rel="noopener noreferrer" title="Delivery proof">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={o.delivery_proof_url} alt="delivery proof" className="h-9 w-9 rounded-sm object-cover ring-1 ring-emerald-200 hover:ring-emerald-400" />
                          </a>
                        )}
                        {!o.dispatch_proof_url && !o.delivery_proof_url && <span className="text-[10px] text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Circumvention evidence */}
      {d.circumvention_evidence.length > 0 && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-red-500">Off-platform / circumvention evidence</h4>
          <div className="space-y-1.5">
            {d.circumvention_evidence.map((m) => (
              <div key={m.id} className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-medium text-slate-600">{m.sender_role}</span>
                  {m.blocked && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-700">blocked</span>}
                  {m.flag_reasons && <span className="text-red-500">{m.flag_reasons}</span>}
                  <span>{fmtDate(m.created_at)}</span>
                </div>
                <p className="mt-0.5 text-slate-700">{m.body_raw}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Linked accounts */}
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Duplicate-account cluster (same IP / device)</h4>
        {d.linked_accounts.length === 0 ? (
          <p className="text-xs text-slate-400">No linked accounts.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {d.linked_accounts.map((la) => (
              <div key={la.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                <div className="font-medium text-slate-800">{la.business_name || la.name}</div>
                <div className="text-slate-400">{la.phone || la.email || "—"}</div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${riskColor(la.risk_score)}`}>{la.risk_score}</span>
                  {la.same_ip && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">same IP</span>}
                  {la.same_device && <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">same device</span>}
                  {la.flagged_for_review && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">flagged</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function FraudPage() {
  const { token, authFetch } = useAdminAuth();
  const [data, setData] = useState<RiskListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("flagged");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 25;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [dossier, setDossier] = useState<Record<number, Dossier>>({});

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        view,
      });
      if (search) params.set("search", search);
      const res = await authFetch(`${API}/admin/fraud/flagged?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load risk data");
      setData(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setIsLoading(false);
    }
  }, [token, authFetch, page, view, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleDossier(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!dossier[id]) {
      try {
        const res = await authFetch(`${API}/admin/fraud/${id}/dossier`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const body = await res.json();
          setDossier((prev) => ({ ...prev, [id]: body }));
        }
      } catch {
        /* ignore */
      }
    }
  }

  async function review(id: number, action: "clear" | "flag" | "ban") {
    let reason: string | null = null;
    if (action === "ban") {
      reason = window.prompt("Reason for banning this account (delists their store):", "");
      if (reason === null) return;
    } else if (action === "clear" && !window.confirm("Mark this account as legitimate?")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await authFetch(`${API}/admin/fraud/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) throw new Error("Action failed");
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const counts = data?.counts || {};

  if (error && !data) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trust &amp; Safety</h1>
        <p className="text-slate-500">Review flagged signups, risk signals &amp; duplicate-account clusters</p>
      </div>

      {/* Summary + view toggle */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <button onClick={() => { setView("flagged"); setPage(1); }} className={`rounded-lg border p-4 text-left transition-colors ${view === "flagged" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <div className="flex items-center gap-2 text-sm text-red-600"><ShieldAlert className="h-4 w-4" />Flagged for review</div>
          <p className="mt-1 text-xl font-bold text-red-700">{counts.flagged ?? 0}</p>
        </button>
        <button onClick={() => { setView("risky"); setPage(1); }} className={`rounded-lg border p-4 text-left transition-colors ${view === "risky" ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <div className="flex items-center gap-2 text-sm text-orange-600"><AlertCircle className="h-4 w-4" />High risk score</div>
          <p className="mt-1 text-xl font-bold text-orange-700">{counts.high_risk ?? 0}</p>
        </button>
        <button onClick={() => { setView("all"); setPage(1); }} className={`rounded-lg border p-4 text-left transition-colors ${view === "all" ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
          <div className="flex items-center gap-2 text-sm text-slate-600"><Users className="h-4 w-4" />Search all accounts</div>
          <p className="mt-1 text-xl font-bold text-slate-700">{view === "all" ? data?.total ?? 0 : "—"}</p>
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, phone, email, IP or device…"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-400 focus:outline-hidden"
        />
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Signals</th>
              <th className="px-4 py-3">Signup origin</th>
              <th className="px-4 py-3">Linked</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && data?.users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nothing to review.</td></tr>}
            {!isLoading && data?.users.map((u) => (
              <Fragment key={u.id}>
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.business_name || u.name}</div>
                    <div className="text-xs text-slate-400">{u.phone || u.email || "—"}</div>
                    {u.store_status !== "active" && <span className="mt-0.5 inline-flex rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">{u.store_status}</span>}
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${riskColor(u.risk_score)}`}>{u.risk_score}</span></td>
                  <td className="px-4 py-3"><div className="flex max-w-[180px] flex-wrap gap-1">{u.risk_signals.length ? u.risk_signals.map(signalBadge) : <span className="text-[10px] text-slate-400">none</span>}</div></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500"><Globe className="h-3 w-3 text-slate-400" />{u.signup_ip || "—"}</div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400"><Fingerprint className="h-3 w-3" />{u.signup_device_id ? `${u.signup_device_id.slice(0, 10)}…` : "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.linked_account_count > 0 ? (
                      <button onClick={() => toggleDossier(u.id)} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 hover:bg-purple-200">
                        <Users className="h-3 w-3" />{u.linked_account_count}
                        {expandedId === u.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    ) : <span className="text-[10px] text-slate-400">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleDossier(u.id)} title="Full account review" className={`rounded-md p-1.5 hover:bg-slate-100 ${expandedId === u.id ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}><FileSearch className="h-4 w-4" /></button>
                      {u.flagged_for_review ? (
                        <button disabled={busyId === u.id} onClick={() => review(u.id, "clear")} title="Mark legitimate" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><ShieldCheck className="h-4 w-4" /></button>
                      ) : (
                        <button disabled={busyId === u.id} onClick={() => review(u.id, "flag")} title="Flag for review" className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50"><ShieldAlert className="h-4 w-4" /></button>
                      )}
                      <button disabled={busyId === u.id} onClick={() => review(u.id, "ban")} title="Ban & delist store" className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Ban className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
                {expandedId === u.id && (
                  <tr key={`${u.id}-dossier`} className="bg-slate-50">
                    <td colSpan={6} className="px-4 py-4">
                      {!dossier[u.id] ? (
                        <p className="text-xs text-slate-400">Loading full account review…</p>
                      ) : (
                        <DossierPanel d={dossier[u.id]} />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {data?.page} of {totalPages} · {data?.total} accounts</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
