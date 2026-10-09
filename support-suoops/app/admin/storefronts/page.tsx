"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Store,
  Eye,
  Package,
  Star,
  CreditCard,
  ImageOff,
  ShieldAlert,
  Ban,
  Pause,
  Play,
  TrendingUp,
  ExternalLink,
  User,
} from "lucide-react";
import { useAdminAuth } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";

// ─── Types ───────────────────────────────────────────────────────

interface StorefrontItem {
  id: number;
  name: string;
  business_name: string | null;
  slug: string | null;
  storefront_enabled: boolean;
  store_status: string;
  store_status_reason: string | null;
  store_status_at: string | null;
  views: number;
  products_total: number;
  products_active: number;
  has_logo: boolean;
  has_description: boolean;
  has_location: boolean;
  online_payments_enabled: boolean;
  reviews_count: number;
  reviews_avg: number | null;
  sales_count: number;
  gmv: number;
  last_sale_at: string | null;
  days_since_last_sale: number | null;
  created_at: string;
  owner_flagged: boolean;
  owner_risk_score: number;
  owner_phone: string | null;
  owner_email: string | null;
  not_live_reasons: string[];
  quality_score: number;
  risk_flags: string[];
}

interface StorefrontListResponse {
  storefronts: StorefrontItem[];
  total: number;
  page: number;
  page_size: number;
  counts: Record<string, number>;
}

type StatusFilter = "all" | "active" | "suspended" | "delisted";
type SortKey = "quality_score" | "views" | "gmv" | "sales_count" | "products_active" | "reviews_count" | "created_at" | "name";

// ─── Helpers ─────────────────────────────────────────────────────

function formatNaira(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}k`;
  return `₦${amount.toLocaleString()}`;
}

function qualityColor(score: number): string {
  if (score >= 70) return "text-emerald-700 bg-emerald-100";
  if (score >= 50) return "text-blue-700 bg-blue-100";
  if (score >= 30) return "text-amber-700 bg-amber-100";
  return "text-red-700 bg-red-100";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    suspended: "bg-amber-100 text-amber-700",
    delisted: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status.toUpperCase()}
    </span>
  );
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  no_products: { label: "No products", color: "bg-slate-100 text-slate-600" },
  no_logo: { label: "No logo", color: "bg-slate-100 text-slate-600" },
  no_online_payments: { label: "No online pay", color: "bg-orange-100 text-orange-700" },
  no_sales: { label: "No sales", color: "bg-amber-100 text-amber-700" },
  low_rating: { label: "Low rating", color: "bg-red-100 text-red-700" },
  thin_profile: { label: "Thin profile", color: "bg-slate-100 text-slate-600" },
  flagged_owner: { label: "Flagged owner", color: "bg-red-100 text-red-700" },
};

function riskBadge(flag: string) {
  const info = RISK_LABELS[flag] || { label: flag, color: "bg-slate-100 text-slate-500" };
  return (
    <span key={flag} className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${info.color}`}>
      {info.label}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function StorefrontsPage() {
  const { token, authFetch } = useAdminAuth();
  const [data, setData] = useState<StorefrontListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [criteria, setCriteria] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("quality_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const pageSize = 25;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        status_filter: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (criteria) params.set("criteria", criteria);
      if (search) params.set("search", search);

      const res = await authFetch(`${API}/admin/storefronts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load storefronts");
      setData(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setIsLoading(false);
    }
  }, [token, authFetch, page, statusFilter, criteria, sortBy, sortOrder, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function changeStatus(id: number, status: "active" | "suspended" | "delisted") {
    let reason: string | null = null;
    if (status !== "active") {
      reason = window.prompt(
        `Reason for ${status === "suspended" ? "suspending" : "delisting"} this store (shown to admins only):`,
        ""
      );
      if (reason === null) return; // cancelled
    } else if (!window.confirm("Reinstate this storefront to the public directory?")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await authFetch(`${API}/admin/storefronts/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason }),
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
        <h1 className="text-2xl font-bold text-slate-900">Storefronts</h1>
        <p className="text-slate-500">Track, analyze & moderate public stores on SuoOps</p>
      </div>

      {/* Status filter cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        {/* Live = complete AND discoverable in public search — same gate as the marketplace. Display-only. */}
        <div
          className="rounded-lg border border-blue-200 bg-blue-50 p-4"
          title="Complete + discoverable in public search: storefront on, logo, online payments, a product with a photo & description, a store description, and a location. Matches the marketplace exactly."
        >
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Store className="h-4 w-4" />
            Live in search
          </div>
          <p className="mt-1 text-xl font-bold text-blue-700">{counts.live ?? 0}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-blue-500">
            on · logo · pay · product w/ photo+desc · description · location
          </p>
        </div>
        {([
          { key: "all", label: "All Stores", value: counts.total, color: "text-slate-900" },
          { key: "active", label: "Active", value: counts.active, color: "text-emerald-700" },
          { key: "suspended", label: "Suspended", value: counts.suspended, color: "text-amber-700" },
          { key: "delisted", label: "Delisted", value: counts.delisted, color: "text-red-700" },
          { key: "low", label: "Low Quality", value: counts.low_quality, color: "text-orange-700" },
        ] as const).map((c) => (
          <button
            key={c.key}
            onClick={() => {
              if (c.key === "low") { setCriteria(""); setStatusFilter("all"); setSortBy("quality_score"); setSortOrder("asc"); }
              else { setStatusFilter(c.key as StatusFilter); }
              setPage(1);
            }}
            className={`rounded-lg border p-4 text-left transition-colors ${
              (c.key !== "low" && statusFilter === c.key) ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Store className="h-4 w-4" />
              {c.label}
            </div>
            <p className={`mt-1 text-xl font-bold ${c.color}`}>{c.value ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, business or slug…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-400 focus:outline-hidden"
          />
        </form>
        <select
          value={criteria}
          onChange={(e) => { setCriteria(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-700"
        >
          <option value="">All criteria</option>
          <option value="no_products">No products</option>
          <option value="no_logo">No logo</option>
          <option value="no_online_payments">No online payments</option>
          <option value="no_sales">No sales</option>
          <option value="low_rating">Low rating</option>
          <option value="thin_profile">Thin profile</option>
          <option value="flagged_owner">Flagged owner</option>
        </select>
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [sb, so] = e.target.value.split(":");
            setSortBy(sb as SortKey);
            setSortOrder(so as "asc" | "desc");
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-700"
        >
          <option value="quality_score:asc">Quality ↑ (worst first)</option>
          <option value="quality_score:desc">Quality ↓ (best first)</option>
          <option value="gmv:desc">GMV ↓</option>
          <option value="sales_count:desc">Sales ↓</option>
          <option value="views:desc">Views ↓</option>
          <option value="products_active:desc">Products ↓</option>
          <option value="reviews_count:desc">Reviews ↓</option>
          <option value="created_at:desc">Newest</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Quality</th>
              <th className="px-4 py-3">Catalog</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Sales / GMV</th>
              <th className="px-4 py-3">Reviews</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!isLoading && data?.storefronts.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No storefronts match.</td></tr>
            )}
            {!isLoading && data?.storefronts.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{s.business_name || s.name}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    {s.slug ? (
                      <a href={`https://suoops.com/store/${s.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-emerald-600">
                        /{s.slug} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
                  </div>
                  {/* Owner trace: who runs this store */}
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500" title="Store owner">
                    <User className="h-3 w-3 text-slate-400" />
                    <span>{s.name}</span>
                  </div>
                  {(s.owner_phone || s.owner_email) && (
                    <div className="text-[10px] text-slate-400">
                      {s.owner_phone}{s.owner_phone && s.owner_email ? " · " : ""}{s.owner_email}
                    </div>
                  )}
                  {/* Exactly why the store isn't in public live search (empty = live). */}
                  {s.not_live_reasons.length === 0 ? (
                    <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      Live in search
                    </div>
                  ) : (
                    <div className="mt-1 text-[10px] leading-tight text-amber-700" title="Missing to appear in public live search">
                      <span className="font-medium">Not live:</span> {s.not_live_reasons.join(" · ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {statusBadge(s.store_status)}
                  {s.store_status_reason && (
                    <div className="mt-0.5 max-w-[140px] truncate text-[10px] text-slate-400" title={s.store_status_reason}>{s.store_status_reason}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${qualityColor(s.quality_score)}`}>{s.quality_score}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-slate-700"><Package className="h-3.5 w-3.5 text-slate-400" />{s.products_active}/{s.products_total}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                    {s.has_logo ? <span title="Has logo">Logo</span> : <span className="inline-flex items-center gap-0.5 text-amber-600"><ImageOff className="h-3 w-3" />no logo</span>}
                    {s.online_payments_enabled ? <span className="inline-flex items-center gap-0.5 text-emerald-600"><CreditCard className="h-3 w-3" />pay</span> : <span className="text-orange-600">no pay</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><div className="flex items-center gap-1 text-slate-700"><Eye className="h-3.5 w-3.5 text-slate-400" />{s.views}</div></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-slate-700"><TrendingUp className="h-3.5 w-3.5 text-slate-400" />{s.sales_count}</div>
                  <div className="text-[10px] text-slate-400">{formatNaira(s.gmv)}</div>
                </td>
                <td className="px-4 py-3">
                  {s.reviews_count > 0 ? (
                    <div className="flex items-center gap-1 text-slate-700"><Star className="h-3.5 w-3.5 text-amber-400" />{s.reviews_avg} <span className="text-[10px] text-slate-400">({s.reviews_count})</span></div>
                  ) : <span className="text-[10px] text-slate-400">none</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[160px] flex-wrap gap-1">
                    {s.owner_flagged && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"><ShieldAlert className="h-3 w-3" />flagged</span>}
                    {s.risk_flags.filter((f) => f !== "flagged_owner").map(riskBadge)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {s.store_status === "active" ? (
                      <>
                        <button disabled={busyId === s.id} onClick={() => changeStatus(s.id, "suspended")} title="Suspend" className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50"><Pause className="h-4 w-4" /></button>
                        <button disabled={busyId === s.id} onClick={() => changeStatus(s.id, "delisted")} title="Delist" className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"><Ban className="h-4 w-4" /></button>
                      </>
                    ) : (
                      <button disabled={busyId === s.id} onClick={() => changeStatus(s.id, "active")} title="Reinstate" className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"><Play className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {data?.page} of {totalPages} · {data?.total} stores</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
