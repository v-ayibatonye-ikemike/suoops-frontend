"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Circle,
  Building2,
  Landmark,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  CreditCard,
  Store,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/api/client";
import { FEE_TAGLINE_SHORT, MANUAL_FEE_PERCENT } from "@/constants/pricing";

const PLAN_CHOSEN_KEY = "plan-chosen";
const PRICING_SNOOZED_KEY = "pricing-snoozed-at";
const PRICING_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOGO_TIP_DISMISSED_KEY = "logo-tip-dismissed-at";
const LOGO_TIP_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BOT_NUMBER = "2348106865807";
const WHATSAPP_LINK = `https://wa.me/${BOT_NUMBER}?text=Hi`;

interface UserData {
  name?: string;
  phone?: string;
  phone_verified?: boolean;
  business_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  logo_url?: string | null;
  invoice_balance?: number;
  invoices_this_month?: number;
  online_payments_enabled?: boolean;
  storefront_enabled?: boolean;
}

interface SetupStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  icon: React.ReactNode;
}

/**
 * Onboarding journey and WhatsApp-first experience.
 *
 * Shows for ALL users on every login:
 * - WhatsApp CTA to create invoices via bot (always visible)
 * - Setup checklist for users with incomplete profile
 * - Progress bar for onboarding
 *
 * Hidden only when user clicks "I want to create an invoice from the dashboard instead."
 * That preference persists via localStorage.
 */
export function WelcomeGuide() {
  const [showDashboardForm, setShowDashboardForm] = useState(false);
  const [planChosen, setPlanChosen] = useState(true); // default true to prevent flash
  const [logoTipDismissed, setLogoTipDismissed] = useState(true); // default hidden to prevent flash
  const [pricingSnoozed, setPricingSnoozed] = useState(true); // default hidden to prevent flash

  useEffect(() => {
    setShowDashboardForm(sessionStorage.getItem("show-dashboard-form") === "true");
    // Plan choice persists in localStorage so it survives sessions
    setPlanChosen(localStorage.getItem(PLAN_CHOSEN_KEY) === "true");
    // Logo tip: dismissable but reappears after a 7-day cooldown so we
    // keep nudging users to add a logo without being annoying.
    const dismissedAt = Number(
      localStorage.getItem(LOGO_TIP_DISMISSED_KEY) || 0,
    );
    setLogoTipDismissed(
      Boolean(dismissedAt) && Date.now() - dismissedAt < LOGO_TIP_COOLDOWN_MS,
    );
    // Pricing card snooze: dismissable for 7 days at a time. The card
    // re-surfaces after the cooldown until the user upgrades to Pro.
    const snoozedAt = Number(
      localStorage.getItem(PRICING_SNOOZED_KEY) || 0,
    );
    setPricingSnoozed(
      Boolean(snoozedAt) && Date.now() - snoozedAt < PRICING_SNOOZE_MS,
    );
  }, []);

  const { data: user, isLoading } = useQuery<UserData>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<UserData>("/users/me");
      return response.data;
    },
    staleTime: 60000,
  });

  const invoiceBalance = user?.invoice_balance ?? 2;

  // Build setup steps
  const hasPhone = Boolean(user?.phone_verified && user?.phone);
  const hasBusinessName = Boolean(user?.business_name?.trim());
  const hasBankDetails = Boolean(user?.bank_name?.trim() && user?.account_number?.trim());
  const hasLogo = Boolean(user?.logo_url);
  const hasOnlinePayments = Boolean(user?.online_payments_enabled);
  const hasStorefront = Boolean(user?.storefront_enabled);

  const steps: SetupStep[] = [
    {
      id: "whatsapp",
      label: "Connect WhatsApp",
      description: "Create invoices by texting our bot",
      done: hasPhone,
      href: WHATSAPP_LINK,
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      id: "business_name",
      label: "Set business name",
      description: "Appears on your invoices",
      done: hasBusinessName,
      href: "/dashboard/settings#profile",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: "bank_details",
      label: "Add bank details",
      description: "So customers know where to pay",
      done: hasBankDetails,
      href: "/dashboard/settings#bank-details",
      icon: <Landmark className="h-4 w-4" />,
    },
    {
      id: "logo",
      label: "Upload business logo",
      description: "Look professional on invoices",
      done: hasLogo,
      href: "/dashboard/settings#logo",
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      id: "online_payments",
      label: "Get paid online",
      description: "Card & transfer — auto-confirmed, flat 3%",
      done: hasOnlinePayments,
      href: "/dashboard/settings#online-payments",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: "storefront",
      label: "Set up your storefront",
      description: "A shareable page of your products",
      done: hasStorefront,
      href: "/dashboard/settings#storefront",
      icon: <Store className="h-4 w-4" />,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const setupReady = hasPhone && hasBusinessName && hasBankDetails;

  // Don't show if loading
  if (isLoading) return null;

  const firstName = user?.name?.split(" ")[0] || "there";
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const firstIncomplete = steps.find((s) => !s.done);

  const plan = ((user as Record<string, unknown>)?.plan as string || "free").toLowerCase();
  const isPro = plan === "pro";

  // Auto-mark plan as chosen if user is already Pro
  if (isPro && !planChosen) {
    localStorage.setItem(PLAN_CHOSEN_KEY, "true");
    setPlanChosen(true);
  }

  // Once required setup is done, replace the giant welcome card with a
  // compact, dismissable nudge for the optional logo step. The tip
  // re-surfaces after a 7-day cooldown until the user actually uploads
  // a logo, so we keep encouraging the more-professional invoice look
  // without dominating the dashboard.
  if (setupReady) {
    if (hasLogo || logoTipDismissed) return null;
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-brand-text shadow-sm">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
          aria-hidden
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <ImageIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Add your business logo</p>
          <p className="text-xs text-brand-textMuted">
            Invoices look more professional with a logo on top.
          </p>
        </div>
        <Link
          href="/dashboard/settings#logo"
          className="shrink-0 rounded-lg bg-brand-jade px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          Upload
        </Link>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(
              LOGO_TIP_DISMISSED_KEY,
              String(Date.now()),
            );
            setLogoTipDismissed(true);
          }}
          aria-label="Dismiss logo reminder"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    );
  }

  // ── STEP 0: Plan Selection ──
  // Shown to every non-Pro user until they upgrade. Snoozable for
  // 7 days at a time so we keep surfacing pricing without nagging.
  // (For brand-new users who haven't picked a plan yet, the snooze
  // hasn't been set so it shows immediately on first dashboard load.)
  if (!isPro && !pricingSnoozed) {
    const snoozePricing = () => {
      try {
        localStorage.setItem(PRICING_SNOOZED_KEY, String(Date.now()));
        localStorage.setItem(PLAN_CHOSEN_KEY, "true");
      } catch {
        // localStorage unavailable — best effort.
      }
      setPricingSnoozed(true);
      setPlanChosen(true);
    };
    return (
      <div className="mb-6 rounded-2xl border-2 border-brand-jade/30 bg-gradient-to-br from-white via-emerald-50/50 to-green-50/50 p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-jade/5" />

        <button
          type="button"
          onClick={snoozePricing}
          aria-label="Hide pricing for now"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-slate-400 transition hover:bg-white/60 hover:text-slate-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <div className="relative mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-brand-jade" />
            <h2 className="text-lg sm:text-xl font-bold text-brand-text">
              Welcome, {firstName}! {FEE_TAGLINE_SHORT}.
            </h2>
          </div>
          <p className="text-sm text-brand-textMuted">
            No subscription or feature tiers — pay {MANUAL_FEE_PERCENT}% when you invoice.
          </p>
        </div>

        <div className="relative grid gap-4 sm:grid-cols-2 mb-5">
          {/* Storefront orders */}
          <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🛍️</span>
              <div>
                <h3 className="text-base font-bold text-brand-text">Storefront orders</h3>
                <p className="text-xs text-brand-textMuted">3% at payment</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 mb-4">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Customers order &amp; pay online</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Nothing upfront — free to use</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 3% only when you get paid</li>
            </ul>
          </div>

          {/* Manual invoices */}
          <div className="rounded-xl border-2 border-brand-jade/40 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🧾</span>
              <div>
                <h3 className="text-base font-bold text-brand-text">Manual invoices</h3>
                <p className="text-xs text-brand-jade font-semibold">0.5% from your wallet</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 mb-4">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Create &amp; confirm payment yourself</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 0.5% (min ₦100, capped ₦400 under ₦500k) charged at creation</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Top up: ₦1,250 / ₦5,000 / ₦20,000</li>
            </ul>
          </div>
        </div>

        <div className="relative mb-4 flex flex-wrap gap-3">
          <button
            onClick={snoozePricing}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-brand-jade bg-white px-4 py-2.5 text-sm font-semibold text-brand-jade transition hover:bg-emerald-50"
          >
            Got it
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            href="/dashboard/billing/purchase"
            onClick={snoozePricing}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-jade px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-jade/90"
          >
            <ShoppingCart className="h-4 w-4" />
            Top up wallet
          </Link>
        </div>

        <p className="text-center text-xs text-brand-textMuted">
          All features included: WhatsApp invoicing, PDF, QR, storefront, inventory &amp; tax reports.
        </p>
      </div>
    );
  }

  // After plan is chosen, allow hiding the setup checklist via dashboard form toggle
  if (showDashboardForm) return null;

  return (
    <div className="mb-6 rounded-2xl border-2 border-brand-jade/30 bg-gradient-to-br from-white via-emerald-50/50 to-green-50/50 p-5 sm:p-6 shadow-md relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-jade/5" />
      <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-emerald-500/5" />

      {/* Header */}
      <div className="relative mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-brand-jade" />
          <h2 className="text-lg sm:text-xl font-bold text-brand-text">
            {allDone ? `Welcome back, ${firstName}!` : `Welcome, ${firstName}! Let\u0027s get you set up`}
          </h2>
        </div>
        <p className="text-sm text-brand-textMuted">
          {allDone
            ? "Create invoices instantly via WhatsApp — just text our bot."
            : "Complete these steps to start sending invoices and collecting payments."}
        </p>
      </div>

      {/* Progress bar — only show if setup incomplete */}
      {!allDone && (
        <div className="relative mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-brand-text">
              {completedCount}/{steps.length} completed
            </span>
            <span className="text-xs text-brand-textMuted">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-jade transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Setup checklist — only show if incomplete steps remain */}
      {!allDone && (
        <div className="relative space-y-2 mb-5">
        {steps.map((step) => {
          const isNext = firstIncomplete?.id === step.id;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                step.done
                  ? "border-emerald-200 bg-emerald-50/50"
                  : isNext
                    ? "border-brand-jade/40 bg-white shadow-sm"
                    : "border-slate-200 bg-white/50"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className={`h-5 w-5 shrink-0 ${isNext ? "text-brand-jade" : "text-slate-300"}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? "text-emerald-700 line-through" : "text-brand-text"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-brand-textMuted">{step.description}</p>
              </div>
              {!step.done && (
                step.id === "whatsapp" ? (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1fb855] shrink-0"
                  >
                    Connect
                    <ArrowRight className="h-3 w-3" />
                  </a>
                ) : (
                  <Link
                    href={step.href}
                    className="flex items-center gap-1 rounded-lg bg-brand-jade px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-jade/90 shrink-0"
                  >
                    Set up
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* WhatsApp CTA — always show for all users */}
      {hasPhone && (
        <div className="relative rounded-xl border-2 border-[#25D366]/30 bg-[#25D366]/5 p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366] text-white shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-brand-text text-sm mb-1">
                Create invoices via WhatsApp
              </h3>
              <p className="text-xs text-brand-textMuted mb-2">
                Just text: &quot;Invoice Joy 5000 wig&quot; and your invoice goes out instantly.
              </p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1fb855]"
              >
                Open WhatsApp Bot
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp connect CTA — show when phone not connected */}
      {!hasPhone && (
        <div className="relative rounded-xl border-2 border-[#25D366]/30 bg-[#25D366]/5 p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366] text-white shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-brand-text text-sm mb-1">
                Start with WhatsApp — it&apos;s the fastest way
              </h3>
              <p className="text-xs text-brand-textMuted mb-2">
                Just text: &quot;Invoice Joy 5000 wig&quot; and your invoice goes out instantly.
              </p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1fb855]"
              >
                Open WhatsApp Bot
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Setup-ready message */}
      {setupReady && !allDone && (
        <div className="relative rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-4">
          <p className="text-xs text-emerald-700">
            <strong>You&apos;re ready to create invoices!</strong> Complete the remaining
            optional step{steps.filter((s) => !s.done).length > 1 ? "s" : ""} to look even more professional.
          </p>
        </div>
      )}

      {/* Toggle for dashboard form (hidden by default for new users) */}
      {!showDashboardForm ? (
        <button
          onClick={() => {
            setShowDashboardForm(true);
            sessionStorage.setItem("show-dashboard-form", "true");
          }}
          className="relative flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-brand-textMuted transition hover:bg-slate-50 hover:text-brand-text"
        >
          <ChevronDown className="h-3 w-3" />
          I want to create an invoice from the dashboard instead
        </button>
      ) : (
        <button
          onClick={() => {
            setShowDashboardForm(false);
            sessionStorage.removeItem("show-dashboard-form");
          }}
          className="relative flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-brand-textMuted transition hover:bg-slate-50 hover:text-brand-text"
        >
          <ChevronUp className="h-3 w-3" />
          Hide dashboard invoice form
        </button>
      )}

      {/* Footer */}
      <p className="mt-3 text-center text-xs text-brand-textMuted">
        You have <strong>{invoiceBalance} invoice{invoiceBalance === 1 ? "" : "s"}</strong> ready to use
      </p>
    </div>
  );
}

/**
 * Hook to check if the dashboard invoice form should be shown.
 * Hidden by default — shown only when user explicitly clicks
 * "I want to create an invoice from the dashboard instead."
 * Also hidden if plan hasn't been chosen yet.
 */
export function useShowDashboardForm() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const planChosen = localStorage.getItem(PLAN_CHOSEN_KEY) === "true";
    const formToggled = sessionStorage.getItem("show-dashboard-form") === "true";
    setShow(planChosen && formToggled);
  }, []);

  return show;
}
