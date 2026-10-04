"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X, ShoppingCart } from "lucide-react";
import { apiClient } from "@/api/client";
import { components } from "@/api/types.generated";
import Link from "next/link";
import { useState, useEffect } from "react";

import { dismiss as dismissBanner, isDismissed } from "@/lib/dismissals";
import { walletNaira, MANUAL_FEE_PERCENT } from "@/constants/pricing";

type CurrentUser = components["schemas"]["UserOut"] & { wallet_balance_kobo?: number };

const DISMISSED_KEY = "low-balance-banner-dismissed";
// Re-surface after 1 day for low (>0) balance, never auto-redismiss for zero.
const DISMISS_TTL_DAYS = 1;

/**
 * Prompt merchants to top up when the prepaid commission wallet is low.
 */
export function LowBalanceBanner() {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash

  // Check localStorage on mount
  useEffect(() => {
    setDismissed(isDismissed(DISMISSED_KEY, DISMISS_TTL_DAYS));
  }, []);

  // Fetch current user to check wallet balance
  const { data: user, isLoading } = useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<CurrentUser>("/users/me");
      return response.data;
    },
    staleTime: 60000,
  });

  const wallet = walletNaira(user?.wallet_balance_kobo);
  const isLowBalance = wallet > 0 && wallet < 500;
  const isZeroBalance = wallet <= 0;

  // Don't show if loading, the wallet is healthy, or the banner was dismissed.
  if (isLoading || (!isLowBalance && !isZeroBalance) || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    dismissBanner(DISMISSED_KEY);
    setDismissed(true);
  };

  // Different messaging for zero vs low balance
  const isUrgent = isZeroBalance;
  const bgColor = isUrgent 
    ? "from-red-50 to-orange-50 border-red-400" 
    : "from-amber-50 to-yellow-50 border-amber-400";
  const iconBg = isUrgent ? "bg-red-500" : "bg-amber-500";

  return (
    <div className={`mb-6 rounded-xl border-2 ${bgColor} p-4 shadow-sm`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} text-white shadow-md`}>
          {isUrgent ? <AlertTriangle className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">
                {isZeroBalance
                  ? "Your invoice wallet is empty"
                  : `Wallet low: ₦${wallet.toLocaleString()} left`}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {isZeroBalance
                  ? "Top up to keep creating manual invoices — or share your storefront so customers pay online."
                  : `Top up so you never miss creating an invoice. We take just ${MANUAL_FEE_PERCENT}% each.`}
              </p>
            </div>
            {!isZeroBalance && (
              <button
                onClick={handleDismiss}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/dashboard/billing/purchase"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-jade px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-teal"
            >
              <ShoppingCart className="h-4 w-4" />
              Top up wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
