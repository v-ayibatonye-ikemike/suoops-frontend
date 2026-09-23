"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { parseFeatureGateError, type FeatureGateParsed } from "@/lib/feature-gate";
import { useInvoiceQuota } from "./use-invoice-quota";
import { useCreateQuickSale } from "./use-quick-sale";
import { PlanSelectionModal } from "../settings/plan-selection-modal";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

/**
 * Fast-entry form for a walk-in / in-person sale: amount, what was sold, and
 * how it was collected. No customer contact is required — the sale is
 * recorded and marked paid in one call, unlike the full invoice form which
 * bills a named customer.
 */
export function QuickSaleForm() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [showCustomerName, setShowCustomerName] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successAmount, setSuccessAmount] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);

  const mutation = useCreateQuickSale();
  // Same synchronous double-submit guard used by the full invoice form — a
  // fast double-tap must not record two sales.
  const submittingRef = useRef(false);
  const { data: quota, isLoading: quotaLoading } = useInvoiceQuota();

  function resetForm() {
    setAmount("");
    setDescription("");
    setPaymentMethod("cash");
    setCustomerName("");
    setShowCustomerName(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    setQuotaError(null);
    setSuccessAmount(null);

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a positive amount.");
      return;
    }

    try {
      submittingRef.current = true;
      const invoice = await mutation.mutateAsync({
        amount: parsedAmount,
        currency: "NGN",
        description: description.trim() || undefined,
        payment_method: paymentMethod,
        customer_name: customerName.trim() || undefined,
      });
      setSuccessAmount(Number(invoice.amount).toLocaleString("en-US", { maximumFractionDigits: 0 }));
      resetForm();
    } catch (submitError) {
      console.error(submitError);
      const enrichedGate = (submitError as { featureGate?: FeatureGateParsed })?.featureGate;
      const gate = enrichedGate || parseFeatureGateError(submitError);

      if (gate?.type === "invoice_limit") {
        const composed = [
          gate.message,
          gate.currentCount != null && gate.limit != null
            ? `You have used ${gate.currentCount} of ${gate.limit}.`
            : null,
          "Upgrade now to unlock more invoices and premium automation.",
        ]
          .filter(Boolean)
          .join(" ");
        setQuotaError(composed);
        setCurrentPlan(gate.currentPlan || currentPlan);
        setUpgradeUrl(gate.upgradeUrl || "/dashboard/upgrade");
        setShowUpgradeModal(true);
        return;
      }

      if (gate?.message) {
        setError(gate.message);
        return;
      }

      const errorData = (submitError as { response?: { data?: { detail?: unknown } } })?.response?.data;
      if (typeof errorData?.detail === "string") {
        setError(errorData.detail);
        return;
      }

      setError("Unable to record this sale. Please try again.");
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <h2 className="text-[22px] font-semibold text-brand-text">
          Record a walk-in sale
        </h2>
        <p className="text-sm text-brand-textMuted">
          For an in-person sale that&apos;s already paid — no customer details
          needed. It&apos;s recorded and marked paid immediately.
        </p>
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label htmlFor="quick-sale-amount" className="text-sm font-medium text-brand-text">
          Amount (₦)
        </label>
        <input
          id="quick-sale-amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 2000"
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="quick-sale-description" className="text-sm font-medium text-brand-text">
          What was sold{" "}
          <span className="text-xs font-normal text-brand-textMuted">(optional)</span>
        </label>
        <input
          id="quick-sale-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Bag of rice"
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>

      {/* Payment method */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-brand-text">How was it paid?</label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setPaymentMethod(m.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                paymentMethod === m.value
                  ? "border-brand-jade bg-brand-jade text-white shadow-sm"
                  : "border-brand-border bg-white text-brand-text hover:border-brand-jade/40"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional customer name */}
      {showCustomerName ? (
        <div className="space-y-1">
          <label htmlFor="quick-sale-customer" className="text-sm font-medium text-brand-text">
            Customer name{" "}
            <span className="text-xs font-normal text-brand-textMuted">(optional)</span>
          </label>
          <input
            id="quick-sale-customer"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. regular customer's name"
            className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomerName(true)}
          className="self-start text-xs font-medium text-brand-jade underline underline-offset-2 hover:text-brand-jadeHover"
        >
          + Add a customer name (optional)
        </button>
      )}

      <Button
        type="submit"
        disabled={mutation.isPending || quotaLoading || (quota && !quota.can_create)}
        className="w-full sm:w-fit"
      >
        {mutation.isPending
          ? "Recording..."
          : quota && !quota.can_create
          ? "Limit Reached"
          : "Record sale as paid"}
      </Button>

      {quota && (
        <p className="text-xs text-brand-textMuted">
          {quota.invoice_balance} invoice{quota.invoice_balance === 1 ? "" : "s"} remaining
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {quotaError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">⚠️ Invoice Limit Reached</p>
          <p className="mt-1 whitespace-pre-line text-sm text-amber-800">{quotaError}</p>
          <div className="mt-3 flex flex-col flex-wrap gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              View Plans
            </Button>
            {upgradeUrl && (
              <a
                href={upgradeUrl}
                className="inline-flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-amber-700 sm:w-auto"
              >
                Upgrade Now
              </a>
            )}
          </div>
        </div>
      )}

      {successAmount && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✅ ₦{successAmount} recorded and marked paid.
        </p>
      )}

      <PlanSelectionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={currentPlan}
      />
    </form>
  );
}
