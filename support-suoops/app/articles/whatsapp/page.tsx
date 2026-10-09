import Link from "next/link";
import { ChevronRight, MessageSquare, FileText } from "lucide-react";

const articles = [
  { 
    slug: "setup", 
    title: "How to connect WhatsApp",
    description: "Set up WhatsApp notifications and invoice delivery in minutes."
  },
];

export default function WhatsAppPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">WhatsApp Bot</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">WhatsApp Bot</h1>
              <p className="text-slate-600">Send invoices via WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/whatsapp/${article.slug}`}
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

        {/* WhatsApp CTA */}
        <div className="mt-10 rounded-xl bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 p-6 text-center">
          <h3 className="font-bold text-slate-900 mb-2">Ready to get started?</h3>
          <p className="text-slate-600 mb-4">Message our WhatsApp bot to start invoicing.</p>
          <a
            href="https://wa.me/2349160016122"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
          >
            Message SuoOps Bot
          </a>
        </div>
      </div>
    </div>
  );
}
