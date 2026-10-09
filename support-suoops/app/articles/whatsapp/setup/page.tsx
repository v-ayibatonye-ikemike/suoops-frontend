import Link from "next/link";
import { ChevronRight, MessageCircle, Clock, CheckCircle } from "lucide-react";

export default function WhatsAppSetupArticle() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles/whatsapp" className="hover:text-emerald-600">WhatsApp</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Setup Guide</span>
        </nav>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <MessageCircle className="h-3 w-3" />
              WhatsApp Integration
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              3 min read
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Setting Up WhatsApp for SuoOps
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Connect your WhatsApp number to receive payment updates and create invoices via chat.
          </p>
        </div>

        {/* Feature Highlight */}
        <div className="mb-8 rounded-xl bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 p-6">
          <h3 className="font-semibold text-green-900 mb-3">📱 What You Can Do with WhatsApp:</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Create invoices by texting</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Receive payment updates</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Log in with OTP via WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Send invoices to customers</span>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="prose prose-slate prose-emerald max-w-none">
          <h2>Prerequisites</h2>
          <p>
            Before connecting WhatsApp, make sure you have:
          </p>
          <ul>
            <li>An active SuoOps account</li>
            <li>WhatsApp installed on your phone</li>
            <li>A valid phone number linked to WhatsApp</li>
          </ul>

          <h2>How to Connect Your WhatsApp Number</h2>
          
          <h3>Step 1: Go to Settings</h3>
          <p>
            Log in to SuoOps and navigate to <strong>Settings</strong> from your dashboard.
          </p>

          <h3>Step 2: Find the WhatsApp Section</h3>
          <p>
            Scroll down to the <strong>WhatsApp</strong> section. This is where you&apos;ll verify your phone number.
          </p>

          <h3>Step 3: Enter Your Phone Number</h3>
          <p>
            Enter your WhatsApp phone number with the country code.
          </p>
          <div className="not-prose my-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> Include your country code. For Nigeria, use format: 
              <code className="ml-1 bg-amber-100 px-1 rounded-sm">+234XXXXXXXXXX</code>
            </p>
          </div>

          <h3>Step 4: Verify with OTP</h3>
          <p>
            After entering your number, click <strong>Send OTP</strong>. You&apos;ll receive a 6-digit 
            code via WhatsApp. Enter this code to verify your number.
          </p>

          <h3>Step 5: Done!</h3>
          <p>
            Once verified, your WhatsApp number is connected. You can now:
          </p>
          <ul>
            <li>Log in to SuoOps using WhatsApp OTP</li>
            <li>Receive payment updates on WhatsApp</li>
            <li>Use the SuoOps WhatsApp bot to create invoices</li>
          </ul>

          <h2>Using the SuoOps WhatsApp Bot</h2>
          <p>
            After connecting your number, you can message our WhatsApp bot to create invoices:
          </p>
          <ol>
            <li>Open WhatsApp and message <strong>+234 810 686 5807</strong></li>
            <li>Send a message like: <code>Invoice John ₦50,000 for website design</code></li>
            <li>The bot creates your invoice instantly</li>
            <li>You get a link to view, edit, or send it to your customer</li>
          </ol>

          <h2>Changing Your WhatsApp Number</h2>
          <p>
            If you need to update your WhatsApp number:
          </p>
          <ol>
            <li>Go to <strong>Settings</strong></li>
            <li>In the WhatsApp section, click <strong>Change Number</strong></li>
            <li>Enter your new number and verify with OTP</li>
          </ol>

          <h2>Removing Your WhatsApp Number</h2>
          <p>
            To disconnect WhatsApp from your account:
          </p>
          <ol>
            <li>Go to <strong>Settings</strong></li>
            <li>In the WhatsApp section, click <strong>Remove</strong></li>
            <li>Confirm the removal</li>
          </ol>
          <p>
            You can still use SuoOps via the web dashboard without a connected WhatsApp number.
          </p>

          <h2>Troubleshooting</h2>
          
          <h3>Not receiving the OTP?</h3>
          <ul>
            <li>Check that you entered your number with the country code (+234 for Nigeria)</li>
            <li>Make sure WhatsApp is active on your phone</li>
            <li>Check if you&apos;ve blocked the SuoOps number</li>
            <li>Wait a minute and request a new OTP</li>
          </ul>

          <h3>Changed phone number?</h3>
          <p>
            Go to Settings → WhatsApp and click &quot;Change Number&quot; to verify your new number.
          </p>

          <h2>Data Privacy</h2>
          <p>
            Your privacy is important to us:
          </p>
          <ul>
            <li>We only send business-related messages</li>
            <li>Your number is never shared with third parties</li>
            <li>Messages are sent via secure WhatsApp channels</li>
          </ul>
        </article>

        {/* Related Articles */}
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Related Articles</h3>
          <div className="space-y-3">
            <Link href="/articles/whatsapp/text-commands" className="block text-sm text-emerald-600 hover:underline">
              → Creating invoices by texting
            </Link>
            <Link href="/articles/getting-started/first-invoice" className="block text-sm text-emerald-600 hover:underline">
              → Creating your first invoice
            </Link>
            <Link href="/articles/getting-started/bank-details" className="block text-sm text-emerald-600 hover:underline">
              → Adding bank details for payments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
