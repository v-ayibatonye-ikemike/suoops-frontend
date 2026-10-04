"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 top-16 z-50 border-b border-white/10 bg-brand-evergreen px-4 pb-6 pt-4 shadow-xl">
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={close}
                className="rounded-lg px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                Features
              </a>
              <a
                href="#ai-commerce"
                onClick={close}
                className="rounded-lg px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                AI Commerce
              </a>
              <a
                href="#pricing"
                onClick={close}
                className="rounded-lg px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                Pricing
              </a>
              <Link
                href="/about"
                onClick={close}
                className="rounded-lg px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                About
              </Link>
              <a
                href="https://support.suoops.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="rounded-lg px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                Support
              </a>
              <hr className="border-white/10" />
              <Link
                href="/stores"
                onClick={close}
                className="rounded-lg border border-brand-citrus/50 px-4 py-3 text-center text-base font-semibold text-brand-citrus transition-colors hover:bg-brand-citrus hover:text-brand-evergreen"
              >
                Browse shops
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="rounded-lg bg-brand-jade px-4 py-3 text-center text-base font-semibold text-white shadow-lg transition-colors hover:bg-brand-teal"
              >
                Start selling free
              </Link>
              <Link
                href="/login"
                onClick={close}
                className="rounded-lg px-4 py-3 text-center text-base font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
