import Link from "next/link";
import { ChevronRight, CreditCard, Clock, Check, Wallet, ShoppingBag } from "lucide-react";

export default function PlansArticle() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Pricing & Wallet</span>
        </nav>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              <CreditCard className="h-3 w-3" />
              Billing
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              4 min read
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Pricing & Your Invoice Wallet
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Every feature is <strong>free</strong>. Fees as low as <strong>0.5% per invoice</strong> —
            no plans, no monthly fees.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          {/* Manual invoices */}
          <div className="rounded-xl border-2 border-emerald-500 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900">Manual invoices</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-slate-900">0.5%</span>
              <span className="text-slate-500 ml-2">per invoice</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Charged from your prepaid wallet at creation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Minimum ₦100, capped ₦400 under ₦500,000 (uncapped 0.5% above)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Confirm payment your own way</span>
              </li>
            </ul>
          </div>

          {/* Storefront / online payments */}
          <div className="rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-5 w-5 text-slate-600" />
              <h3 className="font-bold text-slate-900">Storefront orders</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-slate-900">3%</span>
              <span className="text-slate-500 ml-2">when paid</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Customers pay online by card or transfer</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Settles to your bank via Paystack</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Nothing charged upfront</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Free callout */}
        <div className="mb-10 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6">
          <h3 className="font-bold text-slate-900 mb-1">
            No subscriptions. No feature tiers.
          </h3>
          <p className="text-sm text-slate-600">
            Custom branding, tax reports, inventory, team access, insights,
            commerce intelligence and your storefront are included for everyone.
            You pay transaction-based fees when you invoice or receive a storefront order.
          </p>
        </div>

        {/* Article Content */}
        <article className="prose prose-slate prose-emerald max-w-none">
          <h2>Your invoice wallet</h2>
          <p>
            Manual invoices are funded by a prepaid wallet. Each manual invoice costs just 0.5%
            (minimum ₦100, capped at ₦400 for invoices under ₦500,000 — uncapped 0.5% above), deducted when you create the invoice. New
            accounts start with a small free balance so you can send your first invoices at no cost.
          </p>
          <ul>
            <li>Top up anytime: <strong>₦1,250</strong>, <strong>₦5,000</strong> or <strong>₦20,000</strong></li>
            <li>Your wallet balance never expires</li>
            <li>Storefront/online payments don&apos;t need the wallet — the 3% is taken from each payment</li>
          </ul>

          <h2>How to top up</h2>
          <ol>
            <li>Go to <strong>Dashboard → Settings → Billing</strong></li>
            <li>Choose a top-up amount (₦1,250 / ₦5,000 / ₦20,000)</li>
            <li>Complete payment via Paystack (a small processing fee is added at checkout)</li>
            <li>Your wallet is credited immediately</li>
          </ol>

          <h2>Pricing FAQ</h2>

          <h3>When am I charged?</h3>
          <p>
            For manual invoices, the 0.5% fee is taken from your wallet the moment you create the
            invoice. For storefront/online payments, the 3% is taken from the customer&apos;s payment
            when they pay — nothing upfront.
          </p>

          <h3>Are there any plans or monthly fees?</h3>
          <p>
            No. There are no subscriptions, tiers or monthly fees. Every feature is included for
            everyone; you only pay 0.5% when you invoice (3% on storefront orders paid online).
          </p>

          <h3>What happens if my wallet runs out?</h3>
          <p>
            You can still receive storefront/online payments (the 3% is taken from each payment). To
            keep creating manual invoices, top up your wallet. Your data and history are always
            preserved.
          </p>

          <h3>Are there other fees?</h3>
          <p>
            Just 0.5% per manual invoice (3% on storefront orders). For storefront/online card and
            transfer payments, a small payment-processing fee from the payment provider may also apply.
          </p>
        </article>

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to get started?</h3>
          <p className="text-slate-600 mb-4">
            Access the full toolkit with no monthly subscription. Pay transaction-based fees when you transact.
          </p>
          <a
            href="https://suoops.com/dashboard/settings"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Open Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
