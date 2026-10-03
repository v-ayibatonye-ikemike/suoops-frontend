"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Scale, RefreshCw, Undo2, CheckCircle2, Sparkles } from "lucide-react";
import { useAdminAuth } from "../layout";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";

interface Dispute {
  escrow_id: number;
  invoice_id: number;
  invoice_public_id: string | null;
  status: string;
  seller_id: number;
  seller_name: string | null;
  seller_business: string | null;
  seller_store_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  gross_naira: number;
  payout_naira: number;
  dispute_reason: string | null;
  held_for_review: boolean;
  review_reason: string | null;
  delivered_at: string | null;
  delivery_proof_note: string | null;
  delivery_proof_url: string | null;
  dispatched_at: string | null;
  dispatch_tracking: string | null;
  dispatch_note: string | null;
  dispatch_proof_url: string | null;
  delivery_location: string | null;
  buyer_disputes: number;
  buyer_false_disputes: number;
  buyer_flagged: boolean;
  seller_circumvention_attempts: number;
  payout_state: string;
  transfer_reference: string | null;
  payout_eta: string | null;
  disputed_at: string | null;
  created_at: string | null;
}

interface DisputeListResponse {
  disputes: Dispute[];
  total: number;
  total_capped: boolean;
  skip: number;
  limit: number;
  has_more: boolean;
}

interface DisputeAnalysis {
  escrow_id: number;
  invoice_id: string | null;
  status: string;
  amount_naira: number;
  neutral_summary: string;
  timeline: Array<{
    occurred_at: string;
    event: string;
    detail: string;
    source: string;
  }>;
  evidence: Array<{
    label: string;
    detail: string;
    source: string;
  }>;
  missing_evidence: string[];
  review_flags: string[];
  reviewer_questions: string[];
  ai_generated: boolean;
  generation_notice: string | null;
  decision_notice: string;
}

interface BusinessGroup {
  seller_id: number;
  seller_name: string | null;
  seller_business: string | null;
  seller_store_status: string | null;
  held_count: number;
  disputed_count: number;
  review_count: number;
  held_total_naira: number;
  oldest_created_at: string | null;
}

type Filter = "disputed" | "review" | "held" | "refunded" | "released" | "all";
type View = "orders" | "business";

const FILTERS: Filter[] = ["disputed", "review", "held", "refunded", "released", "all"];

function statusBadge(status: string): string {
  switch (status) {
    case "disputed":
      return "bg-amber-100 text-amber-700";
    case "refunded":
      return "bg-rose-100 text-rose-700";
    case "released":
      return "bg-emerald-100 text-emerald-700";
    case "held":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function money(n: number): string {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function payoutLabel(state: string): { text: string; cls: string } {
  switch (state) {
    case "paid":
      return { text: "Payout paid ✓", cls: "bg-emerald-100 text-emerald-700" };
    case "processing":
    case "pending":
      return { text: "Payout processing…", cls: "bg-amber-100 text-amber-700" };
    case "failed":
      return { text: "Payout failed", cls: "bg-rose-100 text-rose-700" };
    case "refunded":
      return { text: "Refunded", cls: "bg-rose-100 text-rose-700" };
    case "scheduled":
      return { text: "Payout scheduled", cls: "bg-blue-50 text-blue-700" };
    case "unknown":
      return { text: "Payout status unknown", cls: "bg-slate-100 text-slate-600" };
    default:
      return { text: "No payout yet", cls: "bg-slate-100 text-slate-500" };
  }
}

export default function DisputesPage() {
  const { token, authFetch } = useAdminAuth();
  const [items, setItems] = useState<Dispute[]>([]);
  const [meta, setMeta] = useState<{ total: number; total_capped: boolean; has_more: boolean }>({
    total: 0,
    total_capped: false,
    has_more: false,
  });
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("disputed");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [payoutLive, setPayoutLive] = useState<Record<number, string>>({});
  const [payoutBusy, setPayoutBusy] = useState<number | null>(null);
  const [bulkBusy, setBulkBusy] = useState<number | null>(null);
  const [view, setView] = useState<View>("orders");
  const [groups, setGroups] = useState<BusinessGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [analysisById, setAnalysisById] = useState<Record<number, DisputeAnalysis>>({});
  const [analysisBusy, setAnalysisBusy] = useState<number | null>(null);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function checkPayout(escrowId: number) {
    setPayoutBusy(escrowId);
    try {
      const res = await authFetch(`${API}/admin/disputes/${escrowId}/payout-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not fetch payout status");
      const body = await res.json();
      setPayoutLive((p) => ({ ...p, [escrowId]: body.state }));
      // If the transfer landed, the hold was finalized — refresh so the row
      // moves to Released.
      if (body.escrow_status === "released" || body.state === "paid") {
        await fetchData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not fetch payout status");
    } finally {
      setPayoutBusy(null);
    }
  }

  async function retryPayout(escrowId: number) {
    if (
      !window.confirm(
        "Retry the seller payout on the correct rail? Safe — it won't double-pay if a transfer already went through.",
      )
    )
      return;
    setPayoutBusy(escrowId);
    try {
      const doPost = (otp?: string) =>
        authFetch(`${API}/admin/disputes/${escrowId}/retry-payout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ otp }),
        });
      let res = await doPost();
      if (res.status === 428) {
        await authFetch(`${API}/admin/disputes/${escrowId}/step-up-otp`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const otp =
          window.prompt(
            "This is a high-value payout. Enter the confirmation code sent to your admin email:",
          ) || "";
        if (!otp) return;
        res = await doPost(otp);
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Retry failed");
      if (body.state) setPayoutLive((p) => ({ ...p, [escrowId]: body.state }));
      await fetchData();
      if (body.message) alert(body.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setPayoutBusy(null);
    }
  }

  // Retry payouts for ALL held orders from one business in a single action.
  // Server-side it reconciles each order's rail first (Flutterwave for storefront
  // orders) and only resends failed/unknown transfers — never double-pays.
  async function retryAllForSeller(sellerId: number) {
    if (
      !window.confirm(
        "Retry payouts for ALL held orders from this business? Safe — it reconciles each order first and won't double-pay any transfer already in flight. Eligible orders are sent as ONE consolidated transfer.",
      )
    )
      return;
    setBulkBusy(sellerId);
    try {
      const doPost = (otp?: string) =>
        authFetch(`${API}/admin/businesses/${sellerId}/retry-held-payouts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ otp }),
        });
      let res = await doPost();
      if (res.status === 428) {
        await authFetch(`${API}/admin/money/step-up-otp`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const otp =
          window.prompt(
            "This moves money for multiple orders. Enter the confirmation code sent to your admin email:",
          ) || "";
        if (!otp) return;
        res = await doPost(otp);
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Bulk retry failed");
      await fetchData(0);
      if (view === "business") await fetchGroups();
      if (body.message) alert(body.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk retry failed");
    } finally {
      setBulkBusy(null);
    }
  }

  const fetchData = useCallback(
    async (nextSkip = 0) => {
      if (!token) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          status_filter: filter,
          limit: "50",
          skip: String(nextSkip),
        });
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        const res = await authFetch(`${API}/admin/disputes?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load disputes");
        const body: DisputeListResponse = await res.json();
        // First page (or filter/search change) replaces; "Load more" appends.
        setItems((prev) => (nextSkip === 0 ? body.disputes : [...prev, ...body.disputes]));
        setMeta({
          total: body.total,
          total_capped: body.total_capped,
          has_more: body.has_more,
        });
        setSkip(nextSkip);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading disputes");
      } finally {
        setIsLoading(false);
      }
    },
    [token, authFetch, filter, debouncedSearch],
  );

  useEffect(() => {
    fetchData(0);
  }, [fetchData]);

  const fetchGroups = useCallback(async () => {
    if (!token) return;
    setGroupsLoading(true);
    setGroupsError("");
    try {
      const res = await authFetch(`${API}/admin/disputes/by-business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        setGroups(body.businesses ?? []);
      } else {
        const body = await res.json().catch(() => ({}));
        setGroupsError(body.detail || `Couldn't load businesses (HTTP ${res.status}).`);
      }
    } catch (err) {
      setGroupsError(err instanceof Error ? err.message : "Couldn't load businesses.");
    } finally {
      setGroupsLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (view === "business") fetchGroups();
  }, [view, fetchGroups]);

  async function resolve(escrowId: number, action: "refund" | "release") {
    let suspendSeller = false;
    let blockCard = false;
    let reason: string | null = null;
    if (action === "refund") {
      if (
        !window.confirm(
          "Refund the buyer for this order? The seller will NOT be paid.",
        )
      )
        return;
      suspendSeller = window.confirm(
        "Also SUSPEND the seller's storefront (delist it)? OK = suspend, Cancel = don't.",
      );
      blockCard = window.confirm(
        "Was this CARD FRAUD? OK = block the funding card from new orders, Cancel = don't.",
      );
      reason = window.prompt("Reason (optional):", "") || null;
    } else {
      if (
        !window.confirm(
          "Release the funds to the seller? This sides with the seller and pays them out.",
        )
      )
        return;
      reason = window.prompt("Reason (optional):", "") || null;
    }
    setBusyId(escrowId);
    try {
      const doPost = (otp?: string) =>
        authFetch(`${API}/admin/disputes/${escrowId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action,
            suspend_seller: suspendSeller,
            block_card: blockCard,
            reason,
            otp,
          }),
        });
      let res = await doPost();
      if (res.status === 428) {
        // High-value action → step-up: send a code to the admin email, then retry.
        await authFetch(`${API}/admin/disputes/${escrowId}/step-up-otp`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const otp =
          window.prompt(
            "This is a high-value action. Enter the confirmation code sent to your admin email:",
          ) || "";
        if (!otp) return;
        res = await doPost(otp);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Action failed");
      }
      const body = await res.json().catch(() => ({}));
      await fetchData();
      if (body.message) alert(body.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function analyseEvidence(escrowId: number) {
    if (analysisById[escrowId]) {
      setAnalysisById((current) => {
        const next = { ...current };
        delete next[escrowId];
        return next;
      });
      return;
    }
    setAnalysisBusy(escrowId);
    try {
      const response = await authFetch(`${API}/admin/disputes/${escrowId}/assistant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not analyse dispute evidence");
      setAnalysisById((current) => ({ ...current, [escrowId]: body as DisputeAnalysis }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not analyse dispute evidence");
    } finally {
      setAnalysisBusy(null);
    }
  }

  const disputes = items;

  // Display-only: how many loaded orders belong to each business, so an admin
  // can see at a glance when several disputes come from the same seller.
  const ordersPerSeller = disputes.reduce<Record<number, number>>((acc, d) => {
    acc[d.seller_id] = (acc[d.seller_id] || 0) + 1;
    return acc;
  }, {});
  // First loaded row per seller — anchors the one-per-business "retry all" button.
  const firstRowBySeller: Record<number, number> = {};
  for (const d of disputes) {
    if (firstRowBySeller[d.seller_id] === undefined) firstRowBySeller[d.seller_id] = d.escrow_id;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Scale className="h-6 w-6" /> Disputes
          </h1>
          <p className="text-slate-500">
            Buyer-protection holds: refund the buyer or release funds to the seller
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            fetchData(0);
            if (view === "business") fetchGroups();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
              filter === f
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* View: per-order queue vs per-business rollup */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("orders")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${view === "orders" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          By order
        </button>
        <button
          type="button"
          onClick={() => setView("business")}
          className={`rounded-full px-3 py-1 text-sm font-medium ${view === "business" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          By business
        </button>
      </div>

      {view === "business" && (
        <div className="space-y-2">
          {groupsLoading ? (
            <p className="py-10 text-center text-slate-400">Loading…</p>
          ) : groupsError ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
              <AlertCircle className="h-5 w-5" /> {groupsError}
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-400">
              No businesses with held or disputed orders.
            </div>
          ) : (
            groups.map((g) => (
              <div
                key={g.seller_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {g.seller_business || g.seller_name || `#${g.seller_id}`}
                    {g.seller_store_status && g.seller_store_status !== "active" && (
                      <span className="ml-1 text-xs text-rose-600">({g.seller_store_status})</span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
                      {g.held_count} held
                    </span>
                    {g.disputed_count > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                        {g.disputed_count} disputed
                      </span>
                    )}
                    {g.review_count > 0 && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                        {g.review_count} review
                      </span>
                    )}
                    <span className="text-slate-500">held total {money(g.held_total_naira)}</span>
                    {g.oldest_created_at && (
                      <span className="text-slate-400">
                        oldest {new Date(g.oldest_created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch(g.seller_business || g.seller_name || "");
                      setFilter("held");
                      setView("orders");
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    View orders
                  </button>
                  {g.held_count > 0 && (
                    <button
                      type="button"
                      onClick={() => retryAllForSeller(g.seller_id)}
                      disabled={bulkBusy === g.seller_id}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${bulkBusy === g.seller_id ? "animate-spin" : ""}`} />
                      Retry all held
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === "orders" && (
        <>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, seller or customer…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
        />
        <p className="shrink-0 text-xs text-slate-500">
          {meta.total_capped ? `${meta.total.toLocaleString()}+` : meta.total.toLocaleString()}{" "}
          {filter === "all" ? "orders" : `${filter} orders`}
        </p>
      </div>

      {(filter === "held" || filter === "all") && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          ℹ️ Held orders auto-release to sellers on schedule — no manual action needed.
          Only <strong>Disputed</strong> and <strong>Review</strong> need a decision.
        </p>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-slate-400">Loading…</p>
      ) : disputes.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-400">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
          No {filter === "all" ? "" : filter} orders.
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div
              key={d.escrow_id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusBadge(d.status)}`}
                    >
                      {d.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {d.invoice_public_id || `#${d.invoice_id}`}
                    </span>
                  </div>
                  {d.created_at && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Ordered{" "}
                      {new Date(d.created_at).toLocaleString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {d.disputed_at
                        ? ` · disputed ${new Date(d.disputed_at).toLocaleString("en-NG", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    Seller:{" "}
                    <span className="font-medium">
                      {d.seller_business || d.seller_name || `#${d.seller_id}`}
                    </span>
                    {d.seller_store_status && d.seller_store_status !== "active" && (
                      <span className="ml-1 text-xs text-rose-600">
                        ({d.seller_store_status})
                      </span>
                    )}
                    {ordersPerSeller[d.seller_id] > 1 && (
                      <span
                        className="ml-1 inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700"
                        title="Number of loaded held/disputed orders from this business"
                      >
                        {ordersPerSeller[d.seller_id]} orders here
                      </span>
                    )}
                    {(filter === "held" || filter === "all") &&
                      ordersPerSeller[d.seller_id] > 1 &&
                      firstRowBySeller[d.seller_id] === d.escrow_id && (
                        <button
                          onClick={() => retryAllForSeller(d.seller_id)}
                          disabled={bulkBusy === d.seller_id}
                          className="ml-2 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          title="Reconcile & retry payouts for every held order from this business"
                        >
                          <RefreshCw className={`h-3 w-3 ${bulkBusy === d.seller_id ? "animate-spin" : ""}`} />
                          {bulkBusy === d.seller_id ? "Retrying…" : "Retry all held for this business"}
                        </button>
                      )}
                  </p>
                  <p className="text-sm text-slate-600">
                    Buyer: {d.customer_name || "—"}{" "}
                    {d.customer_phone && (
                      <span className="text-slate-400">({d.customer_phone})</span>
                    )}
                    {(d.buyer_disputes > 0 || d.buyer_flagged) && (
                      <span
                        className={`ml-1 text-xs font-semibold ${
                          d.buyer_flagged ? "text-rose-600" : "text-slate-500"
                        }`}
                      >
                        {d.buyer_flagged ? "⚠ abusive — " : ""}
                        {d.buyer_disputes} dispute{d.buyer_disputes === 1 ? "" : "s"}
                        {d.buyer_false_disputes > 0
                          ? `, ${d.buyer_false_disputes} false`
                          : ""}
                      </span>
                    )}
                  </p>
                  {d.seller_circumvention_attempts > 0 && (
                    <p className="text-xs font-semibold text-rose-600">
                      ⚠ Seller: {d.seller_circumvention_attempts} off-platform message
                      attempt{d.seller_circumvention_attempts === 1 ? "" : "s"}
                    </p>
                  )}
                  {d.dispute_reason && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-sm text-amber-800">
                      “{d.dispute_reason}”
                    </p>
                  )}
                  {d.delivery_location && (
                    <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                      {d.delivery_location}
                    </p>
                  )}
                  {d.dispatched_at && (
                    <p className="mt-1 rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-800">
                      📦 Seller marked sent out
                      {d.dispatch_tracking ? ` — tracking ${d.dispatch_tracking}` : ""}
                      {d.dispatch_note ? `: “${d.dispatch_note}”` : ""}
                      {d.dispatch_proof_url && (
                        <>
                          {" "}
                          <a
                            href={d.dispatch_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline"
                          >
                            view photo
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  {d.delivered_at && (
                    <p className="mt-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                      ✓ Seller marked delivered
                      {d.delivery_proof_note ? `: “${d.delivery_proof_note}”` : ""}
                      {d.delivery_proof_url && (
                        <>
                          {" "}
                          <a
                            href={d.delivery_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline"
                          >
                            view photo
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  {d.held_for_review && (
                    <p className="mt-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                      ⚠ Flagged for review{d.review_reason ? `: ${d.review_reason}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{money(d.gross_naira)}</p>
                  <p className="text-xs text-slate-400">payout {money(d.payout_naira)}</p>
                  {(() => {
                    const st = payoutLive[d.escrow_id] ?? d.payout_state;
                    const b =
                      st === "scheduled" && d.payout_eta
                        ? {
                            text: `Auto-pays ${new Date(d.payout_eta).toLocaleString(
                              "en-NG",
                              { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
                            )}`,
                            cls: "bg-blue-50 text-blue-700",
                          }
                        : payoutLabel(st);
                    return (
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}
                      >
                        {b.text}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {(d.status === "disputed" || d.held_for_review) && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => analyseEvidence(d.escrow_id)}
                    disabled={analysisBusy === d.escrow_id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {analysisBusy === d.escrow_id
                      ? "Organising evidence…"
                      : analysisById[d.escrow_id]
                        ? "Hide evidence assistant"
                        : "Review with evidence assistant"}
                  </button>
                  {analysisById[d.escrow_id] && (
                    <DisputeEvidencePanel analysis={analysisById[d.escrow_id]} />
                  )}
                </div>
              )}

              {d.payout_state !== "none" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => checkPayout(d.escrow_id)}
                    disabled={payoutBusy === d.escrow_id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${payoutBusy === d.escrow_id ? "animate-spin" : ""}`}
                    />{" "}
                    Check payout status
                  </button>
                  {d.status === "held" &&
                    ["processing", "unknown", "failed", "pending"].includes(
                      payoutLive[d.escrow_id] ?? d.payout_state,
                    ) && (
                      <button
                        type="button"
                        onClick={() => retryPayout(d.escrow_id)}
                        disabled={payoutBusy === d.escrow_id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Retry payout
                      </button>
                    )}
                </div>
              )}

              {(d.status === "disputed" || d.status === "held") && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={busyId === d.escrow_id}
                    onClick={() => resolve(d.escrow_id, "refund")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    <Undo2 className="h-4 w-4" /> Refund buyer
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.escrow_id}
                    onClick={() => resolve(d.escrow_id, "release")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Release to seller
                  </button>
                </div>
              )}
            </div>
          ))}
          {meta.has_more && (
            <button
              type="button"
              onClick={() => fetchData(skip + 50)}
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}

function DisputeEvidencePanel({ analysis }: { analysis: DisputeAnalysis }) {
  return (
    <section className="mt-3 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Neutral evidence review</h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            {analysis.ai_generated ? "AI-assisted" : "Deterministic fallback"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-700">{analysis.neutral_summary}</p>
        {analysis.generation_notice && (
          <p className="mt-1 text-xs text-amber-700">{analysis.generation_notice}</p>
        )}
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {analysis.decision_notice}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Timeline</h4>
          <ol className="mt-2 space-y-2">
            {analysis.timeline.map((event, index) => (
              <li key={`${event.occurred_at}-${event.event}-${index}`} className="text-xs text-slate-700">
                <span className="font-semibold">{event.event}</span>
                <span className="text-slate-400">
                  {" "}
                  · {new Date(event.occurred_at).toLocaleString("en-NG")}
                </span>
                <p className="text-slate-600">{event.detail}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Recorded evidence</h4>
          <ul className="mt-2 space-y-2">
            {analysis.evidence.map((item, index) => (
              <li key={`${item.label}-${index}`} className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold">{item.label}</span>
                <span className="text-slate-400"> · {item.source}</span>
                <p className="mt-0.5">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {analysis.review_flags.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-rose-600">Review flags</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-rose-700">
            {analysis.review_flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
      {analysis.missing_evidence.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700">Missing evidence</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-amber-800">
            {analysis.missing_evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Questions for the reviewer</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-700">
          {analysis.reviewer_questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
