"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileText,
  Landmark,
  Store,
} from "lucide-react";
import Link from "next/link";

import { apiClient } from "@/api/client";
import { useNewInvoiceDrawer } from "./new-invoice-provider";

export interface ActivationState {
  business_profile_ready: boolean;
  bank_details_ready: boolean;
  storefront_enabled: boolean;
  storefront_profile_ready: boolean;
  product_count: number;
  online_payments_enabled: boolean;
  invoice_count: number;
  paid_invoice_count: number;
  progress_percent: number;
}

export type ActivationAction = {
  id: "business" | "bank" | "invoice" | "payments" | "payment" | "storefront";
  label: string;
  description: string;
  href?: string;
  opensInvoiceDrawer?: boolean;
};

export function isStorefrontReady(state: ActivationState): boolean {
  return (
    state.storefront_enabled &&
    state.storefront_profile_ready &&
    state.product_count > 0
  );
}

/** Core activation is prioritised; the storefront remains a growth recommendation. */
export function getNextActivationAction(
  state: ActivationState,
): ActivationAction | null {
  if (!state.business_profile_ready) {
    return {
      id: "business",
      label: "Complete business profile",
      description: "Add the details customers see on your invoices.",
      href: "/dashboard/settings#profile",
    };
  }
  if (!state.bank_details_ready) {
    return {
      id: "bank",
      label: "Add payout details",
      description: "Required before SuoOps can send payouts to your bank.",
      href: "/dashboard/settings#bank-details",
    };
  }
  if (state.invoice_count === 0) {
    return {
      id: "invoice",
      label: "Create your first invoice",
      description: "Send a professional invoice from the web in a few steps.",
      opensInvoiceDrawer: true,
    };
  }
  if (!state.online_payments_enabled) {
    return {
      id: "payments",
      label: "Enable online payments",
      description: "Let customers pay online and confirm payments automatically.",
      href: "/dashboard/settings#online-payments",
    };
  }
  if (state.paid_invoice_count === 0) {
    return {
      id: "payment",
      label: "Collect your first payment",
      description: "Share an invoice and track it until payment is confirmed.",
      href: "/dashboard/invoices",
    };
  }
  if (!isStorefrontReady(state)) {
    return {
      id: "storefront",
      label: "Grow with a storefront",
      description: "Recommended: publish your shop and add a product customers can buy.",
      href:
        state.storefront_enabled && state.storefront_profile_ready
          ? "/dashboard/inventory"
          : "/dashboard/settings#storefront",
    };
  }
  return null;
}

function ActivationLink({
  action,
  onCreateInvoice,
}: {
  action: ActivationAction;
  onCreateInvoice: () => void;
}) {
  const className =
    "inline-flex items-center gap-2 rounded-lg bg-brand-jade px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-jadeHover";
  if (action.opensInvoiceDrawer) {
    return (
      <button type="button" className={className} onClick={onCreateInvoice}>
        {action.label}
        <ArrowRight className="h-4 w-4" />
      </button>
    );
  }
  return (
    <Link href={action.href ?? "/dashboard"} className={className}>
      {action.label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function ActivationJourney() {
  const [expanded, setExpanded] = useState(false);
  const newInvoice = useNewInvoiceDrawer();
  const { data: state, isLoading } = useQuery<ActivationState>({
    queryKey: ["activationState"],
    queryFn: async () => {
      const response = await apiClient.get<ActivationState>(
        "/users/me/activation-state",
      );
      return response.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading || !state) return null;

  const next = getNextActivationAction(state);
  if (!next) return null;

  const steps = [
    {
      id: "business",
      label: "Complete business profile",
      done: state.business_profile_ready,
      icon: FileText,
    },
    {
      id: "bank",
      label: "Add payout / bank details",
      done: state.bank_details_ready,
      icon: Landmark,
    },
    {
      id: "invoice",
      label: "Create first invoice",
      done: state.invoice_count > 0,
      icon: FileText,
    },
    {
      id: "storefront",
      label: "Publish storefront and add products",
      note: "Recommended growth step",
      done: isStorefrontReady(state),
      icon: Store,
    },
    {
      id: "payments",
      label: "Enable online payments",
      done: state.online_payments_enabled,
      icon: Landmark,
    },
    {
      id: "payment",
      label: "Collect first payment",
      done: state.paid_invoice_count > 0,
      icon: CheckCircle2,
    },
  ];
  const progress = Math.max(0, Math.min(100, state.progress_percent));

  return (
    <section
      aria-labelledby="activation-title"
      className="mb-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-jadeText">
            Your next step
          </p>
          <h2 id="activation-title" className="mt-1 text-lg font-bold text-brand-text">
            {next.label}
          </h2>
          <p className="mt-1 text-sm text-brand-textMuted">{next.description}</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-brand-jadeText">
          {progress}%
        </span>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-label="Activation progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-jade transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ActivationLink action={next} onCreateInvoice={newInvoice.open} />
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 px-1 py-2 text-sm font-semibold text-brand-jadeText hover:text-brand-jadeHover"
        >
          {expanded ? "Hide checklist" : "View checklist"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {expanded && (
        <ul className="mt-4 grid gap-2 border-t border-brand-border pt-4 sm:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id} className="flex items-start gap-2.5 text-sm">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                )}
                <span className={step.done ? "text-slate-500 line-through" : "text-brand-text"}>
                  <span className="inline-flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5" />
                    {step.label}
                  </span>
                  {step.note && (
                    <span className="block text-xs font-normal text-brand-textMuted">
                      {step.note}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
