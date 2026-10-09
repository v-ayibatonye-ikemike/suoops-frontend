"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  getAIPreferences,
  updateAIPreferences,
  type AIPreferences,
} from "@/api/ai-governance";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getApiErrorMessage } from "@/api/errors";

export function AIPreferencesSection() {
  const queryClient = useQueryClient();
  const preferences = useQuery({
    queryKey: ["ai-preferences"],
    queryFn: getAIPreferences,
    retry: false,
  });
  const [draft, setDraft] = useState<AIPreferences | null>(null);

  useEffect(() => {
    if (preferences.data) setDraft(preferences.data);
  }, [preferences.data]);

  const save = useMutation({
    mutationFn: updateAIPreferences,
    onSuccess: (result) => {
      setDraft(result);
      queryClient.setQueryData(["ai-preferences"], result);
      toast.success("AI preferences saved.");
    },
    onError: (error) => {
      const detail = (error as { response?: { data?: { detail?: string | { message?: string } } } })
        ?.response?.data?.detail;
      toast.error(
        typeof detail === "string"
          ? detail
          : detail?.message || "Only the workspace owner or team admin can change AI settings.",
      );
    },
  });

  if (preferences.isError && !draft) {
    return (
      <Card id="ai-controls" className="scroll-mt-20">
        <CardContent className="space-y-3 p-6">
          <p role="alert" className="text-sm text-red-700">
            {getApiErrorMessage(preferences.error, "We could not load AI controls. Please try again.")}
          </p>
          <button type="button" disabled={preferences.isFetching} onClick={() => void preferences.refetch()} className="text-sm font-semibold text-brand-teal underline disabled:opacity-50">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (preferences.isLoading || !draft) {
    return (
      <Card id="ai-controls" className="scroll-mt-20">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-brand-textMuted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading AI controls…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="ai-controls" className="scroll-mt-20">
      <CardHeader className="border-b border-brand-border/60 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-brand-text sm:text-[22px]">AI controls</h2>
            <p className="text-xs text-brand-textMuted">
              Control optional AI interpretation, wording and explanations
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pt-5 sm:px-6">
        <label className="flex items-start justify-between gap-4 rounded-xl border border-brand-border p-4">
          <span>
            <span className="block text-sm font-semibold text-brand-text">Enable optional AI assistance</span>
            <span className="mt-1 block text-xs leading-relaxed text-brand-textMuted">
              Turning this off keeps deterministic calculations available but stops provider-generated
              navigation interpretation, narratives, copy, ranking, and tone adjustments.
            </span>
          </span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            className="mt-1 h-5 w-5 accent-brand-jade"
          />
        </label>

        <div className="space-y-2">
          {Object.entries(draft.available_features).map(([feature, label]) => {
            const enabled = draft.feature_overrides[feature] ?? true;
            return (
              <label
                key={feature}
                className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2.5"
              >
                <span className="text-sm text-brand-text">{label}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={!draft.enabled}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      feature_overrides: {
                        ...draft.feature_overrides,
                        [feature]: event.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 accent-brand-jade disabled:opacity-40"
                />
              </label>
            );
          })}
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-brand-textMuted">
          Financial calculations, stock quantities, prices, escrow decisions, and sends remain
          deterministic and human-controlled whether AI is enabled or not.
        </div>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              enabled: draft.enabled,
              feature_overrides: draft.feature_overrides,
            })
          }
          className="rounded-lg bg-brand-jade px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : "Save AI preferences"}
        </button>
      </CardContent>
    </Card>
  );
}
