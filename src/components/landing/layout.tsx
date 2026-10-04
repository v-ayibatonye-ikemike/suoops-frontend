"use client";

import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";

import { MobileMenu } from "./mobile-menu";
import { useRegisterHref } from "@/hooks/use-tracking-params";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-brand-evergreen/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 shadow-lg ring-1 ring-white/20">
              <Image
                src="/icon.png"
                alt="SuoOps"
                width={40}
                height={40}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
            <span className="text-lg font-bold text-white">SuoOps</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#features"
              className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#ai-commerce"
              className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              AI Commerce
            </a>
            <a
              href="#pricing"
              className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/about"
              className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/stores"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-brand-jade/60 px-3 py-1.5 text-sm font-semibold text-brand-jade transition-colors hover:bg-brand-jade hover:text-white"
            >
              <Store className="h-4 w-4" />
              Browse Shops
            </Link>
            <a
              href="https://support.suoops.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
            >
              Support
            </a>
            <Link
              href="/login"
              className="hidden sm:block rounded-lg bg-brand-jade px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-teal"
            >
              Login
            </Link>
            {/* Mobile hamburger menu */}
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}

// PreLaunchBanner removed - product is now live

export function CTASection() {
  const registerHref = useRegisterHref();
  return (
    <section className="relative bg-brand-evergreen px-4 py-20 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Ready to run your whole business in one place?
        </h2>
        <p className="mt-4 text-lg text-white/80">
          Set up your storefront, take payments, manage stock and expenses,
          recover overdue revenue, and get grounded AI guidance—with buyer
          protection built in. Free to start, in minutes.
        </p>
        <Link
          href={registerHref}
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-jade px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:scale-105 hover:bg-brand-teal"
        >
          Get Started Free
        </Link>
        <p className="mt-6 text-sm text-white/60">
          ✓ Free to start · ✓ No credit card required
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-brand-teal/10 bg-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-evergreen">
                <Image
                  src="/icon.png"
                  alt="SuoOps"
                  width={32}
                  height={32}
                  className="h-6 w-6 object-contain"
                  priority
                />
              </div>
              <span className="text-lg font-bold text-brand-evergreen">SuoOps</span>
            </div>
            <p className="mt-4 text-sm text-brand-charcoal/70">
              The commerce operating system for African business — sell, get paid,
              manage operations, and grow.
            </p>
            {/* Social media links */}
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://instagram.com/suoops4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-mint text-brand-charcoal/60 transition-colors hover:bg-brand-evergreen hover:text-white"
                aria-label="Instagram"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a
                href="https://x.com/suoops4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-mint text-brand-charcoal/60 transition-colors hover:bg-brand-evergreen hover:text-white"
                aria-label="X (Twitter)"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a
                href="https://tiktok.com/@suoops4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-mint text-brand-charcoal/60 transition-colors hover:bg-brand-evergreen hover:text-white"
                aria-label="TikTok"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
              <a
                href="https://facebook.com/suoops4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-mint text-brand-charcoal/60 transition-colors hover:bg-brand-evergreen hover:text-white"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a
                href="https://linkedin.com/company/suoops"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-mint text-brand-charcoal/60 transition-colors hover:bg-brand-evergreen hover:text-white"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-brand-evergreen">Product</h4>
            <ul className="mt-4 space-y-2 text-sm text-brand-charcoal/70">
              <li>
                <a href="#features" className="hover:text-brand-jade transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-brand-jade transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/stores" className="hover:text-brand-jade transition-colors">
                  Shops
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-brand-jade transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-brand-evergreen">Company</h4>
            <ul className="mt-4 space-y-2 text-sm text-brand-charcoal/70">
              <li>
                <Link href="/about" className="hover:text-brand-jade transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a 
                  href="https://support.suoops.com/contact" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-jade transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://support.suoops.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-jade transition-colors"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="https://api.suoops.com/healthz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-jade transition-colors"
                >
                  Status
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-jade transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-brand-evergreen">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-brand-charcoal/70">
              <li>
                <Link href="/privacy" className="hover:text-brand-jade transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-jade transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-brand-teal/10 pt-8 text-center text-sm text-brand-charcoal/50">
          © 2025–2026 SuoOps. All rights reserved. Made with <span aria-hidden="true">❤️</span> in Nigeria <span aria-hidden="true">🇳🇬</span>
        </div>
      </div>
    </footer>
  );
}

// WaitlistCounter removed - product is now live

export function VideoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-slate-300 text-4xl font-light"
          aria-label="Close video"
        >
          ×
        </button>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl">
          <iframe
            src="https://www.youtube.com/embed/l5VocoSn7yc?autoplay=1"
            title="SuoOps Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
