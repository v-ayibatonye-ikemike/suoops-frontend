import {
  MessageCircle,
  Package,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export function Features() {
  return (
    <>
      {/* How It Works */}
      <section id="features" className="scroll-mt-20 bg-brand-mint px-4 py-20 sm:px-6 lg:px-8">
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
              description="Share your storefront link — customers pay by transfer with protection on eligible orders and pick a courier for delivery at checkout."
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
              Sell, get paid, and run everything in one place
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-charcoal/70">
              Four connected workflows replace scattered tools, screenshots,
              notebooks, and follow-up lists.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <FeatureCard
              icon={ShoppingBag}
              title="Sell anywhere"
              description="Turn WhatsApp conversations into invoices, or sell through your storefront, QR codes, payment links, and online checkout."
              detail="Keep selling the way you already do—SuoOps adds the structure."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Get paid and deliver safely"
              description="Work from verified payments, protect eligible storefront orders, and quote, book, and track available couriers."
              detail="Courier options, prices, and delivery times vary by route, parcel, and live availability."
            />
            <FeatureCard
              icon={Package}
              title="Run the business"
              description="Manage inventory, expenses, purchasing, tax records, analytics, and team operations in one traceable workspace."
              detail="Know what was sold, spent, received, and changed without reconstructing it later."
            />
            <FeatureCard
              icon={Sparkles}
              title="Know what needs attention"
              description="See overdue collections, cash movement, low stock, margins, and grounded Copilot priorities before they become problems."
              detail="Less guessing. More visible, traceable decisions."
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
  description: string;
  detail: string;
}

function FeatureCard({ icon: Icon, title, description, detail }: FeatureCardProps) {
  return (
    <div className="p-6 bg-brand-mint rounded-xl">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-brand-evergreen">
        <Icon className="h-5 w-5 shrink-0 text-brand-jade" />
        {title}
      </h3>
      <p className="leading-relaxed text-brand-charcoal/80">{description}</p>
      <p className="mt-4 text-sm font-semibold leading-relaxed text-brand-jade">
        {detail}
      </p>
    </div>
  );
}
