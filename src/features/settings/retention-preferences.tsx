"use client";

import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { apiClient } from "@/api/client";
import { getApiErrorMessage } from "@/api/errors";

type Preferences = { whatsapp_opted_in: boolean; phone_verified: boolean };

export function RetentionPreferences() {
  const scope = useId();
  const queryKey = ["retention-preferences", scope];
  const queryClient = useQueryClient();
  const preferences = useQuery({
    queryKey,
    queryFn: async () => (await apiClient.get<Preferences>("/ai/retention")).data,
    retry: false,
  });
  const save = useMutation({
    mutationFn: async (enabled: boolean) =>
      (await apiClient.patch<{ whatsapp_opted_in: boolean }>("/ai/retention/consent", { enabled })).data,
    onSuccess: (result) => {
      queryClient.setQueryData<Preferences>(queryKey, (old) => old ? { ...old, ...result } : old);
      toast.success(result.whatsapp_opted_in ? "Business nudges enabled." : "Business nudges stopped.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not save business nudge preferences.")),
  });
  return (
    <section className="rounded-xl border border-brand-border p-4" aria-labelledby={`${scope}-title`}>
      <h3 id={`${scope}-title`} className="text-sm font-semibold text-brand-text">WhatsApp business nudges</h3>
      <p className="mt-1 text-xs leading-relaxed text-brand-textMuted">
        Let SuoOps send personalized onboarding, collections, stock, and reactivation suggestions to your
        verified WhatsApp number, at most once a week. Optional; currently limited to a controlled pilot.
        No customer messages or business changes happen without your review. Reply STOP to opt out.
      </p>
      {preferences.isError ? (
        <div className="mt-3 text-sm">
          <p role="alert" className="text-red-700">Could not load business nudge preferences.</p>
          <button type="button" disabled={preferences.isFetching} className="underline" onClick={() => void preferences.refetch()}>Retry nudges</button>
        </div>
      ) : preferences.data ? (
        <label className="mt-3 flex items-center gap-3 text-sm text-brand-text">
          <input
            type="checkbox"
            checked={preferences.data.whatsapp_opted_in}
            disabled={save.isPending || (!preferences.data.phone_verified && !preferences.data.whatsapp_opted_in)}
            onChange={(event) => save.mutate(event.target.checked)}
            className="h-5 w-5 accent-brand-jade"
          />
          {preferences.data.phone_verified ? "Send me useful business nudges on WhatsApp" : "Verify your phone to enable nudges"}
        </label>
      ) : <p className="mt-3 text-sm text-brand-textMuted">Loading nudge preferences...</p>}
    </section>
  );
}
