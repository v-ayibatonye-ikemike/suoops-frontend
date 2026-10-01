import { ArrowRight, CheckCircle2, Circle, Store } from "lucide-react";
import Link from "next/link";

export interface StorefrontSetupState {
  storeEnabled: boolean;
  hasLogo: boolean;
  detailsComplete: boolean;
  hasListableProduct: boolean;
  hasBankDetails: boolean;
  paymentsEnabled: boolean;
}

interface StorefrontSetupGuideProps extends StorefrontSetupState {
  storeLink: string | null;
  enablingStore: boolean;
  enablingPayments: boolean;
  onEnableStore: () => void;
  onEnablePayments: () => void;
}

export const STOREFRONT_SETUP_STEPS = [
  {
    id: "enable",
    title: "Create your storefront",
    description: "This creates your public shop link. You can finish it before sharing.",
  },
  {
    id: "brand",
    title: "Add your business logo",
    description: "Your logo appears on your store and invoices, helping customers recognise and trust your business.",
  },
  {
    id: "details",
    title: "Tell customers about your store",
    description: "Add what you sell, your location, and opening hours so shoppers can find and trust you.",
  },
  {
    id: "product",
    title: "Add something customers can buy",
    description: "Each storefront item needs a price, description, and photo before customers can see it.",
  },
  {
    id: "bank",
    title: "Add your settlement account",
    description: "We verify your bank details so storefront sales can be paid to you securely.",
  },
  {
    id: "payments",
    title: "Turn on online payments",
    description: "Customers can pay during checkout and their orders are confirmed automatically.",
  },
] as const;

export function getStorefrontSetupCompletion(state: StorefrontSetupState): boolean[] {
  return [
    state.storeEnabled,
    state.hasLogo,
    state.detailsComplete,
    state.hasListableProduct,
    state.hasBankDetails,
    state.paymentsEnabled,
  ];
}

export function StorefrontSetupGuide({
  storeEnabled,
  hasLogo,
  detailsComplete,
  hasListableProduct,
  hasBankDetails,
  paymentsEnabled,
  storeLink,
  enablingStore,
  enablingPayments,
  onEnableStore,
  onEnablePayments,
}: StorefrontSetupGuideProps) {
  const completion = getStorefrontSetupCompletion({
    storeEnabled,
    hasLogo,
    detailsComplete,
    hasListableProduct,
    hasBankDetails,
    paymentsEnabled,
  });
  const completedCount = completion.filter(Boolean).length;
  const nextIndex = completion.findIndex((done) => !done);
  const ready = nextIndex === -1;

  const actionFor = (index: number) => {
    if (completion[index]) return null;

    if (index === 0) {
      return (
        <button
          type="button"
          onClick={onEnableStore}
          disabled={enablingStore}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover disabled:opacity-60"
        >
          {enablingStore ? "Creating…" : "Create storefront"}
          <ArrowRight className="h-3 w-3" />
        </button>
      );
    }

    if (index === 1) {
      return (
        <a href="#logo" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover">
          Upload business logo <ArrowRight className="h-3 w-3" />
        </a>
      );
    }

    if (index === 2) {
      return (
        <a href="#storefront-details" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover">
          Complete store details <ArrowRight className="h-3 w-3" />
        </a>
      );
    }

    if (index === 3) {
      return (
        <Link href="/dashboard/inventory?create=1" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover">
          Add a product or service <ArrowRight className="h-3 w-3" />
        </Link>
      );
    }

    if (index === 4) {
      return (
        <a href="#bank-details" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover">
          Add bank details <ArrowRight className="h-3 w-3" />
        </a>
      );
    }

    if (!hasBankDetails) {
      return (
        <a href="#bank-details" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover">
          Add bank details first <ArrowRight className="h-3 w-3" />
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={onEnablePayments}
        disabled={enablingPayments}
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-jadeText hover:text-brand-jadeHover disabled:opacity-60"
      >
        {enablingPayments ? "Turning on…" : "Turn on online payments"}
        <ArrowRight className="h-3 w-3" />
      </button>
    );
  };

  return (
    <section aria-labelledby="storefront-setup-title" className="mt-4 border-y border-brand-border/70 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="storefront-setup-title" className="text-sm font-semibold text-brand-text">
            Finish your storefront
          </p>
          <p className="mt-0.5 text-xs text-brand-textMuted">
            Complete these in any order. Every unfinished step links to where you can finish it.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-brand-jadeText">
          {completedCount}/{STOREFRONT_SETUP_STEPS.length} complete
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-jade transition-all"
          style={{ width: `${(completedCount / STOREFRONT_SETUP_STEPS.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 space-y-1">
        {STOREFRONT_SETUP_STEPS.map((step, index) => {
          const done = completion[index];
          const current = index === nextIndex;
          return (
            <li
              key={step.id}
              className={`flex gap-3 rounded-r-lg px-2 py-2.5 ${current ? "border-l-2 border-brand-jade bg-emerald-50/60" : "border-l-2 border-transparent"}`}
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${current ? "text-brand-jade" : "text-slate-300"}`} />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${done ? "text-emerald-700" : "text-brand-text"}`}>
                  {step.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-brand-textMuted">
                  {step.description}
                </p>
                {actionFor(index)}
              </div>
            </li>
          );
        })}
      </ol>

      {ready && storeLink ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-emerald-50 px-3 py-3">
          <div className="flex items-start gap-2">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Your storefront is ready to share</p>
              <p className="text-[11px] text-emerald-700">Open it once as a customer, then share the link anywhere you sell.</p>
            </div>
          </div>
          <a href={storeLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline">
            Preview store <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      ) : null}
    </section>
  );
}