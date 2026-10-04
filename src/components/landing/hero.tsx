"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Settings, ShieldCheck, Store } from "lucide-react";
import { useRegisterHref } from "@/hooks/use-tracking-params";

interface HeroProps {
  onWatchDemo: () => void;
}

export function Hero({ onWatchDemo }: HeroProps) {
  const registerHref = useRegisterHref();
  return (
    <section className="relative overflow-hidden bg-brand-evergreen px-4 py-16 sm:py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="flex flex-col justify-center">
            <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Stop running your business
              <br />
              <span className="text-brand-citrus"> from memory</span>
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-lg">
              <strong className="text-white">
                Sell, get paid, and run everything in one place.
              </strong>{" "}
              Orders buried in chats. Payment screenshots. Inventory in notebooks.
              SuoOps brings your storefront, payments, orders, delivery, inventory,
              invoices, and expenses into one organized, traceable system.
            </p>
            <p className="mt-4 text-sm text-white/60 max-w-lg">
              Every business deserves structure, visibility, trust, and control —
              whether big or small.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href={registerHref}
                className="inline-flex items-center justify-center rounded-lg bg-brand-jade px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-brand-teal"
              >
                Start selling free
              </Link>
              <Link
                href="/stores"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-citrus/60 bg-brand-citrus/10 px-8 py-4 text-base font-semibold text-brand-citrus transition-all hover:bg-brand-citrus hover:text-brand-evergreen"
              >
                <Store className="h-4 w-4" />
                Browse shops
              </Link>
              <button
                onClick={onWatchDemo}
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/5 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/15"
              >
                See how it works
              </button>
            </div>

            {/* Positioning pillars: Structure · Visibility · Trust */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { Icon: Settings, label: "Structure" },
                { Icon: Eye, label: "Visibility" },
                { Icon: ShieldCheck, label: "Trust" },
              ].map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/90"
                >
                  <p.Icon className="h-4 w-4" aria-hidden />
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="relative lg:mt-0">
            <div className="relative mx-auto max-w-sm">
              {/* Phone Frame */}
              <div className="relative rounded-[3rem] border-[14px] border-slate-900 bg-slate-900 shadow-2xl">
                <div className="overflow-hidden rounded-[2.3rem] bg-white">
                  {/* WhatsApp Header */}
                  <div className="bg-emerald-600 px-5 py-4 text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                        <Image
                          src="/icon.png"
                          alt="SuoOps"
                          width={24}
                          height={24}
                          className="h-6 w-6 object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">SuoOps</p>
                        <p className="text-xs opacity-90">online</p>
                      </div>
                    </div>
                  </div>
                  {/* Chat Messages */}
                  <div className="bg-[#efeae2] px-4 py-6 space-y-3 min-h-[340px]">
                    {/* User Text Message */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-lg bg-emerald-100 px-4 py-3 shadow-sm">
                        <p className="text-sm text-slate-800">
                          Invoice Joy 08078557662, 2000 boxers, 5000 hair
                        </p>
                        <p className="mt-1 text-xs text-slate-500 text-right">9:41 AM ✓✓</p>
                      </div>
                    </div>
                    {/* Bot Response */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-slate-800">✅ Invoice Created!</p>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          <p>📄 INV-2024-001</p>
                          <p>👤 Joy</p>
                          <p>💰 ₦7,000</p>
                        </div>
                        <div className="flex justify-start">
                          <div className="max-w-[90%] rounded-lg border-l-4 border-brand-citrus bg-white px-4 py-3 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-jade">
                              Today&apos;s priority
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              Follow up ₦45,000 overdue and review 2 low-stock products.
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Verified from your SuoOps records
                            </p>
                          </div>
                        </div>
                        <button className="mt-3 w-full rounded-lg bg-brand-jade py-2 text-sm font-semibold text-white">
                          View Invoice →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative blurs */}
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-citrus/30 blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-brand-jade/20 blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling Feature Pills */}
      <FeaturePills />
    </section>
  );
}

function FeaturePills() {
  const features = [
    { emoji: "🛍️", text: "Online storefront" },
    { emoji: "🚚", text: "Nationwide delivery" },
    { emoji: "🛡️", text: "Buyer protection" },
    { emoji: "💬", text: "WhatsApp invoices" },
    { emoji: "✨", text: "Commerce Copilot" },
    { emoji: "🤝", text: "Collections assistant" },
    { emoji: "📧", text: "Email delivery" },
    { emoji: "🔐", text: "QR verification" },
    { emoji: "📱", text: "Mobile-first" },
    { emoji: "⚡", text: "Fast setup" },
    { emoji: "📊", text: "Tax reports" },
    { emoji: "📦", text: "Inventory" },
    { emoji: "🎨", text: "Custom branding" },
  ];

  return (
    <div className="mt-16 overflow-hidden">
      <div className="flex animate-scroll gap-4" style={{ width: "max-content" }}>
        {/* First set */}
        {features.map((feature, i) => (
          <div
            key={`a-${i}`}
            className="flex-shrink-0 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-white border border-white/20"
          >
            <span aria-hidden="true">{feature.emoji}</span>
            <span>{feature.text}</span>
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {features.map((feature, i) => (
          <div
            key={`b-${i}`}
            className="flex-shrink-0 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-white border border-white/20"
          >
            <span aria-hidden="true">{feature.emoji}</span>
            <span>{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
