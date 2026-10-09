"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  Calendar,
  BarChart3,
  CheckCircle,
  Zap,
  Target,
  ArrowRight,
  Clock,
  UserX,
  Activity,
  ShoppingCart,
  Search,
  Phone,
  Mail,
  Building2,
  Landmark,
} from "lucide-react";
import { useAdminAuth } from "../layout";

// ─── Types ───────────────────────────────────────────────────────

interface TopUpBuyerInfo {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  business_name: string | null;
  wallet_balance_naira: number;
  total_top_ups: number;
  last_purchase_date: string | null;
}

interface PlatformMetrics {
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  cancelled_invoices: number;
  total_revenue_amount: number;
  total_expense_amount: number;
  invoices_today: number;
  invoices_this_week: number;
  invoices_this_month: number;
  total_users: number;
  online_payments_enabled: number;
  storefronts_enabled: number;
  storefronts_live: number;
  monetized_users: number;
  commission_this_month: number;
  commission_wallet_this_month: number;
  commission_online_this_month: number;
  total_customers: number;
  top_up_buyers: TopUpBuyerInfo[];
}

interface MonthlyDataPoint {
  month: string;
  value: number;
}

interface ActivationFunnel {
  total_signups: number;
  created_first_invoice: number;
  received_first_payment: number;
  enabled_online_payments: number;
}

interface GrowthMetrics {
  commission_month: number;
  commission_trend: MonthlyDataPoint[];
  commission_run_rate: number;
  churned_users: number;
  churn_rate: number;
  activation_funnel: ActivationFunnel;
  collection_rate: number;
  avg_days_to_payment: number | null;
  user_growth: MonthlyDataPoint[];
  invoice_growth: MonthlyDataPoint[];
  gmv_growth: MonthlyDataPoint[];
  avg_invoices_per_user: number;
  power_users: number;
  zero_invoice_users: number;
  whatsapp_users: number;
  email_only_users: number;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₦${(amount / 1_000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m) - 1]} '${year.slice(2)}`;
}

// ─── Components ──────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  details,
  icon: Icon,
  color = "emerald",
  alert,
}: {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  details?: React.ReactNode;
  icon: React.ElementType;
  color?: "emerald" | "blue" | "purple" | "orange" | "red" | "yellow";
  alert?: boolean;
}) {
  const colors = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <div className={`rounded-xl border bg-white p-6 ${alert ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className={`mt-1 text-sm ${alert ? "text-red-500 font-medium" : "text-slate-500"}`}>{subtitle}</p>
          )}
          {details && <div className="mt-3">{details}</div>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ActiveCohortMiniBar({
  total,
  newUsers,
  returningUsers,
}: {
  total: number;
  newUsers: number;
  returningUsers: number;
}) {
  const safeTotal = total > 0 ? total : 1;
  const newPct = Math.max(0, Math.min(100, (newUsers / safeTotal) * 100));
  const returningPct = Math.max(0, Math.min(100, (returningUsers / safeTotal) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>New (≤7d) {newUsers}</span>
        <span>Returning (&gt;7d) {returningUsers}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-full w-full">
          <div className="h-full bg-sky-500" style={{ width: `${newPct}%` }} />
          <div className="h-full bg-emerald-500" style={{ width: `${returningPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  total,
  icon: Icon,
  color,
  isLast,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: string;
  isLast?: boolean;
}) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="text-sm font-bold text-slate-900">{value.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-slate-100">
            <div className={`h-1.5 rounded-full ${color.replace("/10", "")}`}
              style={{ width: `${Math.min(parseFloat(pct), 100)}%` }} />
          </div>
          <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
        </div>
      </div>
      {!isLast && <ArrowRight className="h-4 w-4 text-slate-300 shrink-0 hidden sm:block" />}
    </div>
  );
}

function MiniBarChart({ data, color = "bg-emerald-500", label = "" }: {
  data: MonthlyDataPoint[];
  color?: string;
  label?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {label && <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>}
      <div className="flex gap-1 h-16">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center justify-end">
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
              title={`${formatMonth(d.month)}: ${d.value.toLocaleString()}`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d) => (
          <div key={d.month} className="flex-1 text-center">
            <span className="text-[9px] text-slate-400">{formatMonth(d.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Activity Analytics Types ────────────────────────────────────

interface ChannelBreakdown {
  whatsapp: number;
  dashboard: number;
}

interface PeriodActivity {
  total: number;
  by_channel: ChannelBreakdown;
}

interface DailyPoint {
  date: string;
  total: number;
  whatsapp: number;
  dashboard: number;
}

interface ActivityAnalytics {
  today: PeriodActivity;
  yesterday: PeriodActivity;
  this_week: PeriodActivity;
  last_week: PeriodActivity;
  this_month: PeriodActivity;
  last_month: PeriodActivity;
  this_year: PeriodActivity;
  active_users_today: number;
  active_users_this_week: number;
  active_users_this_month: number;
  new_active_users_today: number;
  returning_active_users_today: number;
  new_active_users_this_week: number;
  returning_active_users_this_week: number;
  new_active_users_this_month: number;
  returning_active_users_this_month: number;
  daily_trend: DailyPoint[];
  logins_today: number;
  logins_this_week: number;
  logins_this_month: number;
}

// ─── Tabs ────────────────────────────────────────────────────────

type Tab = "overview" | "growth" | "activity" | "diagnostic";

type Period = "week" | "month" | "year" | "all";

interface MetricsSummary {
  period: string;
  label: string;
  commission: number;
  commission_storefront?: number;
  commission_manual?: number;
  gmv: number;
  gmv_storefront?: number;
  gmv_manual?: number;
  invoices: number;
  expense_amount: number;
  documented_expense_amount: number;
  self_reported_expense_amount: number;
  flagged_expense_amount: number;
  expense_entries: number;
  expense_users: number;
  new_users: number;
  active_users: number;
}

// ─── Zero-Invoice Diagnostic Types ───────────────────────────────

interface ZeroInvoiceCohort {
  label: string;
  count: number;
  pct: number;
}

interface ZeroInvoiceUser {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  phone_verified: boolean;
  created_at: string;
  last_login: string | null;
  has_business_name: boolean;
  has_bank_details: boolean;
  has_logo: boolean;
  days_since_signup: number;
  login_count_bucket: string;
  signup_source: string | null;
}

interface ZeroInvoiceDiagnostic {
  total_zero_invoice: number;
  total_signups: number;
  drop_off_rate: number;
  never_logged_back: ZeroInvoiceCohort;
  logged_in_once: ZeroInvoiceCohort;
  logged_in_multiple: ZeroInvoiceCohort;
  whatsapp_verified: ZeroInvoiceCohort;
  email_only: ZeroInvoiceCohort;
  has_business_name: ZeroInvoiceCohort;
  has_bank_details: ZeroInvoiceCohort;
  signed_up_today: ZeroInvoiceCohort;
  signed_up_1_3_days: ZeroInvoiceCohort;
  signed_up_4_7_days: ZeroInvoiceCohort;
  signed_up_8_14_days: ZeroInvoiceCohort;
  signed_up_15_30_days: ZeroInvoiceCohort;
  signed_up_over_30_days: ZeroInvoiceCohort;
  weekly_signup_vs_activation: { week: string; signups: number; activated: number; activation_rate: number }[];
  source_breakdown: ZeroInvoiceCohort[];
  source_activation_rates: { source: string; signups: number; activated: number; activation_rate: number }[];
  recent_zero_invoice_users: ZeroInvoiceUser[];
}

// ─── Page ────────────────────────────────────────────────────────

export default function MetricsPage() {
  const { token } = useAdminAuth();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [growth, setGrowth] = useState<GrowthMetrics | null>(null);
  const [diagnostic, setDiagnostic] = useState<ZeroInvoiceDiagnostic | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [activityData, setActivityData] = useState<ActivityAnalytics | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [topUpPage, setTopUpPage] = useState(1);
  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchAll() {
      if (!token) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const [metricsRes, growthRes] = await Promise.all([
          fetch(`${apiUrl}/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/admin/metrics/growth`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!metricsRes.ok) throw new Error("Failed to fetch platform metrics");
        setMetrics(await metricsRes.json());

        if (growthRes.ok) {
          setGrowth(await growthRes.json());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, [token]);

  // Filterable headline numbers (single source of truth, week/month/year/all).
  useEffect(() => {
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
    fetch(`${apiUrl}/admin/metrics/summary?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d))
      .catch(() => {});
  }, [token, period]);

  // Fetch diagnostic data when tab is activated
  useEffect(() => {
    async function fetchDiagnostic() {
      if (!token || activeTab !== "diagnostic" || diagnostic) return;
      setDiagnosticLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const res = await fetch(`${apiUrl}/admin/metrics/zero-invoice-diagnostic`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setDiagnostic(await res.json());
      } catch { /* ignore */ } finally {
        setDiagnosticLoading(false);
      }
    }
    fetchDiagnostic();
  }, [token, activeTab, diagnostic]);

  // Fetch activity data when tab is activated
  useEffect(() => {
    async function fetchActivity() {
      if (!token || activeTab !== "activity" || activityData) return;
      setActivityLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const res = await fetch(`${apiUrl}/admin/metrics/activity`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setActivityData(await res.json());
      } catch { /* ignore */ } finally {
        setActivityLoading(false);
      }
    }
    fetchActivity();
  }, [token, activeTab, activityData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const totalUsers = metrics?.total_users || 0;
  const topUpBuyerCount = metrics?.top_up_buyers?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Metrics</h1>
        <p className="text-slate-500">Monitor overall platform performance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("growth")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "growth"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Growth Analytics
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "activity"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity Analytics
        </button>
        <button
          onClick={() => setActiveTab("diagnostic")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "diagnostic"
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search className="h-4 w-4" />
          Drop-off Diagnostic
          {growth && growth.zero_invoice_users > 0 && (
            <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {growth.zero_invoice_users}
            </span>
          )}
        </button>
      </div>

      {activeTab === "overview" && (
        <>
          {/* ═══ OVERVIEW TAB ═══ */}

          {/* Period filter — drives the four headline cards below */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm text-slate-500">Period:</span>
            {(["week", "month", "year", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p === "week" ? "Week" : p === "month" ? "Month" : p === "year" ? "Year" : "All time"}
              </button>
            ))}
            {summary && (
              <span className="ml-1 text-xs text-slate-400">({summary.label})</span>
            )}
          </div>

          {/* Overview Stats — filtered by the selected period */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Registered Users"
              value={totalUsers.toLocaleString()}
              subtitle={`${(summary?.new_users ?? 0).toLocaleString()} new · ${(summary?.active_users ?? 0).toLocaleString()} active sellers`}
              icon={Users}
            />
            <StatCard
              title={`Invoices (${summary?.label ?? "This month"})`}
              value={(summary?.invoices ?? 0).toLocaleString()}
              subtitle={`${metrics?.paid_invoices || 0} paid all-time`}
              icon={FileText}
              color="blue"
            />
            <StatCard
              title={`Commission (${summary?.label ?? "This month"})`}
              value={formatCurrency(summary?.commission ?? 0)}
              subtitle={`Storefront ${formatCurrency(summary?.commission_storefront ?? 0)} · Manual ${formatCurrency(summary?.commission_manual ?? 0)}`}
              icon={DollarSign}
              color="emerald"
            />
            <StatCard
              title={`Payment Volume (${summary?.label ?? "This month"})`}
              value={formatCurrency(summary?.gmv ?? 0)}
              subtitle={`Storefront ${formatCurrency(summary?.gmv_storefront ?? 0)} · Manual ${formatCurrency(summary?.gmv_manual ?? 0)}`}
              icon={Receipt}
              color="orange"
            />
            <StatCard
              title={`Expenses (${summary?.label ?? "This month"})`}
              value={formatCurrency(summary?.expense_amount ?? 0)}
              subtitle={`Receipt ${formatCurrency(summary?.documented_expense_amount ?? 0)} · Self-reported ${formatCurrency(summary?.self_reported_expense_amount ?? 0)} · Flagged ${formatCurrency(summary?.flagged_expense_amount ?? 0)}`}
              icon={TrendingDown}
              color="red"
            />
          </div>

      {/* Detailed Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">Invoice Status</h3>
          </div>
          <div className="space-y-5">
            <ProgressBar
              label="Paid Invoices"
              value={metrics?.paid_invoices || 0}
              total={metrics?.total_invoices || 1}
              color="bg-green-500"
            />
            <ProgressBar
              label="Pending Invoices"
              value={metrics?.pending_invoices || 0}
              total={metrics?.total_invoices || 1}
              color="bg-yellow-500"
            />
            <ProgressBar
              label="Cancelled Invoices"
              value={metrics?.cancelled_invoices || 0}
              total={metrics?.total_invoices || 1}
              color="bg-slate-400"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-slate-500" />
              <h4 className="font-medium text-slate-900">Activity</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Today</span>
                <span className="font-semibold text-slate-900">{metrics?.invoices_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">This Week</span>
                <span className="font-semibold text-slate-900">{metrics?.invoices_this_week || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">This Month</span>
                <span className="font-bold text-emerald-600">{metrics?.invoices_this_month || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Adoption */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart className="h-5 w-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">Feature Adoption</h3>
          </div>
          <div className="space-y-5">
            <ProgressBar
              label="Online Payments Enabled"
              value={metrics?.online_payments_enabled || 0}
              total={totalUsers || 1}
              color="bg-emerald-500"
            />
            <ProgressBar
              label="Storefronts Live"
              value={metrics?.storefronts_live || 0}
              total={totalUsers || 1}
              color="bg-blue-500"
            />
            <ProgressBar
              label="Wallet Top-up Buyers"
              value={topUpBuyerCount}
              total={totalUsers || 1}
              color="bg-purple-500"
            />
            <ProgressBar
              label={`Recording Expenses (${summary?.label ?? "This month"})`}
              value={summary?.expense_users || 0}
              total={totalUsers || 1}
              color="bg-red-500"
            />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Paying Businesses</p>
              <p className="text-2xl font-bold text-emerald-600">{metrics?.monetized_users || 0}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Top-up Buyers</p>
              <p className="text-2xl font-bold text-blue-600">{topUpBuyerCount}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-50">
              <p className="text-sm text-slate-500">Payments Adoption</p>
              <p className="text-2xl font-bold text-purple-600">
                {totalUsers > 0
                  ? (((metrics?.monetized_users || 0) / totalUsers) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>


        </div>
      </div>

      {/* Wallet Top-up Buyers Table */}
      {metrics?.top_up_buyers && metrics.top_up_buyers.length > 0 && (() => {
        const totalTopUpPages = Math.ceil(metrics.top_up_buyers.length / PAGE_SIZE);
        const pagedTopUpBuyers = metrics.top_up_buyers.slice((topUpPage - 1) * PAGE_SIZE, topUpPage * PAGE_SIZE);
        return (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Wallet Top-up Buyers</h3>
                <p className="text-sm text-slate-500">Businesses who topped up their prepaid invoice wallet</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                <span className="text-slate-600">Total: <strong className="text-blue-700">{topUpBuyerCount}</strong></span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-sm text-slate-500">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Top-ups</th>
                  <th className="px-6 py-3 font-medium">Wallet Balance</th>
                  <th className="px-6 py-3 font-medium">Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                {pagedTopUpBuyers.map((buyer) => (
                  <tr key={buyer.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{buyer.name}</div>
                      <div className="text-sm text-slate-500">{buyer.business_name || buyer.phone}</div>
                      {buyer.email && <div className="text-xs text-slate-400">{buyer.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {buyer.total_top_ups} top-up{buyer.total_top_ups !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-emerald-600">₦{buyer.wallet_balance_naira.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {buyer.last_purchase_date
                        ? new Date(buyer.last_purchase_date).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalTopUpPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
              <span className="text-sm text-slate-500">
                Page {topUpPage} of {totalTopUpPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTopUpPage((p) => Math.max(1, p - 1))}
                  disabled={topUpPage <= 1}
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setTopUpPage((p) => Math.min(totalTopUpPages, p + 1))}
                  disabled={topUpPage >= totalTopUpPages}
                  className="px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        );
      })()}
        </>
      )}

      {activeTab === "growth" && (
        <>
          {/* ═══ GROWTH ANALYTICS TAB ═══ */}

          {growth ? (
            <div className="space-y-6">
              {/* Revenue Health */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Commission (This Month)"
                  value={`₦${growth.commission_month.toLocaleString()}`}
                  subtitle={`Annualized run-rate: ₦${growth.commission_run_rate.toLocaleString()}`}
                  icon={DollarSign}
                  color="emerald"
                />
                <StatCard
                  title="Churn Rate"
                  value={`${growth.churn_rate}%`}
                  subtitle={`${growth.churned_users} businesses went inactive`}
                  icon={growth.churn_rate > 10 ? TrendingDown : Activity}
                  color={growth.churn_rate > 10 ? "red" : growth.churn_rate > 5 ? "orange" : "emerald"}
                  alert={growth.churn_rate > 10}
                />
                <StatCard
                  title="Collection Rate"
                  value={`${growth.collection_rate}%`}
                  subtitle={growth.avg_days_to_payment ? `Avg. ${growth.avg_days_to_payment} days to pay` : "No data yet"}
                  icon={Target}
                  color={growth.collection_rate >= 50 ? "emerald" : growth.collection_rate >= 30 ? "orange" : "red"}
                />
                <StatCard
                  title="Avg. Invoices/User"
                  value={growth.avg_invoices_per_user}
                  subtitle={`${growth.power_users} power users (10+/mo)`}
                  icon={Zap}
                  color="purple"
                />
              </div>

              {/* Activation Funnel + Engagement */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Activation Funnel */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Target className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Activation Funnel</h3>
                      <p className="text-xs text-slate-500">Where are users dropping off?</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <FunnelStep
                      label="Signed Up"
                      value={growth.activation_funnel.total_signups}
                      total={growth.activation_funnel.total_signups}
                      icon={Users}
                      color="bg-slate-100 text-slate-600"
                    />
                    <FunnelStep
                      label="Created First Invoice"
                      value={growth.activation_funnel.created_first_invoice}
                      total={growth.activation_funnel.total_signups}
                      icon={FileText}
                      color="bg-blue-100 text-blue-600"
                    />
                    <FunnelStep
                      label="Received First Payment"
                      value={growth.activation_funnel.received_first_payment}
                      total={growth.activation_funnel.total_signups}
                      icon={DollarSign}
                      color="bg-emerald-100 text-emerald-600"
                    />
                    <FunnelStep
                      label="Enabled Online Payments"
                      value={growth.activation_funnel.enabled_online_payments}
                      total={growth.activation_funnel.total_signups}
                      icon={CreditCard}
                      color="bg-purple-100 text-purple-600"
                      isLast
                    />
                  </div>
                </div>

                {/* Engagement Health */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Engagement Health</h3>
                      <p className="text-xs text-slate-500">User activity indicators</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex items-center gap-3">
                        <UserX className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Zero-Invoice Users</p>
                          <p className="text-xs text-red-600">Signed up but never created an invoice</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-700">{growth.zero_invoice_users}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-sm font-medium text-purple-800">Power Users</p>
                          <p className="text-xs text-purple-600">10+ invoices this month</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-purple-700">{growth.power_users}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-emerald-800">Avg. Invoices/User</p>
                          <p className="text-xs text-emerald-600">Across all active users</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-emerald-700">{growth.avg_invoices_per_user}</span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Avg. Days to Payment</p>
                          <p className="text-xs text-blue-600">From invoice created to paid</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-700">
                        {growth.avg_days_to_payment ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Channel Segmentation */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Users className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">User Channels</h3>
                      <p className="text-xs text-slate-500">WhatsApp vs email-only users</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Phone-Verified (WhatsApp)</p>
                          <p className="text-xs text-green-600">Verified phone — reachable on WhatsApp</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-700">{growth.whatsapp_users ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Not Phone-Verified</p>
                          <p className="text-xs text-amber-600">Email-only or phone not yet verified</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-amber-700">{growth.email_only_users ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Trend Charts */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900">User Growth</h3>
                  </div>
                  <MiniBarChart data={growth.user_growth} color="bg-blue-500" label="New signups per month" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-900">Invoice Growth</h3>
                  </div>
                  <MiniBarChart data={growth.invoice_growth} color="bg-emerald-500" label="Invoices created per month" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold text-slate-900">Payment Volume (GMV)</h3>
                  </div>
                  <MiniBarChart data={growth.gmv_growth} color="bg-purple-500" label="Paid payment volume per month" />
                </div>
              </div>

              {/* Commission Trend */}
              {growth.commission_trend.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Commission Trend</h3>
                      <p className="text-xs text-slate-500">Suoops earnings (0.5% manual · 3% storefront) per month</p>
                    </div>
                  </div>
                  <MiniBarChart data={growth.commission_trend} color="bg-emerald-500" />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-12 text-center">
              <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600">Growth analytics loading...</p>
              <p className="text-sm text-slate-400 mt-1">This data requires the latest backend update.</p>
            </div>
          )}
        </>
      )}

      {/* ═══ ACTIVITY ANALYTICS TAB ═══ */}
      {activeTab === "activity" && (
        <>
          {activityLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : activityData ? (
            <div className="space-y-6">
              {/* Period Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Invoices Today"
                  value={activityData.today.total}
                  subtitle={`Yesterday: ${activityData.yesterday.total}`}
                  icon={FileText}
                  color="blue"
                />
                <StatCard
                  title="Invoices This Week"
                  value={activityData.this_week.total}
                  subtitle={`Last week: ${activityData.last_week.total}`}
                  icon={Calendar}
                  color="emerald"
                />
                <StatCard
                  title="Invoices This Month"
                  value={activityData.this_month.total}
                  subtitle={`Last month: ${activityData.last_month.total}`}
                  icon={BarChart3}
                  color="purple"
                />
                <StatCard
                  title="Invoices This Year"
                  value={activityData.this_year.total}
                  icon={TrendingUp}
                  color="orange"
                />
              </div>

              {/* Active Users + Logins */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  title="Active Users Today"
                  value={activityData.active_users_today}
                  subtitle={`${activityData.logins_today} logins`}
                  details={
                    <ActiveCohortMiniBar
                      total={activityData.active_users_today}
                      newUsers={activityData.new_active_users_today}
                      returningUsers={activityData.returning_active_users_today}
                    />
                  }
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Active Users This Week"
                  value={activityData.active_users_this_week}
                  subtitle={`${activityData.logins_this_week} logins`}
                  details={
                    <ActiveCohortMiniBar
                      total={activityData.active_users_this_week}
                      newUsers={activityData.new_active_users_this_week}
                      returningUsers={activityData.returning_active_users_this_week}
                    />
                  }
                  icon={Users}
                  color="emerald"
                />
                <StatCard
                  title="Active Users This Month"
                  value={activityData.active_users_this_month}
                  subtitle={`${activityData.logins_this_month} logins`}
                  details={
                    <ActiveCohortMiniBar
                      total={activityData.active_users_this_month}
                      newUsers={activityData.new_active_users_this_month}
                      returningUsers={activityData.returning_active_users_this_month}
                    />
                  }
                  icon={Users}
                  color="purple"
                />
              </div>

              {/* Channel Breakdown Table */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Phone className="h-5 w-5 text-slate-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Invoices by Channel</h3>
                    <p className="text-xs text-slate-500">WhatsApp vs Web Dashboard breakdown</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 pr-4 font-medium text-slate-600">Period</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-600">Total</th>
                        <th className="text-right py-2 px-4 font-medium text-green-600">WhatsApp</th>
                        <th className="text-right py-2 px-4 font-medium text-blue-600">Dashboard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { label: "Today", data: activityData.today },
                        { label: "Yesterday", data: activityData.yesterday },
                        { label: "This Week", data: activityData.this_week },
                        { label: "Last Week", data: activityData.last_week },
                        { label: "This Month", data: activityData.this_month },
                        { label: "Last Month", data: activityData.last_month },
                        { label: "This Year", data: activityData.this_year },
                      ] as const).map((row) => (
                        <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2.5 pr-4 font-medium text-slate-700">{row.label}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">{row.data.total}</td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-green-700">
                              {row.data.by_channel.whatsapp}
                              {row.data.total > 0 && (
                                <span className="text-xs text-green-500">
                                  ({((row.data.by_channel.whatsapp / row.data.total) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-blue-700">
                              {row.data.by_channel.dashboard}
                              {row.data.total > 0 && (
                                <span className="text-xs text-blue-500">
                                  ({((row.data.by_channel.dashboard / row.data.total) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Trend (last 30 days) */}
              {activityData.daily_trend.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Daily Invoice Trend (30 days)</h3>
                      <p className="text-xs text-slate-500">Invoices created per day by channel</p>
                    </div>
                  </div>
                  {/* Stacked bar chart */}
                  {(() => {
                    const maxVal = Math.max(...activityData.daily_trend.map(d => d.total), 1);
                    return (
                      <div>
                        <div className="flex gap-0.5 h-32 items-end">
                          {activityData.daily_trend.map((d) => {
                            const pctTotal = (d.total / maxVal) * 100;
                            const pctWa = d.total > 0 ? (d.whatsapp / d.total) * pctTotal : 0;
                            const pctDash = d.total > 0 ? (d.dashboard / d.total) * pctTotal : 0;
                            return (
                              <div
                                key={d.date}
                                className="flex-1 flex flex-col justify-end"
                                title={`${d.date}: ${d.total} (WA: ${d.whatsapp}, Dash: ${d.dashboard})`}
                              >
                                <div className="w-full bg-green-500 rounded-t-sm" style={{ height: `${Math.max(pctWa, 0)}%` }} />
                                <div className="w-full bg-blue-500" style={{ height: `${Math.max(pctDash, 0)}%` }} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-4 mt-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> WhatsApp</div>
                          <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Dashboard</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-12 text-center">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600">Activity analytics loading...</p>
              <p className="text-sm text-slate-400 mt-1">This data requires the latest backend update.</p>
            </div>
          )}
        </>
      )}

      {/* ── Diagnostic Tab ── */}
      {activeTab === "diagnostic" && (
        <>
          {diagnosticLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : diagnostic ? (
            <div className="space-y-6">
              {/* Top-level stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm font-medium text-red-700">Zero-Invoice Users</p>
                  <p className="text-3xl font-bold text-red-800 mt-1">{diagnostic.total_zero_invoice}</p>
                  <p className="text-xs text-red-600 mt-1">of {diagnostic.total_signups} signups</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm font-medium text-red-700">Drop-off Rate</p>
                  <p className="text-3xl font-bold text-red-800 mt-1">{diagnostic.drop_off_rate}%</p>
                  <p className="text-xs text-red-600 mt-1">signed up → never created</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                  <p className="text-sm font-medium text-amber-700">Recoverable</p>
                  <p className="text-3xl font-bold text-amber-800 mt-1">
                    {diagnostic.logged_in_once.count + diagnostic.logged_in_multiple.count}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">came back but didn&apos;t create</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Engagement Buckets */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Engagement After Signup</h3>
                      <p className="text-xs text-slate-500">Did they ever come back?</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[diagnostic.never_logged_back, diagnostic.logged_in_once, diagnostic.logged_in_multiple].map((c) => (
                      <div key={c.label} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700">{c.label}</span>
                            <span className="font-semibold text-slate-900">{c.count} ({c.pct}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full transition-all"
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Phone className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Channel Breakdown</h3>
                      <p className="text-xs text-slate-500">WhatsApp vs email-only among zero-invoice</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">WhatsApp verified</span>
                      </div>
                      <span className="font-bold text-green-700">{diagnostic.whatsapp_verified.count} ({diagnostic.whatsapp_verified.pct}%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-800">Email only</span>
                      </div>
                      <span className="font-bold text-amber-700">{diagnostic.email_only.count} ({diagnostic.email_only.pct}%)</span>
                    </div>
                  </div>

                  <hr className="my-4 border-slate-200" />

                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="h-5 w-5 text-slate-500" />
                    <h4 className="font-medium text-slate-800 text-sm">Profile Completeness</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800">Set business name</span>
                      </div>
                      <span className="font-bold text-blue-700">{diagnostic.has_business_name.count} ({diagnostic.has_business_name.pct}%)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-purple-800">Added bank details</span>
                      </div>
                      <span className="font-bold text-purple-700">{diagnostic.has_bank_details.count} ({diagnostic.has_bank_details.pct}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signup Age Distribution */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Signup Age Distribution</h3>
                    <p className="text-xs text-slate-500">How long ago did these users sign up?</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { ...diagnostic.signed_up_today, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
                    { ...diagnostic.signed_up_1_3_days, color: "bg-blue-100 text-blue-700 border-blue-200" },
                    { ...diagnostic.signed_up_4_7_days, color: "bg-amber-100 text-amber-700 border-amber-200" },
                    { ...diagnostic.signed_up_8_14_days, color: "bg-orange-100 text-orange-700 border-orange-200" },
                    { ...diagnostic.signed_up_15_30_days, color: "bg-red-100 text-red-700 border-red-200" },
                    { ...diagnostic.signed_up_over_30_days, color: "bg-slate-100 text-slate-700 border-slate-200" },
                  ].map((b) => (
                    <div key={b.label} className={`rounded-lg border p-4 text-center ${b.color}`}>
                      <p className="text-2xl font-bold">{b.count}</p>
                      <p className="text-xs font-medium mt-1">{b.label}</p>
                      <p className="text-xs opacity-75">{b.pct}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Attribution */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Source Breakdown (zero-invoice users) */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Source Breakdown</h3>
                      <p className="text-xs text-slate-500">Where zero-invoice users came from</p>
                    </div>
                  </div>
                  {diagnostic.source_breakdown.length > 0 ? (
                    <div className="space-y-3">
                      {diagnostic.source_breakdown.map((s) => (
                        <div key={s.label} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-700 font-medium">{s.label}</span>
                              <span className="font-semibold text-slate-900">{s.count} ({s.pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-400 rounded-full transition-all"
                                style={{ width: `${s.pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No source data yet — tracking starts with new signups
                    </p>
                  )}
                </div>

                {/* Source Activation Rates (all users) */}
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="h-5 w-5 text-slate-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Activation by Source</h3>
                      <p className="text-xs text-slate-500">Which channels produce active users?</p>
                    </div>
                  </div>
                  {diagnostic.source_activation_rates.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 pr-3 font-medium text-slate-600">Source</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Signups</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Activated</th>
                            <th className="text-right py-2 pl-3 font-medium text-slate-600">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diagnostic.source_activation_rates.map((r) => (
                            <tr key={r.source} className="border-b border-slate-50">
                              <td className="py-2 pr-3 font-medium text-slate-700">{r.source}</td>
                              <td className="py-2 px-3 text-right text-slate-900">{r.signups}</td>
                              <td className="py-2 px-3 text-right text-emerald-700">{r.activated}</td>
                              <td className={`py-2 pl-3 text-right font-bold ${r.activation_rate >= 40 ? "text-emerald-700" : r.activation_rate >= 20 ? "text-amber-700" : "text-red-700"}`}>
                                {r.activation_rate}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No source data yet — tracking starts with new signups
                    </p>
                  )}
                </div>
              </div>

              {/* Weekly Signup vs Activation Trend */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Weekly Signup → Activation</h3>
                    <p className="text-xs text-slate-500">Are new signups converting? (last 8 weeks)</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 pr-4 font-medium text-slate-600">Week of</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-600">Signups</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-600">Activated</th>
                        <th className="text-right py-2 px-4 font-medium text-slate-600">Rate</th>
                        <th className="py-2 pl-4 font-medium text-slate-600 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostic.weekly_signup_vs_activation.map((w) => (
                        <tr key={w.week} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-700">{w.week}</td>
                          <td className="py-2 px-4 text-right font-medium text-slate-900">{w.signups}</td>
                          <td className="py-2 px-4 text-right font-medium text-emerald-700">{w.activated}</td>
                          <td className={`py-2 px-4 text-right font-bold ${w.activation_rate >= 40 ? "text-emerald-700" : w.activation_rate >= 20 ? "text-amber-700" : "text-red-700"}`}>
                            {w.activation_rate}%
                          </td>
                          <td className="py-2 pl-4">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${w.activation_rate >= 40 ? "bg-emerald-500" : w.activation_rate >= 20 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(w.activation_rate, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Zero-Invoice Users */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <UserX className="h-5 w-5 text-red-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Recent Zero-Invoice Users</h3>
                    <p className="text-xs text-slate-500">Most recent signups who never created an invoice</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 pr-3 font-medium text-slate-600">User</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Source</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Channel</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Logins</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Profile</th>
                        <th className="text-right py-2 pl-3 font-medium text-slate-600">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostic.recent_zero_invoice_users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 pr-3">
                            <p className="font-medium text-slate-900">{u.name || "—"}</p>
                            <p className="text-xs text-slate-500">{u.phone || u.email || `ID ${u.id}`}</p>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              {u.signup_source || "—"}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {u.phone_verified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                <Phone className="h-3 w-3" /> WhatsApp
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                                <Mail className="h-3 w-3" /> Email
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.login_count_bucket === "never"
                                ? "bg-red-100 text-red-700"
                                : u.login_count_bucket === "once"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {u.login_count_bucket === "never" ? "Never returned" : u.login_count_bucket === "once" ? "Came back once" : "Multiple visits"}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              {u.has_business_name && (
                                <span title="Business name" className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs bg-blue-50 text-blue-600">
                                  <Building2 className="h-3 w-3" />
                                </span>
                              )}
                              {u.has_bank_details && (
                                <span title="Bank details" className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs bg-purple-50 text-purple-600">
                                  <Landmark className="h-3 w-3" />
                                </span>
                              )}
                              {!u.has_business_name && !u.has_bank_details && (
                                <span className="text-xs text-slate-400">Empty</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pl-3 text-right text-xs text-slate-600">
                            {u.days_since_signup}d ago
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-12 text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600">Diagnostic data loading...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
