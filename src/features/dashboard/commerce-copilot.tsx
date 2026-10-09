"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

import {
  askCopilot,
  decideCopilotAction,
  getCopilotBriefing,
  type CopilotAction,
  type CopilotAnswer,
} from "@/api/copilot";
import { submitAIFeedback } from "@/api/ai-governance";
import { getApiErrorMessage } from "@/api/errors";

export function CommerceCopilot() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const briefing = useQuery({
    queryKey: ["commerce-copilot-briefing"],
    queryFn: getCopilotBriefing,
    staleTime: 5 * 60_000,
  });

  const ask = useMutation({
    mutationFn: askCopilot,
    onSuccess: (result) => setAnswer(result),
  });

  const decide = useMutation({
    mutationFn: ({
      action,
      decision,
    }: {
      action: CopilotAction;
      decision: "accepted" | "dismissed";
    }) => decideCopilotAction(action.id, decision),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["commerce-copilot-briefing"],
      });
      if (variables.decision === "accepted") {
        window.location.assign(variables.action.action_url);
      }
    },
  });
  const feedback = useMutation({
    mutationFn: (sentiment: "positive" | "negative") =>
      submitAIFeedback({
        feature: "daily_briefing",
        sentiment,
        context_id: "dashboard_briefing",
      }),
    onSuccess: () => setFeedbackSent(true),
  });

  if (briefing.isLoading) {
    return (
      <div
        className="h-64 animate-pulse rounded-xl border border-brand-border bg-white"
        aria-label="Loading Commerce Copilot"
      />
    );
  }

  if (!briefing.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        Commerce Copilot could not be loaded.
        <button type="button" onClick={() => void briefing.refetch()} disabled={briefing.isFetching} className="ml-2 font-semibold underline">
          Retry briefing
        </button>
      </div>
    );
  }
  const data = briefing.data;

  const submitQuestion = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || ask.isPending) return;
    setQuestion(trimmed);
    setAnswer(null);
    ask.mutate(trimmed);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-brand-jade/30 bg-white shadow-card [overflow-wrap:anywhere]">
      <div className="bg-gradient-to-r from-brand-evergreen to-brand-teal px-4 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-citrus" aria-hidden />
              <h2 className="text-base font-semibold sm:text-lg">
                SuoOps Commerce Copilot
              </h2>
            </div>
            <p className="mt-1 text-xs text-white/70">
              Verified from your SuoOps business records
              {data.ai_generated ? " · AI explained" : ""}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide">
            Daily briefing
          </span>
        </div>
        <h3 className="mt-4 text-xl font-bold sm:text-2xl">{data.headline}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/85">
          {data.summary}
        </p>
        {data.generation_notice && (
          <p className="mt-2 text-xs text-white/65">{data.generation_notice}</p>
        )}
        {data.ai_generated && (
          <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
            <span>{feedbackSent ? "Thanks for the feedback." : "Was this AI explanation useful?"}</span>
            {!feedbackSent && (
              <>
                <button
                  type="button"
                  aria-label="AI explanation was useful"
                  disabled={feedback.isPending}
                  onClick={() => feedback.mutate("positive")}
                  className="rounded-md bg-white/10 p-1.5 hover:bg-white/20 disabled:opacity-50"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="AI explanation was not useful"
                  disabled={feedback.isPending}
                  onClick={() => feedback.mutate("negative")}
                  className="rounded-md bg-white/10 p-1.5 hover:bg-white/20 disabled:opacity-50"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {feedback.error && (
              <p className="mt-2 text-xs text-white" role="alert">
                Your feedback could not be saved. Please try again.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          {decide.error && (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {getApiErrorMessage(decide.error, "The action could not be updated. Please try again.")}
            </p>
          )}
          {briefing.error && (
            <p className="mb-3 text-sm text-amber-700" role="alert">
              The briefing could not be refreshed. Showing the last available facts.
              <button type="button" onClick={() => void briefing.refetch()} disabled={briefing.isFetching} className="ml-2 underline">Retry briefing</button>
            </p>
          )}
          <h3 className="text-sm font-semibold text-brand-text">
            Recommended next steps
          </h3>
          {data.actions.length ? (
            <ul className="mt-3 space-y-3">
              {data.actions.map((action) => (
                <li
                  key={action.id}
                  className="rounded-lg border border-brand-border bg-brand-background/50 p-3"
                >
                  <p className="text-sm font-semibold text-brand-text">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-text/75">
                    {action.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ action, decision: "accepted" })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-evergreen px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-teal disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Review action
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ action, decision: "dismissed" })
                      }
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-text/75 transition hover:bg-white hover:text-brand-text disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              Nothing urgent needs your attention right now.
            </p>
          )}
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-text">
            <MessageCircle className="h-4 w-4 text-brand-teal" aria-hidden />
            Ask about your business
          </h3>
          <div className="mt-3 flex gap-2">
            <input
              value={question}
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitQuestion(question);
              }}
              placeholder="Who owes me money?"
              aria-label="Ask Commerce Copilot"
              className="min-w-0 flex-1 rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-jade focus:ring-2 focus:ring-brand-jade/20"
            />
            <button
              type="button"
              onClick={() => submitQuestion(question)}
              disabled={!question.trim() || ask.isPending}
              className="rounded-lg bg-brand-evergreen px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-teal disabled:opacity-50"
            >
              {ask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Asking" />
              ) : (
                "Ask"
              )}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.suggested_questions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={ask.isPending}
                onClick={() => submitQuestion(suggestion)}
                className="rounded-full border border-brand-border px-2.5 py-1 text-[11px] text-brand-text/75 transition hover:border-brand-jade hover:text-brand-text"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {answer && (
            <div
              className="mt-4 rounded-lg border border-brand-jade/20 bg-brand-mint/40 p-3"
              aria-live="polite"
            >
              <p className="text-sm leading-relaxed text-brand-text">
                {answer.answer}
              </p>
              {answer.evidence.length > 0 && (
                <p className="mt-2 text-[11px] text-brand-text/75">
                  Based on: {answer.evidence.join(", ")}.
                </p>
              )}
            </div>
          )}

          {ask.error && (
            <p className="mt-3 text-xs text-red-600" role="alert">
              {getApiErrorMessage(ask.error, "Commerce Copilot could not answer right now. Please try again.")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
