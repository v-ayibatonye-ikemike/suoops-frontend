"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { InvoiceDetailPanel } from "./invoice-detail";
import { invoiceStatusLabels } from "./status-map";
import { type Invoice, useInvoices } from "./use-invoices";
import { useNewInvoiceDrawer } from "@/features/dashboard/new-invoice-provider";
import { WhatsAppQuickCreate } from "@/features/dashboard/whatsapp-quick-create";
import { MessageCircle, Plus } from "lucide-react";

/** Format an amount using the invoice's own currency (no conversion). */
function formatInvoiceAmount(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `₦${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function InvoiceListWithDetail() {
  const newInvoice = useNewInvoiceDrawer();
  const searchParams = useSearchParams();
  const invoiceIdFromUrl = searchParams.get("invoice");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("awaiting_confirmation");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Load 50 at a time; "Load more" grows the window. Status + search run
  // SERVER-SIDE so they span every invoice, not just the loaded page.
  const [limit, setLimit] = useState(50);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset paging when the filters change so we start from the first page.
  useEffect(() => {
    setLimit(50);
  }, [statusFilter, debouncedSearch]);

  const { data, isLoading, error, isFetching } = useInvoices(0, limit, {
    status: statusFilter,
    search: debouncedSearch,
  });

  const invoices = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);

  // Server already applied status + search, so the visible list IS the result.
  const filteredInvoices = invoices;

  const hasInvoices = invoices.length > 0;
  const hasFilteredInvoices = filteredInvoices.length > 0;
  const hasAnyInvoices =
    (data?.status_counts?.all ?? data?.total ?? invoices.length) > 0;

  // Status counts come from the server (accurate across ALL pages), falling
  // back to the loaded set if the field isn't present.
  const statusCounts = useMemo(() => {
    const sc = data?.status_counts;
    if (sc) {
      return {
        all: sc.all ?? 0,
        pending: sc.pending ?? 0,
        awaiting_confirmation: sc.awaiting_confirmation ?? 0,
        paid: sc.paid ?? 0,
      };
    }
    return {
      all: invoices.length,
      pending: invoices.filter((inv) => inv.status === "pending").length,
      awaiting_confirmation: invoices.filter(
        (inv) => inv.status === "awaiting_confirmation"
      ).length,
      paid: invoices.filter((inv) => inv.status === "paid").length,
    };
  }, [data, invoices]);

  // Auto-select invoice from URL query param or default to first
  useEffect(() => {
    if (!hasInvoices) {
      setSelectedInvoiceId(null);
      return;
    }

    // If invoice ID is in URL, select it (even if not in current filter)
    if (invoiceIdFromUrl && invoices.some(inv => inv.invoice_id === invoiceIdFromUrl)) {
      setSelectedInvoiceId(invoiceIdFromUrl);
      // Clear status filter to show the invoice
      setStatusFilter("all");
      return;
    }

    if (
      selectedInvoiceId &&
      filteredInvoices.some(
        (invoice) => invoice.invoice_id === selectedInvoiceId
      )
    ) {
      return;
    }
    if (filteredInvoices.length > 0) {
      setSelectedInvoiceId(filteredInvoices[0].invoice_id);
    } else {
      setSelectedInvoiceId(null);
    }
  }, [hasInvoices, filteredInvoices, selectedInvoiceId, invoiceIdFromUrl, invoices]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-brand-border bg-white p-6 shadow-card">
        <p className="text-sm text-brand-textMuted">Loading invoices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 shadow-card">
        <p className="text-sm text-rose-800">
          Failed to load invoices. Please refresh.
        </p>
      </div>
    );
  }

  const badgeToneClass = (tone: string | undefined) => {
    switch (tone) {
      case "success":
        return "bg-brand-statusPaidBg text-brand-statusPaidText border border-green-200";
      case "warning":
        return "bg-brand-statusPendingBg text-brand-statusPendingText border border-amber-200";
      case "danger":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-brand-background text-brand-textMuted border border-brand-border";
    }
  };

  return (
    <>
      {/* Invoice List Card */}
      <div className="rounded-lg border border-brand-border bg-white p-5 shadow-card">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-brand-text">
            Track your payments
          </h2>
          <p className="mt-1 text-xs text-brand-textMuted">
            See which invoices are paid and which need follow-up
            {typeof data?.total === "number" && data.total > 0
              ? ` · showing ${invoices.length} of ${data.total}`
              : ""}
          </p>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by customer, ID or amount..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4 w-full rounded-lg border border-brand-border bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />

        {/* Filter Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { key: "awaiting_confirmation", label: "Awaiting" },
              { key: "pending", label: "Pending" },
              { key: "paid", label: "Paid" },
              { key: "all", label: "All" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                statusFilter === filter.key
                  ? "border-brand-jade bg-brand-jade text-white shadow-sm"
                  : "border-brand-jade/50 bg-brand-jade/10 text-brand-evergreen hover:border-brand-jade/70"
              }`}
            >
              {filter.label} ({statusCounts[filter.key] as number})
            </button>
          ))}
        </div>

        {/* Invoice List */}
        <div className="max-h-[500px] space-y-2 overflow-y-auto">
          {hasFilteredInvoices ? (
            filteredInvoices.map((invoice: Invoice) => {
              const status = invoiceStatusLabels[invoice.status] ?? {
                label: invoice.status,
                tone: "neutral" as const,
              };
              const isSelected = selectedInvoiceId === invoice.invoice_id;

              return (
                <div
                  key={invoice.invoice_id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedInvoiceId(invoice.invoice_id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedInvoiceId(invoice.invoice_id);
                    }
                  }}
                  className={`cursor-pointer rounded-lg border bg-white p-3 transition ${
                    isSelected
                      ? "border-brand-jade ring-2 ring-brand-jade/20"
                      : "border-brand-border hover:border-brand-jade/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-brand-text truncate">
                        {invoice.invoice_id}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-brand-primary">
                        {formatInvoiceAmount(Number(invoice.amount) || 0, invoice.currency ?? "NGN")}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeToneClass(
                        status.tone
                      )}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : hasAnyInvoices &&
            (statusFilter !== "all" || debouncedSearch.trim()) ? (
            <div className="rounded-lg border border-dashed border-brand-border bg-brand-background p-6 text-center">
              <p className="text-sm text-brand-textMuted">
                No invoices match your filters.
              </p>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="mt-4 inline-flex rounded-lg border border-brand-jade bg-brand-jade px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-jadeHover"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-brand-jade/30 bg-gradient-to-b from-emerald-50/50 to-white p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-jade/10">
                <svg className="h-6 w-6 text-brand-jade" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-semibold text-brand-text">No invoices yet</p>
              <p className="mt-1 text-xs text-brand-textMuted">
                Create and send your first professional invoice.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={newInvoice.open}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-jade px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-jadeHover"
                >
                  <Plus className="h-4 w-4" />
                  Create invoice
                </button>
                <WhatsAppQuickCreate>
                  {({ onClick, href, target, rel }) => {
                    const className =
                      "inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50";
                    const content = (
                      <>
                        <MessageCircle className="h-4 w-4" />
                        Use WhatsApp
                      </>
                    );
                    return href ? (
                      <a
                        href={href}
                        target={target}
                        rel={rel}
                        className={className}
                      >
                        {content}
                      </a>
                    ) : (
                      <button type="button" onClick={onClick} className={className}>
                        {content}
                      </button>
                    );
                  }}
                </WhatsAppQuickCreate>
              </div>
            </div>
          )}
        </div>

        {/* Load more — pull the next page so filtering/search covers older
            invoices too, not just the first 50. */}
        {data?.has_more && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + 50)}
            disabled={isFetching}
            className="mt-3 w-full rounded-lg border border-brand-jade/50 bg-brand-jade/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-evergreen transition hover:border-brand-jade/70 disabled:opacity-60"
          >
            {isFetching
              ? "Loading…"
              : `Load more (${data.total - invoices.length} more)`}
          </button>
        )}
      </div>

      {/* Invoice Detail Panel - Rendered separately to be placed in parent grid */}
      {hasFilteredInvoices && selectedInvoiceId && (
        <InvoiceDetailPanel invoiceId={selectedInvoiceId} />
      )}
    </>
  );
}

export function useInvoiceSelection() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  return { selectedInvoiceId, setSelectedInvoiceId };
}
