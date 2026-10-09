"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Tailwind max-w class for the panel. Default: "max-w-2xl". */
  size?: string;
  initialFocusRef?: RefObject<HTMLElement>;
  children: React.ReactNode;
}

let openDrawers = 0;
let previousBodyOverflow = "";

/**
 * Right-anchored slide-over panel. Used to keep heavy task flows (e.g.
 * creating an invoice) out of the dashboard's main content area so the
 * underlying overview / list stays visible until the user dismisses.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  size = "max-w-2xl",
  initialFocusRef,
  children,
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      ':is(button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), [tabindex="0"])',
    ) ?? []).filter((element) => !element.closest("[hidden], [inert]"));
    (initialFocusRef?.current ?? focusable()[0] ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      const panels = document.querySelectorAll("[data-drawer-panel]");
      if (panels[panels.length - 1] !== panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) {
          e.preventDefault();
          panel?.focus();
        } else if (e.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    if (openDrawers === 0) previousBodyOverflow = document.body.style.overflow;
    openDrawers += 1;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      openDrawers -= 1;
      if (openDrawers === 0) {
        document.body.style.overflow = previousBodyOverflow;
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
      }
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        data-drawer-panel
        className={`relative ml-auto flex h-full w-full ${size} animate-[slide-in-right_180ms_ease-out] flex-col bg-white shadow-2xl`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            {title && (
              <h2
                id={titleId}
                className="text-base font-semibold text-slate-900 sm:text-lg"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          @media (prefers-reduced-motion: reduce) {
            [data-drawer-panel] { animation: none; }
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
