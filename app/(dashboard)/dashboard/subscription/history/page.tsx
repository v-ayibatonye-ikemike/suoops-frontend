"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPaymentHistory, type PaymentTransaction } from "@/api/subscription";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, ArrowLeft } from "lucide-react";

const STATUS_COLORS = {
  success: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  refunded: "bg-blue-100 text-blue-800 border-blue-200",
};

const STATUS_LABELS = {
  success: "✓ Paid",
  pending: "⏳ Pending",
  failed: "✗ Failed",
  cancelled: "⊘ Cancelled",
  refunded: "↩ Refunded",
};

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [summary, setSummary] = useState({
    total_paid: 0,
    successful_count: 0,
    pending_count: 0,
    failed_count: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  const loadPayments = async (pageNum: number, filter?: string) => {
    try {
      setLoading(true);
      const data = await getPaymentHistory({
        limit: pageSize,
        offset: pageNum * pageSize,
        status_filter: filter || undefined,
      });

      setPayments(data.payments);
      setSummary(data.summary);
      setHasMore(data.total > (pageNum + 1) * pageSize);
    } catch (error) {
      console.error("Failed to load payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(page, statusFilter);
  }, [page, statusFilter]);

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setPage(0);
  };

  const handleRefresh = () => {
    loadPayments(page, statusFilter);
  };

  const handleExportCSV = () => {
    // Convert payments to CSV
    const headers = [
      "Date",
      "Reference",
      "Amount",
      "Status",
      "Plan",
      "Payment Method",
    ];
    const rows = payments.map((p) => [
      new Date(p.created_at).toLocaleDateString(),
      p.reference,
      `₦${p.amount.toLocaleString()}`,
      p.status,
      `${p.plan_before} → ${p.plan_after}`,
      p.payment_method || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suoops-payment-history-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading && payments.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/2 rounded bg-brand-background sm:h-8 sm:w-1/3" />
          <div className="h-24 w-full rounded bg-brand-background sm:h-32" />
          <div className="h-48 w-full rounded bg-brand-background sm:h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/settings")}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
          <div>
            <h1 className="text-xl font-bold text-brand-text sm:text-2xl">
              Payment History
            </h1>
            <p className="mt-1 text-xs text-brand-textMuted sm:text-sm">
              View your wallet top-ups and historical billing transactions
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-brand-textMuted sm:text-sm">Total Paid</p>
          <p className="text-lg font-bold text-brand-primary sm:text-2xl">
            ₦{summary.total_paid.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-brand-textMuted sm:text-sm">Successful</p>
          <p className="text-lg font-bold text-green-600 sm:text-2xl">
            {summary.successful_count}
          </p>
        </div>
        <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-brand-textMuted sm:text-sm">Pending</p>
          <p className="text-lg font-bold text-yellow-600 sm:text-2xl">
            {summary.pending_count}
          </p>
        </div>
        <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:p-4">
          <p className="text-xs text-brand-textMuted sm:text-sm">Failed</p>
          <p className="text-lg font-bold text-red-600 sm:text-2xl">
            {summary.failed_count}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("")}
          className="flex-1 sm:flex-none"
        >
          All
        </Button>
        <Button
          variant={statusFilter === "success" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("success")}
          className="flex-1 sm:flex-none"
        >
          Successful
        </Button>
        <Button
          variant={statusFilter === "pending" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("pending")}
          className="flex-1 sm:flex-none"
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === "failed" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("failed")}
          className="flex-1 sm:flex-none"
        >
          Failed
        </Button>
      </div>

      {/* Payment Table */}
      <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm">
        {payments.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <p className="text-brand-textMuted">No payment history found</p>
            <p className="mt-2 text-xs text-brand-textMuted sm:text-sm">
              Your billing transactions will appear here
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Reference
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Plan Upgrade
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Payment Method
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">
                      Billing Period
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="text-xs sm:text-sm">
                          {new Date(payment.created_at).toLocaleDateString()}
                          <div className="text-xs text-brand-textMuted">
                            {new Date(payment.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-brand-background px-2 py-1 text-xs">
                          {payment.reference}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold sm:text-base">
                          ₦{payment.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs sm:text-sm">
                          <span className="capitalize text-brand-textMuted">
                            {payment.plan_before}
                          </span>
                          <span className="mx-1">→</span>
                          <span className="font-semibold capitalize text-brand-primary">
                            {payment.plan_after}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.payment_method ? (
                          <div className="text-xs sm:text-sm">
                            <span className="capitalize">
                              {payment.payment_method}
                            </span>
                            {payment.card_last4 && (
                              <div className="text-xs text-brand-textMuted">
                                {payment.card_brand} •••• {payment.card_last4}
                              </div>
                            )}
                            {payment.bank_name && (
                              <div className="text-xs text-brand-textMuted">
                                {payment.bank_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-brand-textMuted sm:text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[payment.status]}>
                          {STATUS_LABELS[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.billing_start_date &&
                        payment.billing_end_date ? (
                          <div className="text-xs text-brand-textMuted">
                            {new Date(
                              payment.billing_start_date
                            ).toLocaleDateString()}{" "}
                            —{" "}
                            {new Date(
                              payment.billing_end_date
                            ).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-xs text-brand-textMuted sm:text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-brand-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-center text-xs text-brand-textMuted sm:text-sm">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage(page + 1)}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
