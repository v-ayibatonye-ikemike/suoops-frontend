import Link from "next/link";
import { ChevronRight, Shield, Clock, AlertTriangle } from "lucide-react";

export default function DeleteAccountArticle() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles/account" className="hover:text-emerald-600">Account</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Delete Account</span>
        </nav>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              <Shield className="h-3 w-3" />
              Account & Security
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              2 min read
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            How to Delete Your Account
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Learn how to permanently delete your SuoOps account and all associated data.
          </p>
        </div>

        {/* Warning */}
        <div className="mb-8 rounded-xl border-2 border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Warning: This action is permanent</h3>
              <p className="mt-1 text-sm text-red-700">
                Deleting your account will permanently remove all your data, including invoices, 
                customer records, and business information. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="prose prose-slate prose-emerald max-w-none">
          <h2>What Gets Deleted</h2>
          <p>
            When you delete your SuoOps account, the following data is permanently removed:
          </p>
          <ul>
            <li>Your account profile and login credentials</li>
            <li>All invoices you have created</li>
            <li>Customer records and contacts</li>
            <li>Inventory and product data</li>
            <li>Bank account details</li>
            <li>Business logo and branding</li>
            <li>Your wallet balance and payment history</li>
          </ul>

          <h2>How to Delete Your Account</h2>
          
          <h3>Step 1: Go to Settings</h3>
          <p>
            Log in to your SuoOps account and navigate to <strong>Settings</strong> from the dashboard menu.
          </p>

          <h3>Step 2: Scroll to Danger Zone</h3>
          <p>
            At the bottom of the Settings page, you&apos;ll find the <strong>&quot;Danger Zone&quot;</strong> section 
            with a red border.
          </p>

          <h3>Step 3: Click Delete Account</h3>
          <p>
            Click the <strong>&quot;Delete Account&quot;</strong> button. A confirmation dialog will appear.
          </p>

          <h3>Step 4: Confirm Deletion</h3>
          <p>
            To confirm you want to delete your account, you must type:
          </p>
          <pre className="bg-slate-100 text-red-600 font-mono">DELETE MY ACCOUNT</pre>
          <p>
            This exact phrase is required to prevent accidental deletions.
          </p>

          <h3>Step 5: Account Deleted</h3>
          <p>
            Once confirmed, your account and all data will be immediately and permanently deleted. 
            You will be logged out and redirected to the home page.
          </p>

          <h2>Before You Delete</h2>
          <p>
            Consider these alternatives before deleting your account:
          </p>
          <ul>
            <li><strong>Download your data</strong> - Export your invoices as PDFs before deleting</li>
            <li><strong>Pause activity</strong> - There are no plans or monthly fees while you are not transacting</li>
            <li><strong>Contact support</strong> - We may be able to help resolve any issues</li>
          </ul>

          <h2>Frequently Asked Questions</h2>
          
          <h3>Can I recover my account after deletion?</h3>
          <p>
            No. Account deletion is permanent and cannot be reversed. All data is permanently 
            removed from our servers.
          </p>

          <h3>What happens to my wallet balance?</h3>
          <p>
            Contact support before deletion if you have a remaining prepaid
            wallet balance or an unsettled storefront order.
          </p>

          <h3>Can someone else delete my account?</h3>
          <p>
            Only you can delete your own account. The deletion requires you to be logged in and 
            type the confirmation phrase.
          </p>

          <h2>Need Help?</h2>
          <p>
            If you&apos;re having issues with your account or considering deletion due to a problem, 
            please <Link href="/contact">contact our support team</Link> first. We&apos;re here to help!
          </p>
        </article>

        {/* Related Articles */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Related Articles</h3>
          <div className="space-y-3">
            <Link href="/articles/account/data-privacy" className="block text-sm text-emerald-600 hover:underline">
              → Data privacy and GDPR
            </Link>
            <Link href="/articles/billing/plans" className="block text-sm text-emerald-600 hover:underline">
              → Pricing and your invoice wallet
            </Link>
            <Link href="/contact" className="block text-sm text-emerald-600 hover:underline">
              → Contact support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
