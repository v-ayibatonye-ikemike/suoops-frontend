/**
 * Buyer-protection notice shown on the public storefront + marketplace.
 *
 * Explain time-limited protection without promising delivery or an instant refund.
 */
export function BuyerProtectionNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <div className="text-sm">
        <p className="font-semibold text-emerald-900">
          Shop safely — you&apos;re protected
        </p>
        <p className="mt-0.5 text-emerald-800">
          Online payments are held during your buyer-protection window.
          If your order doesn&apos;t arrive or isn&apos;t as agreed,{" "}
          <a
            href="mailto:support@suoops.com?subject=I%20didn%27t%20receive%20my%20order"
            className="font-semibold underline underline-offset-2 hover:text-emerald-900"
          >
            report it
          </a>{" "}
          promptly so SuoOps can review the issue before funds are released.
        </p>
        <p className="mt-1 text-emerald-800">
          Choose an available courier at checkout. The seller prepares your order
          and books dispatch through SuoOps — you don&apos;t need to call a rider.
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Protection timing depends on your order and delivery route. Only confirm
          receipt after you&apos;ve received what you paid for. Confirmation ends buyer protection.
        </p>
      </div>
    </div>
  );
}
