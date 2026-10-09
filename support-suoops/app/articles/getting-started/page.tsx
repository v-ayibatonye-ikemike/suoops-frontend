import Link from "next/link";
import { ChevronRight, Zap, FileText } from "lucide-react";

const articles = [
  { 
    slug: "first-invoice", 
    title: "How to create your first invoice",
    description: "Step-by-step guide to creating and sending your first professional invoice."
  },
  { 
    slug: "bank-details", 
    title: "Adding bank details for payments",
    description: "Learn how to add your bank account to receive payments from customers."
  },
];

export default function GettingStartedPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Getting Started</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Getting Started</h1>
              <p className="text-slate-600">Learn the basics of SuoOps</p>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/getting-started/${article.slug}`}
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

        {/* Help CTA */}
        <div className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
          <p className="text-slate-600 mb-3">Can&apos;t find what you&apos;re looking for?</p>
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
