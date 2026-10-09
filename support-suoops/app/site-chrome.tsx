"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-xl font-bold text-white shadow-md">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900">SuoOps</span>
              <span className="text-xs text-slate-500 -mt-1">Help Center</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Home
            </Link>
            <Link href="/articles" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Articles
            </Link>
            <Link href="/faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              FAQ
            </Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="https://suoops.com/login"
              className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
              href="https://suoops.com/register"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">
                S
              </div>
              <span className="text-lg font-bold text-slate-900">SuoOps</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Simple invoicing for Nigerian businesses. Create, send, and track invoices via WhatsApp.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Support</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/" className="text-slate-600 hover:text-emerald-600">Help Center</Link></li>
              <li><Link href="/articles" className="text-slate-600 hover:text-emerald-600">Knowledge Base</Link></li>
              <li><Link href="/faq" className="text-slate-600 hover:text-emerald-600">FAQ</Link></li>
              <li><Link href="/contact" className="text-slate-600 hover:text-emerald-600">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="https://suoops.com" className="text-slate-600 hover:text-emerald-600">Home</Link></li>
              <li><Link href="https://suoops.com/#pricing" className="text-slate-600 hover:text-emerald-600">Pricing</Link></li>
              <li><Link href="https://suoops.com/register" className="text-slate-600 hover:text-emerald-600">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="https://suoops.com/privacy" className="text-slate-600 hover:text-emerald-600">Privacy Policy</Link></li>
              <li><Link href="https://suoops.com/terms" className="text-slate-600 hover:text-emerald-600">Terms of Service</Link></li>
              <li><Link href="https://suoops.com/data-deletion" className="text-slate-600 hover:text-emerald-600">Data Deletion</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} SuoOps. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-200px)]">{children}</main>
      <Footer />
    </>
  );
}
