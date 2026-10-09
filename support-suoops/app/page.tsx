"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  Settings, 
  ChevronRight,
  Zap,
  Shield
} from "lucide-react";

const categories = [
  {
    title: "WhatsApp First Steps",
    description: "Create invoices by texting - in under 90 seconds",
    icon: MessageSquare,
    href: "/articles/whatsapp",
    color: "bg-emerald-600",
  },
  {
    title: "Your First Invoice",
    description: "Send a professional invoice in 4 simple steps",
    icon: Zap,
    href: "/articles/getting-started",
    color: "bg-blue-500",
  },
  {
    title: "Get Paid Faster",
    description: "Add bank details and track payments",
    icon: CreditCard,
    href: "/articles/billing",
    color: "bg-purple-500",
  },
  {
    title: "Invoicing & Tracking",
    description: "Create, send, and manage customer invoices",
    icon: FileText,
    href: "/articles/invoicing",
    color: "bg-teal-500",
  },
  {
    title: "Inventory & Stock",
    description: "Track products and get low-stock alerts",
    icon: Settings,
    href: "/articles/inventory",
    color: "bg-orange-500",
  },
  {
    title: "Account & Settings",
    description: "Team access, security, and preferences",
    icon: Shield,
    href: "/articles/account",
    color: "bg-red-500",
  },
];

const popularArticles = [
  { title: "Create your first invoice in 90 seconds", href: "/articles/getting-started/first-invoice" },
  { title: "Connect WhatsApp to start invoicing", href: "/articles/whatsapp/setup" },
  { title: "Add bank details to get paid", href: "/articles/getting-started/bank-details" },
  { title: "Invoice by texting: 'Invoice John ₦50k for design'", href: "/articles/whatsapp/text-commands" },
  { title: "Track payments and follow up easily", href: "/articles/invoicing/track-payments" },
  { title: "Nigerian Tax Exemptions 2026 (NTA 2025)", href: "/articles/tax/exemptions" },
];

export default function SupportHomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-linear-to-br from-emerald-600 to-emerald-700 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Get started in under 90 seconds
          </h1>
          <p className="mt-4 text-lg text-emerald-100">
            Create your first invoice on WhatsApp. No complexity, no setup stress.
          </p>
          
          {/* Search Bar */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search for articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-0 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-lg placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-4">
            Start with what matters most
          </h2>
          <p className="text-center text-slate-600 mb-10 max-w-2xl mx-auto">
            You don&apos;t need accounting knowledge. You don&apos;t need to change banks. Just send your first invoice.
          </p>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.title}
                  href={category.href}
                  className="group rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${category.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-emerald-600">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
                    Browse articles
                    <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">Quick Wins</h2>
          </div>
          <p className="text-slate-600 mb-8">Most users start here and send their first invoice within minutes</p>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularArticles.map((article) => (
              <Link
                key={article.title}
                href={article.href}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-xs"
              >
                <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 hover:text-emerald-600">
                  {article.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="rounded-2xl bg-slate-900 p-8 sm:p-12">
            <MessageSquare className="mx-auto h-12 w-12 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-bold text-white">
              Still have questions?
            </h2>
            <p className="mt-2 text-slate-400">
              We&apos;re here to help. Most users create their first invoice on WhatsApp without ever reading docs—but if you need us, we&apos;re ready.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Contact Support
              </Link>
              <Link
                href="/faq"
                className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
