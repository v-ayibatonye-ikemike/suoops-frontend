"use client";

import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { apiClient } from "@/api/client";
import { getApiErrorMessage } from "@/api/errors";

type Preferences = {
  whatsapp_opted_in: boolean; phone_verified: boolean;
  email_enabled?: boolean; email_available?: boolean;
};

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
    mutationFn: async ({ enabled, channel }: { enabled: boolean; channel: "email" | "whatsapp" }) =>
      (await apiClient.patch<Partial<Preferences>>(
        "/ai/retention/consent", channel === "email" ? { enabled, channel } : { enabled },
      )).data,
    onSuccess: (result, variables) => {
      queryClient.setQueryData<Preferences>(queryKey, (old) => old ? { ...old, ...result } : old);
      toast.success(`${variables.channel === "email" ? "Email" : "WhatsApp"} business nudges ${variables.enabled ? "enabled" : "stopped"}.`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Could not save business nudge preferences.")),
  });
  return (
    <section className="rounded-xl border border-brand-border p-4" aria-labelledby={`${scope}-title`}>
      <h3 id={`${scope}-title`} className="text-sm font-semibold text-brand-text">Business nudges</h3>
      <p className="mt-1 text-xs leading-relaxed text-brand-textMuted">
        Let SuoOps send personalized onboarding, collections, stock, and reactivation suggestions to your
        account email or verified WhatsApp number, at most once a week across channels.
        No customer messages or business changes happen without your review. Reply STOP to stop business nudges,
        or use the unsubscribe link to stop retention emails. Login codes, invoices and receipts are unchanged.
      </p>
      {preferences.isError ? (
        <div className="mt-3 text-sm">
          <p role="alert" className="text-red-700">Could not load business nudge preferences.</p>
          <button type="button" disabled={preferences.isFetching} className="underline" onClick={() => void preferences.refetch()}>Retry nudges</button>
        </div>
      ) : preferences.data ? (<>
        {preferences.data.email_available !== undefined && <label className="mt-3 flex items-center gap-3 text-sm text-brand-text">
          <input type="checkbox" checked={Boolean(preferences.data.email_enabled)}
            disabled={save.isPending || !preferences.data.email_available}
            onChange={(event) => save.mutate({ channel: "email", enabled: event.target.checked })}
            className="h-5 w-5 accent-brand-jade" />
          Send me useful business emails
        </label>}
        <label className="mt-3 flex items-center gap-3 text-sm text-brand-text">
          <input
            type="checkbox"
            checked={preferences.data.whatsapp_opted_in}
            disabled={save.isPending || (!preferences.data.phone_verified && !preferences.data.whatsapp_opted_in)}
            onChange={(event) => save.mutate({ channel: "whatsapp", enabled: event.target.checked })}
            className="h-5 w-5 accent-brand-jade"
          />
          {preferences.data.phone_verified ? "Send me useful business nudges on WhatsApp" : "Verify your phone to enable nudges"}
        </label>
      </>) : <p className="mt-3 text-sm text-brand-textMuted">Loading nudge preferences...</p>}
    </section>
  );
}
