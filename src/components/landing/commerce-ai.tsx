import {
  Boxes,
  HandCoins,
  MessageSquareText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";

const assistants = [
  {
    icon: Sparkles,
    title: "Commerce Copilot",
    text: "Start each day with verified cash, collection, inventory, and storefront priorities.",
  },
  {
    icon: HandCoins,
    title: "Collections Assistant",
    text: "Prioritize overdue invoices and prepare reminders you review before anything is sent.",
  },
  {
    icon: Boxes,
    title: "Inventory Adviser",
    text: "Understand sales velocity, stock cover, slow stock, and suggested reorder quantities.",
  },
  {
    icon: Store,
    title: "Storefront Adviser",
    text: "Improve product listings, merchandising, bundles, and margin-safe promotions.",
  },
  {
    icon: ShoppingBag,
    title: "Buyer Shopping Assistant",
    text: "Help shoppers find in-stock products that fit their budget and delivery needs.",
  },
  {
    icon: MessageSquareText,
    title: "Dispute Evidence Assistant",
    text: "Give trained reviewers a neutral timeline, evidence gaps, and questions—not a verdict.",
  },
];

export function CommerceAI() {
  return (
    <section id="ai-commerce" className="bg-brand-evergreen px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-citrus/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-citrus">
              <Sparkles className="h-3.5 w-3.5" />
              Governed commerce AI
            </span>
            <h2 className="mt-5 font-heading text-3xl font-bold sm:text-4xl">
              AI grounded in how your business actually runs
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">
              SuoOps uses your verified business records to explain what needs
              attention, draft useful content, and help buyers discover products.
              Your prices, stock, money, and customer relationships stay under
              your control.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-citrus" />
                <div>
                  <p className="font-semibold">You approve consequential actions</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    AI cannot send reminders, change stock, publish promotions,
                    create live purchase orders, move money, or resolve disputes
                    without the required human decision.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {assistants.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-jade/20">
                  <Icon className="h-5 w-5 text-brand-citrus" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
