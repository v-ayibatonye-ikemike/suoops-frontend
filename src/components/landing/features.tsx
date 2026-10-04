import {
  BarChart3,
  CheckCircle2,
  HandCoins,
  MessageCircle,
  Package,
  ShoppingBag,
  Truck,
  type LucideIcon,
} from "lucide-react";

export function Features() {
  return (
    <>
      {/* How It Works */}
      <section id="features" className="bg-brand-mint px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-brand-evergreen sm:text-4xl">
              From scattered chats to one clear system
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-charcoal/70">
              Keep selling the way you already do. SuoOps records the orders,
              payments, stock, expenses, and follow-ups you should not have to remember.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              number={1}
              title="Create by texting"
              description='Message "Invoice John ₦50k for design" — or use the dashboard. We turn it into a payment-ready invoice instantly.'
            />
            <StepCard
              number={2}
              title="Send instantly"
              description="Send on WhatsApp or download a PDF, with clear transfer details for any Nigerian bank."
            />
            <StepCard
              number={3}
              title="Customers order & pay online"
              description="Share your storefront link — customers pay by transfer (held under buyer protection) and pick a courier for delivery right at checkout."
            />
            <StepCard
              number={4}
              title="Ship & track everything"
              description="Mark the order sent and book an available rider. See who's paid, what stock is low, what is overdue, and what needs attention next."
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-brand-evergreen sm:text-4xl">
              Everything you need to run your business
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <FeatureCard
              icon={CheckCircle2}
              title="Sell from chat or dashboard"
              features={[
                "Create branded invoices by WhatsApp text, voice, photo, or web",
                "Sell through a public storefront, checkout, payment links, and QR codes",
                "Track paid, pending, overdue, and buyer-protected orders",
                "Send invoices and receipts through WhatsApp, email, or PDF",
              ]}
              highlight="Keep selling the way you already do—SuoOps adds the structure."
            />
            <FeatureCard
              icon={ShoppingBag}
              title="Get paid with confidence"
              features={[
                "Accept verified online payments or confirm bank transfers",
                "Generate payment-ready invoices and paid receipts",
                "Protect eligible storefront orders until delivery or the applicable protection window",
                "Track settlement, payout, and dispute status without payment screenshots",
              ]}
              highlight="Real payment records for sellers; clear protection for buyers."
            />
            <FeatureCard
              icon={Truck}
              title="Deliver across Nigeria"
              features={[
                "Customers pick a courier and pay for delivery right at checkout",
                "Compare available nationwide courier options for their route",
                "Book the selected rider when the order is ready",
                "Track pickup, transit, delivery, and buyer confirmation",
              ]}
              highlight="Sell to anyone in Nigeria — delivery is built in."
              note="Courier options, prices, and delivery times vary by route, parcel, and live availability."
            />
            <FeatureCard
              icon={Package}
              title="Run stock and purchasing"
              features={[
                "Manage products, categories, suppliers, SKUs, and barcodes",
                "Update stock automatically when you sell or receive goods",
                "See low stock, stock cover, sales velocity, and slow-moving products",
                "Prepare supplier-linked draft purchase orders",
              ]}
            />
            <FeatureCard
              icon={HandCoins}
              title="Recover revenue and control cash"
              features={[
                "Prioritize overdue invoices by amount, age, and urgency",
                "Review and edit reminders before sending anything",
                "Track expenses, collections, and cash position",
                "Understand margins and customer concentration",
              ]}
            />
            <FeatureCard
              icon={BarChart3}
              title="See what the business is doing"
              features={[
                "Monitor revenue, conversion, cash, margin, and storefront performance",
                "Give team members one shared operating workspace",
                "Understand Nigerian tax obligations and generate reports",
                "Get a grounded daily briefing and recommended next steps",
              ]}
              note="Tax tools support business administration and are not legal or financial advice."
              highlight="Less guessing. More visible, traceable decisions."
            />
          </div>

          <div className="mt-10 rounded-2xl border border-brand-jade/20 bg-brand-mint p-6 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-brand-jade" />
            <h3 className="mt-3 text-xl font-bold text-brand-evergreen">
              WhatsApp is still your fastest way in
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-brand-charcoal/70">
              Create invoices, use voice notes, receive alerts, check what is
              owed, and ask grounded business questions where your customer
              conversations already happen.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

interface StepCardProps {
  number: number;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="relative text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-jade text-lg font-bold text-white shadow-lg">
        {number}
      </div>
      <h3 className="mt-4 text-lg font-bold text-brand-evergreen">{title}</h3>
      <p className="mt-2 text-sm text-brand-charcoal/70">{description}</p>
    </div>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  features: string[];
  note?: string;
  highlight?: string;
}

function FeatureCard({ icon: Icon, title, features, note, highlight }: FeatureCardProps) {
  return (
    <div className="p-6 bg-brand-mint rounded-xl">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-brand-evergreen">
        <Icon className="h-5 w-5 shrink-0 text-brand-jade" />
        {title}
      </h3>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-brand-charcoal/80">
            <span className="text-brand-jade mt-1">•</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {note && (
        <div className="mt-4 p-3 bg-brand-jade/10 rounded-lg text-sm text-brand-charcoal/80">
          {note}
        </div>
      )}
      {highlight && (
        <p className="mt-4 font-semibold text-brand-jade">
          {highlight}
        </p>
      )}
    </div>
  );
}
