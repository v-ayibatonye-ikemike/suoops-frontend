"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  AlertTriangle,
  Clock,
  Zap,
  UserX,
  Target,
  Shield,
  Heart,
} from "lucide-react";
import { useAdminAuth } from "../layout";

// ─── Types ───────────────────────────────────────────────────────

interface BusinessItem {
  id: number;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  plan: string;
  created_at: string;
  last_login: string | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  subscription_status: string;
  days_until_expiry: number | null;
  invoice_balance: number;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  invoices_total: number;
  invoices_paid: number;
  invoices_pending: number;
  collection_rate: number;
  customers_count: number;
  invoices_this_month: number;
  last_invoice_date: string | null;
  days_since_last_invoice: number | null;
  avg_invoice_value: number;
  health_score: number;
  risk_flags: string[];
  has_outlier_invoice: boolean;
}

interface BusinessSummary {
  total: number;
  healthy: number;
  at_risk: number;
  inactive: number;
  never_invoiced: number;
  upgrade_candidates: number;
  excluded_count: number;
}

interface BusinessListResponse {
  businesses: BusinessItem[];
  total: number;
  page: number;
  page_size: number;
  summary: BusinessSummary;
}

interface InvoiceRow {
  id: number;
  invoice_id: string;
  amount: number;
  status: string;
  invoice_type: string;
  channel: string | null;
  customer_name: string | null;
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string;
}

type SortKey = "health_score" | "total_revenue" | "invoices_total" | "created_at" | "last_login" | "name" | "collection_rate";
type RiskFilter = "" | "at_risk" | "healthy" | "inactive" | "churned";

// ─── Helpers ─────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}k`;
  return `₦${amount.toLocaleString()}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Health bands — single source of truth, aligned with the backend summary/filter
// cutoffs (Healthy >= 60, At Risk < 40). Fair (40-59) is the middle band; the
// At-Risk card/filter groups both "At Risk" (20-39) and "Critical" (<20).
function healthColor(score: number): string {
  if (score >= 60) return "text-emerald-700 bg-emerald-100";
  if (score >= 40) return "text-blue-700 bg-blue-100";
  if (score >= 20) return "text-amber-700 bg-amber-100";
  return "text-red-700 bg-red-100";
}

function healthLabel(score: number): string {
  if (score >= 60) return "Healthy";
  if (score >= 40) return "Fair";
  if (score >= 20) return "At Risk";
  return "Critical";
}

function invoiceStatusBadge(status: string) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] || "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

// How a paid invoice was collected. 'manual' (self-marked) is highlighted amber
// because a large self-marked invoice may not reflect money that actually moved.
function paymentMethodBadge(method: string) {
  if (!method) return <span className="text-slate-300">—</span>;
  const styles: Record<string, string> = {
    online: "bg-emerald-100 text-emerald-700",
    storefront: "bg-blue-100 text-blue-700",
    manual: "bg-amber-100 text-amber-700",
  };
  const labels: Record<string, string> = {
    online: "Online",
    storefront: "Storefront",
    manual: "Manual",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[method] || "bg-slate-100 text-slate-500"}`}
      title={method === "manual" ? "Self-marked as paid — verify money actually moved" : "Collected via a payment rail"}
    >
      {labels[method] || method}
    </span>
  );
}

function riskFlagBadge(flag: string) {
  const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    never_invoiced: { label: "Never Invoiced", color: "bg-slate-100 text-slate-600", icon: FileText },
    inactive_30d: { label: "Inactive 30d", color: "bg-amber-100 text-amber-700", icon: Clock },
    inactive_60d: { label: "Inactive 60d", color: "bg-red-100 text-red-700", icon: UserX },
    low_collection: { label: "Low Collection", color: "bg-orange-100 text-orange-700", icon: Target },
    power_user: { label: "Power User", color: "bg-emerald-100 text-emerald-700", icon: Zap },
    duplicate_invoices: { label: "Duplicate invoices", color: "bg-red-100 text-red-700", icon: AlertCircle },
  };
  const info = map[flag] || { label: flag, color: "bg-slate-100 text-slate-500", icon: AlertCircle };
  const Icon = info.icon;
  return (
    <span key={flag} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
      <Icon className="h-2.5 w-2.5" />
      {info.label}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function BusinessesPage() {
  const { token, user, authFetch } = useAdminAuth();
  const [data, setData] = useState<BusinessListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & pagination
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("health_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 25;

  // Expanded row
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Lazy-loaded per-business invoice drill-down
  const [invoicesById, setInvoicesById] = useState<Record<number, InvoiceRow[]>>({});
  const [invLoadingId, setInvLoadingId] = useState<number | null>(null);

  const toggleExpand = useCallback(async (bizId: number) => {
    const opening = expandedId !== bizId;
    setExpandedId(opening ? bizId : null);
    if (!opening || invoicesById[bizId] || !token) return;
    setInvLoadingId(bizId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/businesses/${bizId}/invoices?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        setInvoicesById((prev) => ({ ...prev, [bizId]: body.invoices ?? [] }));
      } else {
        setInvoicesById((prev) => ({ ...prev, [bizId]: [] }));
      }
    } catch {
      setInvoicesById((prev) => ({ ...prev, [bizId]: [] }));
    } finally {
      setInvLoadingId(null);
    }
  }, [expandedId, invoicesById, token]);

  // Super-admin: confirm an invoice the low-trust guard held for review. Only
  // after verifying the payment landed — this counts toward GMV.
  async function forceConfirm(bizId: number, invoiceId: string) {
    if (
      !window.confirm(
        `Mark ${invoiceId} as PAID? This bypasses the low-trust hold and WILL count toward GMV. Only do this after you've verified the payment actually landed.`,
      )
    )
      return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
    try {
      const res = await authFetch(`${apiUrl}/admin/invoices/${invoiceId}/force-confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Force-confirm failed");
      // Refresh this business's invoices so the new status shows.
      const inv = await authFetch(`${apiUrl}/admin/businesses/${bizId}/invoices?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (inv.ok) {
        const b = await inv.json();
        setInvoicesById((prev) => ({ ...prev, [bizId]: b.invoices ?? [] }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Force-confirm failed");
    }
  }

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (riskFilter) params.set("risk_filter", riskFilter);
      if (search) params.set("search", search);

      const res = await fetch(`${apiUrl}/admin/businesses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch business data");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setIsLoading(false);
    }
  }, [token, page, sortBy, sortOrder, riskFilter, search, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder(key === "name" || key === "created_at" ? "asc" : "desc");
    }
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  // Summary stats across ALL matching businesses (from the backend aggregate,
  // not just the current page — the page is sorted worst-first, so page-derived
  // counts would wrongly show e.g. "Healthy 0").
  const summaryAtRisk = data?.summary.at_risk || 0;
  const summaryHealthy = data?.summary.healthy || 0;
  const summaryInactive = data?.summary.inactive || 0;
  const summaryNeverInvoiced = data?.summary.never_invoiced || 0;

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
        <h1 className="text-2xl font-bold text-slate-900">Business Intelligence</h1>
        <p className="text-slate-500">Health & activity for every business on SuoOps</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Revenue = <strong>Invoiced</strong> (billed), lifetime — differs from Metrics/Dashboard{" "}
          <strong>GMV</strong> (paid, in the selected period). Single invoices above ₦50M are
          capped out and flagged ⚠.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => { setRiskFilter(""); setPage(1); }}
          className={`rounded-lg border p-4 text-left transition-colors ${!riskFilter ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="h-4 w-4" />
            All Businesses
          </div>
          <p className="mt-1 text-xl font-bold text-slate-900">{data?.summary.total ?? 0}</p>
          {(data?.summary.excluded_count ?? 0) > 0 && (
            <p className="mt-0.5 text-[10px] text-slate-400" title="Internal/test accounts (METRICS_EXCLUDED_EMAILS) hidden from analytics">
              +{data?.summary.excluded_count} internal excluded
            </p>
          )}
        </button>
        <button
          onClick={() => { setRiskFilter("healthy"); setPage(1); }}
          className={`rounded-lg border p-4 text-left transition-colors ${riskFilter === "healthy" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <Heart className="h-4 w-4" />
            Healthy
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-700">{summaryHealthy}</p>
        </button>
        <button
          onClick={() => { setRiskFilter("at_risk"); setPage(1); }}
          className={`rounded-lg border p-4 text-left transition-colors ${riskFilter === "at_risk" ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            At Risk
          </div>
          <p className="mt-1 text-xl font-bold text-red-700">{summaryAtRisk}</p>
        </button>
        <button
          onClick={() => { setRiskFilter("inactive"); setPage(1); }}
          className={`rounded-lg border p-4 text-left transition-colors ${riskFilter === "inactive" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
        >
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Clock className="h-4 w-4" />
            Inactive
          </div>
          <p className="mt-1 text-xl font-bold text-amber-700">{summaryInactive}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, business, phone..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </form>

        <select
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value as RiskFilter); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
        >
          <option value="">All Status</option>
          <option value="healthy">Healthy</option>
          <option value="at_risk">At Risk</option>
          <option value="inactive">Inactive</option>
          <option value="churned">Churned</option>
        </select>

        {(search || riskFilter) && (
          <button
            onClick={() => { setSearch(""); setSearchInput(""); setRiskFilter(""); setPage(1); }}
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-slate-700">
                        Business <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort("health_score")} className="flex items-center gap-1 hover:text-slate-700">
                        Health <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort("total_revenue")} className="flex items-center gap-1 hover:text-slate-700" title="Total invoiced revenue (money billed, not necessarily collected)">
                        Invoiced <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort("invoices_total")} className="flex items-center gap-1 hover:text-slate-700">
                        Invoices <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => handleSort("collection_rate")} className="flex items-center gap-1 hover:text-slate-700" title="Share of invoices marked paid in-app. Offline/bank-transfer payments that weren't marked paid are not counted, so this understates real collection for manual-invoice sellers.">
                        Collection <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.businesses.map((biz) => (
                    <>
                      <tr
                        key={biz.id}
                        onClick={() => toggleExpand(biz.id)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          expandedId === biz.id ? "bg-slate-50" : "hover:bg-slate-50/50"
                        } ${biz.health_score < 40 ? "bg-red-50/30" : ""}`}
                      >
                        {/* Business */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 text-sm">
                            {biz.business_name || biz.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {biz.business_name ? biz.name : biz.phone}
                          </div>
                        </td>

                        {/* Health */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${healthColor(biz.health_score)}`}>
                              <Shield className="h-3 w-3" />
                              {biz.health_score}
                            </div>
                            <span className="text-[10px] text-slate-400">{healthLabel(biz.health_score)}</span>
                          </div>
                        </td>

                        {/* Revenue */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900">{formatNaira(biz.total_revenue)}</span>
                            {biz.has_outlier_invoice && (
                              <span
                                className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                                title="Has a revenue invoice above ₦50M — excluded from this total (likely junk/test). Investigate."
                              >
                                ⚠ outlier
                              </span>
                            )}
                          </div>
                          {biz.total_expenses > 0 && (
                            <div className="text-xs text-slate-400">
                              Net: {formatNaira(biz.net_income)}
                            </div>
                          )}
                        </td>

                        {/* Invoices */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">{biz.invoices_total}</div>
                          <div className="text-xs text-slate-400">
                            {biz.invoices_this_month} this mo
                          </div>
                        </td>

                        {/* Collection */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-100">
                              <div
                                className={`h-1.5 rounded-full ${
                                  biz.collection_rate >= 70 ? "bg-emerald-500" :
                                  biz.collection_rate >= 40 ? "bg-amber-500" :
                                  "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(biz.collection_rate, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{biz.collection_rate}%</span>
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {timeAgo(biz.last_invoice_date)}
                        </td>

                        {/* Flags */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {biz.risk_flags.slice(0, 2).map((f) => riskFlagBadge(f))}
                            {biz.risk_flags.length > 2 && (
                              <span className="text-[10px] text-slate-400">+{biz.risk_flags.length - 2}</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {expandedId === biz.id && (
                        <tr key={`${biz.id}-detail`} className="bg-slate-50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              {/* Contact */}
                              <div className="space-y-2 text-sm">
                                <p className="font-medium text-slate-700">Contact</p>
                                <p className="text-slate-600">{biz.name}</p>
                                {biz.phone && <p className="text-slate-500">{biz.phone}</p>}
                                {biz.email && <p className="text-slate-500">{biz.email}</p>}
                                <p className="text-xs text-slate-400">
                                  Joined {new Date(biz.created_at).toLocaleDateString()}
                                </p>
                                {biz.last_login && (
                                  <p className="text-xs text-slate-400">
                                    Last login {timeAgo(biz.last_login)}
                                  </p>
                                )}
                              </div>

                              {/* Revenue Details */}
                              <div className="space-y-2 text-sm">
                                <p className="font-medium text-slate-700">Financials</p>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Invoiced</span>
                                  <span className="font-semibold text-emerald-700">{formatNaira(biz.total_revenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Expenses</span>
                                  <span className="font-semibold text-orange-700">{formatNaira(biz.total_expenses)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-1">
                                  <span className="text-slate-600 font-medium">Net Income</span>
                                  <span className={`font-bold ${biz.net_income >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    {formatNaira(biz.net_income)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-400">Avg. Invoice</span>
                                  <span className="text-slate-600">{formatNaira(biz.avg_invoice_value)}</span>
                                </div>
                              </div>

                              {/* Invoices */}
                              <div className="space-y-2 text-sm">
                                <p className="font-medium text-slate-700">Invoices</p>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Total</span>
                                  <span className="font-semibold">{biz.invoices_total}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-emerald-600">Paid</span>
                                  <span className="font-semibold text-emerald-700">{biz.invoices_paid}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-amber-600">Pending</span>
                                  <span className="font-semibold text-amber-700">{biz.invoices_pending}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">This Month</span>
                                  <span className="font-semibold">{biz.invoices_this_month}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Customers</span>
                                  <span className="font-semibold">{biz.customers_count}</span>
                                </div>
                              </div>

                              {/* Risk Flags */}
                              <div className="space-y-2 text-sm">
                                <p className="font-medium text-slate-700">Risk Flags</p>
                                {biz.risk_flags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {biz.risk_flags.map((f) => riskFlagBadge(f))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400">No risk flags</p>
                                )}
                              </div>
                            </div>

                            {/* Invoices drill-down (lazy-loaded on expand) */}
                            <div className="mt-4 border-t border-slate-200 pt-3">
                              <p className="mb-2 text-sm font-medium text-slate-700">Recent invoices</p>
                              {invLoadingId === biz.id ? (
                                <p className="text-xs text-slate-400">Loading invoices…</p>
                              ) : (invoicesById[biz.id]?.length ?? 0) === 0 ? (
                                <p className="text-xs text-slate-400">No invoices yet.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="text-left text-slate-400">
                                      <tr>
                                        <th className="py-1 pr-3 font-medium">Invoice</th>
                                        <th className="py-1 pr-3 font-medium">Customer</th>
                                        <th className="py-1 pr-3 font-medium text-right">Amount</th>
                                        <th className="py-1 pr-3 font-medium">Status</th>
                                        <th className="py-1 pr-3 font-medium">Via</th>
                                        <th className="py-1 font-medium">Date</th>
                                        {user?.is_super_admin && <th className="py-1 pl-3 font-medium text-right">Action</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {invoicesById[biz.id]?.map((inv) => (
                                        <tr key={inv.id} className="border-t border-slate-100">
                                          <td className="py-1 pr-3 font-mono text-slate-500">{inv.invoice_id}</td>
                                          <td className="py-1 pr-3 text-slate-600">{inv.customer_name || "—"}</td>
                                          <td className="py-1 pr-3 text-right font-semibold text-slate-800">{formatNaira(inv.amount)}</td>
                                          <td className="py-1 pr-3">{invoiceStatusBadge(inv.status)}</td>
                                          <td className="py-1 pr-3">{paymentMethodBadge(inv.payment_method)}</td>
                                          <td className="py-1 text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                                          {user?.is_super_admin && (
                                            <td className="py-1 pl-3 text-right">
                                              {inv.status !== "paid" && inv.status !== "cancelled" && inv.invoice_type === "revenue" && (
                                                <button
                                                  onClick={() => forceConfirm(biz.id, inv.invoice_id)}
                                                  className="rounded-md border border-emerald-300 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                                                  title="Verify the payment landed, then mark paid (bypasses the low-trust hold; counts toward GMV)"
                                                >
                                                  Confirm paid
                                                </button>
                                              )}
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {data?.businesses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No businesses match your filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data?.total || 0)} of {data?.total || 0}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Insights Footer */}
      {data && data.businesses.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          {summaryNeverInvoiced > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <UserX className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Activation Needed</p>
                <p className="text-amber-600 text-xs mt-1">
                  {summaryNeverInvoiced} users signed up but never created an invoice.
                  Send an onboarding email or WhatsApp nudge.
                </p>
              </div>
            </div>
          )}
          {summaryAtRisk > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Churn Risk</p>
                <p className="text-red-600 text-xs mt-1">
                  {summaryAtRisk} businesses have critical health scores.
                  Consider personal outreach to retain them.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
