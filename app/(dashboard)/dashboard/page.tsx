"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Plus } from "lucide-react";

import { apiClient } from "@/api/client";
import { components } from "@/api/types.generated";
import { InvoiceListWithDetail } from "@/features/invoices/invoice-list-with-detail";
import { InvoiceStatusCard } from "@/features/invoices/invoice-status-card";
import { CashPositionCard } from "@/features/dashboard/cash-position-card";
import { ProfessionalismScoreCard } from "@/features/dashboard/professionalism-score-card";
import { ProWelcomeModal } from "@/features/dashboard/pro-welcome-modal";
import { BankDetailsRequiredGate } from "@/features/dashboard/bank-details-required-gate";
import { NewUserOnboarding } from "@/features/dashboard/new-user-onboarding";
import { DashboardNudges } from "@/features/dashboard/dashboard-nudges";
import { useNewInvoiceDrawer } from "@/features/dashboard/new-invoice-provider";
import { WhatsAppQuickCreate } from "@/features/dashboard/whatsapp-quick-create";
import { ActivationJourney } from "@/features/dashboard/activation-journey";

type CurrentUser = components["schemas"]["UserOut"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function DashboardHero() {
  const newInvoice = useNewInvoiceDrawer();
  const { data: user } = useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<CurrentUser>("/users/me");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const firstName = (user?.name || user?.email || "there").split(/[\s@]/)[0];
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-brand-mint/80">
          {greeting()}, {firstName}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          Here&apos;s your money snapshot
        </h1>
        <p className="mt-1 text-xs text-brand-mint sm:text-sm">
          Track invoices, cash flow, and what to action next.
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <WhatsAppQuickCreate>
          {({ onClick, href, target, rel }) => {
            const cls =
              "inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1ebe5a] sm:text-base";
            return href ? (
              <a href={href} target={target} rel={rel} className={cls}>
                <MessageCircle className="h-5 w-5" />
                Create on WhatsApp
              </a>
            ) : (
              <button type="button" onClick={onClick} className={cls}>
                <MessageCircle className="h-5 w-5" />
                Create on WhatsApp
              </button>
            );
          }}
        </WhatsAppQuickCreate>
        <button
          type="button"
          onClick={() => newInvoice.open()}
          className="inline-flex items-center justify-center gap-1 self-start text-xs font-medium text-brand-mint underline-offset-2 transition hover:text-white hover:underline sm:self-end"
        >
          <Plus className="h-3.5 w-3.5" />
          or use the web form
        </button>
      </div>
    </div>
  );
}

// Wrap InvoiceListWithDetail in its own Suspense for useSearchParams
function InvoiceListWrapper() {
  return (
    <Suspense
      fallback={
        <div className="h-48 animate-pulse rounded-lg bg-brand-background sm:h-64" />
      }
    >
      <InvoiceListWithDetail />
    </Suspense>
  );
}

export default function DashboardPage() {
  return (
    <BankDetailsRequiredGate>
      <NewUserOnboarding>
          <main className="min-h-screen">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
              <DashboardHero />

              <ActivationJourney />

              {/* One-time Pro feature tour for new Pro users */}
              <ProWelcomeModal />

              {/* Operational nudges only; activation is coordinated above. */}
              <DashboardNudges />

              <div className="space-y-4 sm:space-y-6">
                {/* Cash-First Position Cards — the numbers that matter most */}
                <CashPositionCard />

                {/* 12-col grid: status (4) + invoice list (8) */}
                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <div className="space-y-4">
                      <Suspense
                        fallback={
                          <div className="h-48 animate-pulse rounded-lg bg-brand-background sm:h-64" />
                        }
                      >
                        <InvoiceStatusCard />
                      </Suspense>

                      <ProfessionalismScoreCard />
                    </div>
                  </div>

                  <div id="invoices" className="scroll-mt-20 lg:col-span-8">
                    <InvoiceListWrapper />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </NewUserOnboarding>
      </BankDetailsRequiredGate>
  );
}
