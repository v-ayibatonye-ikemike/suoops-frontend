import Link from "next/link";
import { ChevronRight, FileText, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

export default function TrackPaymentsArticle() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles/invoicing" className="hover:text-emerald-600">Invoicing</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Track Payments</span>
        </nav>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
              <FileText className="h-3 w-3" />
              Invoicing
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              4 min read
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Track Payments and Follow Up Easily
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Never lose track of who owes you money. Suoops helps you monitor payments and follow up automatically.
          </p>
        </div>

        {/* Key Benefit */}
        <div className="mb-8 rounded-xl bg-emerald-50 border border-emerald-200 p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-emerald-900 mb-1">Get Paid Faster</h3>
              <p className="text-sm text-emerald-800">
                Studies show that businesses who actively track and follow up on invoices get paid 
                30% faster. Suoops makes this effortless.
              </p>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="prose prose-slate prose-emerald max-w-none">
          <h2>How Payment Tracking Works</h2>
          <p>
            Every invoice you create in Suoops is automatically tracked. You can see at a glance:
          </p>
          <ul>
            <li><strong>Who has paid</strong> - Invoices marked as &quot;Paid&quot;</li>
            <li><strong>Who owes you</strong> - Invoices marked as &quot;Pending&quot;</li>
            <li><strong>Overdue invoices</strong> - Past the due date and still unpaid</li>
            <li><strong>Total outstanding</strong> - How much money is owed to you</li>
          </ul>

          <h2>Check Payment Status</h2>
          
          <h3>From Your Dashboard</h3>
          <p>
            Your dashboard shows a quick overview of all your money:
          </p>
          <ol>
            <li>Go to your dashboard at <strong>app.suoops.com</strong></li>
            <li>See the <strong>&quot;Money Owed to You&quot;</strong> card at the top</li>
            <li>Click <strong>&quot;View Invoices&quot;</strong> to see all pending payments</li>
          </ol>

          <h3>From the Invoices Page</h3>
          <ol>
            <li>Click <strong>&quot;Invoices&quot;</strong> in the sidebar</li>
            <li>Use filters to see:
              <ul>
                <li><strong>Pending</strong> - Still waiting for payment</li>
                <li><strong>Paid</strong> - Already received</li>
                <li><strong>Overdue</strong> - Past the due date</li>
              </ul>
            </li>
            <li>Click any invoice to see full details</li>
          </ol>

          <h2>Mark an Invoice as Paid</h2>
          <p>
            When a customer pays you (via bank transfer, cash, etc.), update the invoice:
          </p>
          <ol>
            <li>Open the invoice from your invoices list</li>
            <li>Click <strong>&quot;Mark as Paid&quot;</strong> button</li>
            <li>Enter the payment date (defaults to today)</li>
            <li>Click <strong>&quot;Confirm Payment&quot;</strong></li>
          </ol>

          <div className="not-prose my-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Tip: Record Payment Immediately
                </p>
                <p className="text-sm text-blue-800">
                  As soon as you receive payment, mark the invoice as paid. This keeps your 
                  records accurate and helps with tax reporting later.
                </p>
              </div>
            </div>
          </div>

          <h2>Follow Up on Overdue Payments</h2>
          <p>
            Suoops makes it easy to follow up professionally without being awkward:
          </p>

          <h3>1. Automatic Reminders (Coming Soon)</h3>
          <p>
            Suoops can send gentle WhatsApp reminders to customers automatically:
          </p>
          <ul>
            <li>3 days before due date: Friendly reminder</li>
            <li>On due date: Payment due today</li>
            <li>3 days after: Polite follow-up</li>
          </ul>

          <h3>2. Manual Follow-Up</h3>
          <p>
            For now, you can follow up manually:
          </p>
          <ol>
            <li>Go to <strong>Invoices</strong> → Filter by <strong>&quot;Overdue&quot;</strong></li>
            <li>Click the invoice to open it</li>
            <li>Click <strong>&quot;Send Reminder&quot;</strong></li>
            <li>Customer gets a WhatsApp message with payment details</li>
          </ol>

          <h3>3. View Payment History</h3>
          <p>
            See when you sent the invoice and when reminders were sent:
          </p>
          <ul>
            <li>Open any invoice</li>
            <li>Scroll to <strong>&quot;Activity&quot;</strong> section</li>
            <li>See timeline of all actions (sent, viewed, reminded, paid)</li>
          </ul>

          <h2>Understanding Invoice Statuses</h2>
          
          <div className="not-prose space-y-3 my-6">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Draft</p>
                  <p className="text-xs text-slate-600">
                    Invoice created but not sent yet. Customer doesn&apos;t know about it.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Pending</p>
                  <p className="text-xs text-slate-600">
                    Invoice sent to customer. Waiting for payment.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="h-4 w-4 text-red-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Overdue</p>
                  <p className="text-xs text-slate-600">
                    Past the due date and still unpaid. Time to follow up.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Paid</p>
                  <p className="text-xs text-slate-600">
                    Payment received. Invoice is closed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h2>Tips for Getting Paid Faster</h2>
          
          <h3>1. Set Clear Due Dates</h3>
          <p>
            Always include a due date on your invoices. Customers with deadlines pay 40% faster 
            than those without.
          </p>

          <h3>2. Add Payment Instructions</h3>
          <p>
            Make sure your <Link href="/articles/getting-started/bank-details">bank details are set up</Link> so 
            customers know exactly where to send money.
          </p>

          <h3>3. Send Invoices Immediately</h3>
          <p>
            Don&apos;t wait! The faster you invoice, the faster you get paid. Use the{" "}
            <Link href="/articles/whatsapp/text-commands">WhatsApp text commands</Link> to invoice 
            right after completing the job.
          </p>

          <h3>4. Follow Up Politely</h3>
          <p>
            If an invoice is overdue, don&apos;t be afraid to send a reminder. Most customers just forget — 
            they&apos;re not avoiding payment.
          </p>

          <h3>5. Check Your Dashboard Daily</h3>
          <p>
            Spend 2 minutes each morning checking your dashboard. Look at:
          </p>
          <ul>
            <li>Total money owed to you</li>
            <li>Any overdue invoices that need follow-up</li>
            <li>Payments received yesterday</li>
          </ul>

          <h2>Export Payment Reports</h2>
          <p>
            Need to see all your payments for tax or accounting?
          </p>
          <ol>
            <li>Go to <strong>Reports</strong> in the sidebar</li>
            <li>Select <strong>&quot;Payment Report&quot;</strong></li>
            <li>Choose date range (this month, this year, etc.)</li>
            <li>Click <strong>&quot;Export to PDF&quot;</strong> or <strong>&quot;Download CSV&quot;</strong></li>
          </ol>
          <p>
            This gives you a clean record of all payments received for your bookkeeping.
          </p>

          <h2>Common Questions</h2>
          
          <h3>What if a customer says they already paid?</h3>
          <p>
            Ask them to send proof of payment (bank receipt or screenshot). Once confirmed, 
            mark the invoice as paid and note the payment date.
          </p>

          <h3>Can I see how much each customer owes me?</h3>
          <p>
            Yes! Go to <strong>Customers</strong> in the sidebar. Each customer card shows their 
            total outstanding balance.
          </p>

          <h3>What if an invoice will never be paid?</h3>
          <p>
            You can mark it as <strong>&quot;Cancelled&quot;</strong> or <strong>&quot;Write-off&quot;</strong>. 
            This removes it from your pending invoices without marking it as paid.
          </p>

          <h3>How do I know if a customer viewed the invoice?</h3>
          <p>
            When you send an invoice via WhatsApp, you&apos;ll see in the Activity section when they 
            opened the link. This helps you know if they&apos;ve actually seen it.
          </p>
        </article>

        {/* Next Steps */}
        <div className="mt-12 rounded-xl bg-slate-50 border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Related Articles</h3>
          <div className="space-y-3">
            <Link 
              href="/articles/getting-started/first-invoice"
              className="flex items-center gap-3 text-sm text-emerald-600 hover:underline"
            >
              <ChevronRight className="h-4 w-4" />
              Create your first invoice
            </Link>
            <Link 
              href="/articles/getting-started/bank-details"
              className="flex items-center gap-3 text-sm text-emerald-600 hover:underline"
            >
              <ChevronRight className="h-4 w-4" />
              Add bank details for payments
            </Link>
            <Link 
              href="/articles/whatsapp/text-commands"
              className="flex items-center gap-3 text-sm text-emerald-600 hover:underline"
            >
              <ChevronRight className="h-4 w-4" />
              Invoice by texting on WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
