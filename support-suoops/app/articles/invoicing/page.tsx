import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

const articles: { slug: string; title: string; description: string }[] = [
  // Add articles here as they are created
];

export default function InvoicingPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Invoicing</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Invoicing</h1>
              <p className="text-slate-600">Create and manage invoices</p>
            </div>
          </div>
        </div>

        {/* Articles List */}
        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/invoicing/${article.slug}`}
                className="block rounded-xl border border-slate-200 bg-white p-6 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <FileText className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{article.title}</h3>
                    <p className="text-sm text-slate-600">{article.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 ml-auto shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Articles coming soon</h3>
            <p className="text-slate-600 mb-4">
              We&apos;re working on detailed guides for invoicing. Check back soon!
            </p>
            <p className="text-sm text-slate-500">
              In the meantime, see our <Link href="/articles/getting-started/first-invoice" className="text-emerald-600 hover:underline">Getting Started guide</Link> for invoice basics.
            </p>
          </div>
        )}

        {/* Help CTA */}
        <div className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
          <p className="text-slate-600 mb-3">Have questions about invoicing?</p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
