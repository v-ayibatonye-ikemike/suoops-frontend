"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { MessageCircle, ExternalLink } from "lucide-react";

import { Drawer } from "@/components/ui/drawer";
import { InvoiceCreateForm } from "@/features/invoices/invoice-create-form";
import { QuickSaleForm } from "@/features/invoices/quick-sale-form";
import { WhatsAppQuickCreate } from "@/features/dashboard/whatsapp-quick-create";

interface NewInvoiceContext {
  open: () => void;
  close: () => void;
}

const Ctx = createContext<NewInvoiceContext | null>(null);

type DrawerTab = "invoice" | "quick-sale";

/**
 * Provider for the global "+ New Invoice" slide-over.
 *
 * Hosts a single instance of `<InvoiceCreateForm />` (billing a named
 * customer) and `<QuickSaleForm />` (an already-paid walk-in sale, no
 * customer required) behind a tab switch, in a right-anchored drawer so
 * either flow can be triggered from anywhere (top nav button, mobile
 * bottom-bar, "+" FAB, keyboard shortcut, etc.) without each page embedding
 * its own form.
 *
 * The Invoice tab leads with a WhatsApp shortcut — that's our headline
 * value prop — and the web form acts as the fallback.
 */
export function NewInvoiceProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DrawerTab>("invoice");

  const value = useMemo<NewInvoiceContext>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [],
  );

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Drawer
        open={open}
        onClose={handleClose}
        title={tab === "invoice" ? "Create invoice" : "Record a sale"}
        description={
          tab === "invoice"
            ? "Send a new invoice to your customer in seconds."
            : "Log a walk-in sale that's already been paid — no customer needed."
        }
      >
        {/* Tab switch: bill a customer vs. record an already-paid walk-in sale */}
        <div className="mb-5 flex gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("invoice")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              tab === "invoice"
                ? "bg-white text-brand-text shadow-sm"
                : "text-slate-500 hover:text-brand-text"
            }`}
          >
            Invoice a customer
          </button>
          <button
            type="button"
            onClick={() => setTab("quick-sale")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              tab === "quick-sale"
                ? "bg-white text-brand-text shadow-sm"
                : "text-slate-500 hover:text-brand-text"
            }`}
          >
            Walk-in sale (paid)
          </button>
        </div>

        {tab === "invoice" ? (
          <>
            <WhatsAppQuickCreate>
              {({ onClick, href, target, rel }) => {
                const inner = (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                      <MessageCircle className="h-5 w-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-emerald-900">
                        Even faster — create on WhatsApp
                      </span>
                      <span className="mt-0.5 block text-xs text-emerald-700">
                        Text our bot &ldquo;Invoice John 50k for design&rdquo; — done in seconds.
                      </span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-emerald-600" />
                  </>
                );
                const cls =
                  "mb-5 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 transition hover:border-emerald-400 hover:bg-emerald-100 group w-full text-left";
                return href ? (
                  <a
                    href={href}
                    target={target}
                    rel={rel}
                    onClick={() => setOpen(false)}
                    className={cls}
                  >
                    {inner}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClick();
                      setOpen(false);
                    }}
                    className={cls}
                  >
                    {inner}
                  </button>
                );
              }}
            </WhatsAppQuickCreate>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              Or use the web form
            </p>
            <InvoiceCreateForm />
          </>
        ) : (
          <QuickSaleForm />
        )}
      </Drawer>
    </Ctx.Provider>
  );
}

export function useNewInvoiceDrawer(): NewInvoiceContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fail soft so call-sites outside the dashboard layout don't crash;
    // the button simply becomes a no-op rather than throwing in render.
    return { open: () => {}, close: () => {} };
  }
  return ctx;
}

