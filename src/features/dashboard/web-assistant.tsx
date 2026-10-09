"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import {
  askWebAssistant, assistantPage, getWebAssistantContext,
  type AssistantAction, type WebAssistantResponse,
} from "@/api/web-assistant";
import { getApiErrorMessage } from "@/api/errors";
import { Drawer } from "@/components/ui/drawer";
import { useNewInvoiceDrawer } from "./new-invoice-provider";

export function WebAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const invoiceDrawer = useNewInvoiceDrawer();
  const page = assistantPage(pathname);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [allowAI, setAllowAI] = useState(true);
  const [answer, setAnswer] = useState<WebAssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returningFromDraft = useRef(false);
  const request = useRef<AbortController | null>(null);
  const sessionScope = useId();
  const context = useQuery({
    queryKey: ["web-assistant-context", sessionScope, page],
    queryFn: ({ signal }) => getWebAssistantContext(page, signal),
    enabled: open && !invoiceDrawer.isOpen,
    staleTime: 60_000,
    retry: false,
  });

  const cancelRequest = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setPending(false);
  }, []);
  const close = useCallback(() => {
    cancelRequest();
    setOpen(false);
  }, [cancelRequest]);

  useEffect(() => {
    close();
    setQuestion("");
    setAnswer(null);
    setError(null);
    setShowAll(false);
  }, [pathname, close]);

  useEffect(() => {
    if (invoiceDrawer.isOpen) close();
    else if (returningFromDraft.current) {
      returningFromDraft.current = false;
      launcherRef.current?.focus();
    }
  }, [invoiceDrawer.isOpen, close]);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.repeat) {
        event.preventDefault();
        if (invoiceDrawer.isOpen) return;
        if (open) close();
        else setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, invoiceDrawer.isOpen, close]);

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = question.trim();
    if (!message || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    setAnswer(null);
    setShowAll(false);
    try {
      const result = await askWebAssistant(message, page, allowAI, controller.signal);
      if (!controller.signal.aborted) setAnswer(result);
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(getApiErrorMessage(failure, "I could not process that request. Please try again or use a shortcut."));
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  };

  const follow = (action: AssistantAction) => {
    if (action.kind === "invoice_draft") {
      if (!invoiceDrawer.openDraft(action.draft)) {
        setError("Close the current invoice form before opening another draft.");
        return;
      }
      returningFromDraft.current = true;
      close();
      return;
    }
    const destination = new URL(action.href, window.location.origin);
    if (destination.origin !== window.location.origin || !/^\/dashboard(?:\/|$)/.test(destination.pathname)) {
      setError("That destination is not supported. Please try another request.");
      return;
    }
    close();
    if (destination.pathname === pathname && destination.hash && !destination.search) {
      window.location.hash = destination.hash;
    } else {
      router.push(action.href);
    }
  };

  const response = answer ?? context.data;
  const actions = response?.actions ?? [];
  const visibleActions = showAll ? actions : actions.slice(0, 6);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        hidden={invoiceDrawer.isOpen}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Control+k Meta+k"
        title="Ask SuoOps (Ctrl/Cmd + K)"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/30 bg-brand-evergreen px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal md:bottom-6 md:right-6"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        Ask SuoOps
      </button>
      <Drawer
        open={open}
        onClose={close}
        title="Ask SuoOps"
        description="Find your way, understand this page, or prepare an invoice for review."
        size="max-w-lg"
        initialFocusRef={inputRef}
      >
        <div className="space-y-5 [overflow-wrap:anywhere]">
          <p className="text-xs text-slate-600">
            On: <span className="font-semibold capitalize">{page}</span>. I never save, send, charge or delete anything for you.
          </p>
          <form onSubmit={ask} className="space-y-3">
            <label className="block text-sm font-semibold text-brand-text">
              What would you like to do?
              <input
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={pending}
                maxLength={500}
                placeholder="e.g. Create an invoice for Ada"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={allowAI} disabled={pending} onChange={(event) => setAllowAI(event.target.checked)} />
                Use optional AI if needed
              </label>
              <button type="submit" disabled={pending || !question.trim()} className="inline-flex items-center gap-2 rounded-lg bg-brand-evergreen px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pending ? "Finding a next step..." : "Find a next step"}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Common requests use no AI allowance. Optional AI interprets only your request and this page name, not your business records. Your workspace AI controls and allowance still apply.
            </p>
          </form>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {context.isError && !answer && (
            <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Page shortcuts could not be loaded. You can still type a request.
              <button type="button" disabled={context.isFetching} onClick={() => void context.refetch()} className="ml-2 underline">Retry shortcuts</button>
            </div>
          )}
          {pending && (
            <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
              <p role="status">Checking supported workflows...</p>
              <button type="button" onClick={cancelRequest} className="font-semibold underline">Cancel request</button>
            </div>
          )}
          {context.isLoading && <p role="status" className="text-sm text-slate-600">Loading page guidance...</p>}
          {response && !pending && (
            <div className="space-y-3" aria-live="polite">
              <p className="text-sm leading-relaxed text-brand-text">{response.message}</p>
              {response.notice && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{response.notice}</p>}
              {response.ai_assisted && <p className="text-xs text-slate-600">AI-matched to supported SuoOps workflows.</p>}
              <div className="space-y-2">
                {visibleActions.map((action) => (
                  <div key={action.id} className="rounded-xl border border-slate-200 p-3">
                    <button type="button" onClick={() => follow(action)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-brand-evergreen hover:underline">
                      {action.title}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                    </button>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{action.description}</p>
                    {action.kind === "invoice_draft" && (
                      <p className="mt-2 text-xs text-brand-text">
                        Customer: {action.draft.customer_name || "add in form"} · Currency: {action.draft.currency}
                        {action.draft.lines.map((line, index) => (
                          <span key={index} className="mt-1 block">
                            {line.description}: {new Intl.NumberFormat("en-NG", { style: "currency", currency: action.draft.currency }).format(line.unit_price)}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {!showAll && actions.length > 6 && (
                <button type="button" onClick={() => setShowAll(true)} className="text-sm font-semibold text-brand-teal underline">
                  Show all shortcuts ({actions.length})
                </button>
              )}
              {answer && (
                <button type="button" onClick={() => { setAnswer(null); setError(null); setQuestion(""); inputRef.current?.focus(); }} className="text-sm font-semibold text-brand-teal underline">
                  Back to page help and shortcuts
                </button>
              )}
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
