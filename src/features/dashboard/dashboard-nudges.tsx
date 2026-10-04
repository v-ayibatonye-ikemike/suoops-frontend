"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import { isDismissed } from "@/lib/dismissals";

import { FeatureDiscoveryTips } from "./feature-discovery-tips";
import { LowBalanceBanner } from "./low-balance-banner";

interface UserData {
  wallet_balance_kobo?: number;
}

/**
 * Pick the single most useful nudge to show right now.
 *
 * The dashboard previously stacked 5+ banners simultaneously, burying the
 * actual content. This orchestrator evaluates the user's state and renders
 * exactly one — the highest-priority one that still applies and hasn't
 * been dismissed within its TTL window.
 *
 * Activation tasks live in ActivationJourney. This coordinator is reserved
 * for unrelated operational alerts and lightweight feature discovery.
 *
 * The referral banner is rendered separately on the dashboard so every
 * user always sees the earn-cash opportunity, not just those past the
 * activation funnel.
 */
export function DashboardNudges() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data: user, isLoading } = useQuery<UserData>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<UserData>("/users/me");
      return response.data;
    },
    staleTime: 60_000,
  });

  // Don't render anything during SSR or while user data is unknown — avoids
  // a flash of the wrong banner before priority is established.
  if (!hydrated || isLoading || !user) return null;

  const balanceKobo = user.wallet_balance_kobo ?? 0;
  // Low balance remains visible because it can block ongoing operations.
  if (
    balanceKobo < 50_000 &&
    !isDismissed("low-balance-banner-dismissed", balanceKobo === 0 ? 0 : 1)
  ) {
    return <LowBalanceBanner />;
  }

  // Feature tip — last priority, exploratory.
  return <FeatureDiscoveryTips />;
}
