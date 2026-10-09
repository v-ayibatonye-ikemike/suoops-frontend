import type { ReactNode } from "react";

import { RequireAuth } from "@/components/common/require-auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { MobileTabBar } from "@/components/dashboard/mobile-tab-bar";
import { NewInvoiceProvider } from "@/features/dashboard/new-invoice-provider";
import { PhoneRequiredGate } from "@/features/dashboard/phone-required-gate";
import { WebAssistant } from "@/features/dashboard/web-assistant";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <NewInvoiceProvider>
        <div className="min-h-screen bg-brand-background">
          <DashboardNav />
          {/* WhatsApp number must be verified before ANY dashboard page opens. */}
          <PhoneRequiredGate>
            {children}
            <WebAssistant />
          </PhoneRequiredGate>
          <MobileTabBar />
        </div>
      </NewInvoiceProvider>
    </RequireAuth>
  );
}
