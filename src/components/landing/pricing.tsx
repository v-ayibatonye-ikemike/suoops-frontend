"use client";

import Link from "next/link";
import { Receipt, Store } from "lucide-react";
import { FREE_PLAN, FEE_TAGLINE_SHORT } from "../../constants/pricing";
import { useRegisterHref } from "@/hooks/use-tracking-params";

export function Pricing() {
  const registerHref = useRegisterHref();
  return (
    <section id="pricing" className="bg-brand-mint px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-brand-evergreen sm:text-4xl">
            {FEE_TAGLINE_SHORT}.
          </h2>
          <p className="mt-4 text-lg text-brand-charcoal/70 max-w-2xl mx-auto">
            No plans. No monthly fees. Every feature is free — Suoops takes just
            <strong> 0.5% when you invoice</strong> (min ₦100, capped ₦400 under ₦500,000),
            and 3% only on storefront orders paid online.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {/* Storefront */}
          <div className="rounded-2xl bg-white p-6 border border-brand-teal/10 shadow-sm">
            <Store className="mb-2 h-8 w-8 text-brand-jade" />
            <h3 className="text-lg font-bold text-brand-evergreen">Storefront orders</h3>
            <p className="mt-2 text-sm text-brand-charcoal/70">
              Share your store link. Customers order, pay online, and pick a
              courier for delivery — held under buyer protection until it arrives.
            </p>
            <p className="mt-4 text-3xl font-bold text-brand-evergreen">3%</p>
            <p className="text-sm text-brand-charcoal/50">
              taken only when the customer pays (capped at ₦2,000 for orders up to ₦500,000). Nothing upfront.
            </p>
          </div>

          {/* Manual invoices */}
          <div className="rounded-2xl bg-white p-6 border-2 border-brand-jade shadow-sm">
            <Receipt className="mb-2 h-8 w-8 text-brand-jade" />
            <h3 className="text-lg font-bold text-brand-evergreen">Manual invoices</h3>
            <p className="mt-2 text-sm text-brand-charcoal/70">
              Create and send invoices yourself, confirm payment your way.
            </p>
            <p className="mt-4 text-3xl font-bold text-brand-evergreen">0.5%</p>
            <p className="text-sm text-brand-charcoal/50">
              Min ₦100, capped ₦400 under ₦500k (uncapped 0.5% above), from your prepaid wallet.
            </p>
          </div>
        </div>

        {/* Free callout */}
        <div className="mt-10 max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-brand-evergreen to-brand-jade p-6 text-center shadow-lg">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-bold text-white">All features, free.</h3>
          <p className="mt-2 text-brand-mint">
            Custom branding, inventory, team, tax reports, insights, governed AI,
            storefront, courier delivery &amp; buyer protection — included for
            everyone. You only pay when you transact.
          </p>
          <Link
            href={registerHref}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-citrus px-6 py-3 text-base font-semibold text-brand-evergreen shadow-lg transition-all hover:bg-white hover:scale-105"
          >
            Start free →
          </Link>
        </div>

        {/* Feature list */}
        <ul className="mt-10 grid gap-2 sm:grid-cols-2 max-w-3xl mx-auto text-sm text-brand-charcoal/70">
          {FREE_PLAN.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <svg className="h-5 w-5 text-brand-jade flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Closing reassurance */}
        <p className="mt-12 text-center text-lg font-semibold text-brand-charcoal/80">
          👉 No forced banking. No accounting setup. No hidden stress.
        </p>
        <p className="mt-2 text-center text-xs text-brand-charcoal/40">
          A small payment-processing fee applies to online payments. Courier
          prices are quoted separately based on route and availability.
        </p>
      </div>
    </section>
  );
}
