"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, HelpCircle, FileText, CreditCard, MessageCircle, Shield, Truck } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  faqs: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    title: "Getting Started",
    icon: <HelpCircle className="h-5 w-5" />,
    faqs: [
      {
        question: "How do I create my first invoice?",
        answer: "You have two options: (1) From the dashboard, click 'New Invoice', fill in customer name, phone, and line items, then click 'Create'. (2) Via WhatsApp, message our bot with: 'Invoice [Name] [Phone], [Amount] [Item]' - e.g., 'Invoice Joy 08012345678, 12000 wig'."
      },
      {
        question: "Is Suoops free to use?",
        answer: "SuoOps has no subscriptions or feature tiers. The full toolkit includes custom branding, tax reports, inventory, team access and your storefront. Transaction-based fees start at 0.5%: you pay 0.5% per manual invoice (minimum ₦100, capped at ₦400 for invoices under ₦500,000 — uncapped 0.5% above), and 3% on storefront orders paid online. New accounts also start with a small wallet balance so you can send your first invoices at no cost."
      },
      {
        question: "How do I set up my business profile?",
        answer: "Go to Settings in your dashboard. You can add your business name, upload a logo (appears on all invoices), and add your bank account details for customers to pay you."
      },
      {
        question: "Can I use SuoOps on my phone?",
        answer: "Yes! SuoOps works on any device. You can use our web dashboard at suoops.com, or create invoices directly via WhatsApp by messaging our bot."
      },
      {
        question: "What can SuoOps AI do?",
        answer: "SuoOps AI can explain your daily priorities, help with overdue collections, inventory reordering, storefront listings, buyer product discovery and dispute evidence. It works from verified SuoOps records. You still approve messages, stock actions, purchase drafts and promotions, and AI cannot move money or decide disputes."
      }
    ]
  },
  {
    title: "Invoicing",
    icon: <FileText className="h-5 w-5" />,
    faqs: [
      {
        question: "Can I add my logo to invoices?",
        answer: "Yes! Upload your business logo in Settings and it will appear on all your PDF invoices. Custom branding is free — every feature is included; you only pay 0.5% when you invoice."
      },
      {
        question: "How do I add VAT/Tax to invoices?",
        answer: "Tax features are free for everyone. When creating an invoice, enable tax calculation and the system automatically computes VAT and the development levy."
      },
      {
        question: "How do invoices get sent to customers?",
        answer: "When you include a customer's phone number, they receive a WhatsApp notification with invoice details. If you add their email, they also get an email with the PDF attached."
      },
      {
        question: "How do I track payment status?",
        answer: "View all invoices in your dashboard. Each invoice shows its status (pending, paid, etc.). When a customer pays, click 'Mark as Paid' to update the status and optionally send a receipt."
      },
      {
        question: "Can I download invoices as PDF?",
        answer: "Yes! Every invoice can be downloaded as a professional PDF. PDFs include your logo, business details, bank account info, and a QR code for payment verification."
      }
    ]
  },
  {
    title: "Pricing & Wallet",
    icon: <CreditCard className="h-5 w-5" />,
    faqs: [
      {
        question: "How does pricing work?",
        answer: "Suoops is free with every feature included, and fees are as low as 0.5%. Manual invoices cost 0.5% (minimum ₦100, capped at ₦400 for invoices under ₦500,000 — uncapped 0.5% above), taken from your prepaid wallet when you create the invoice. Storefront/online orders are 3% (capped at ₦2,000 per ₦500,000), taken from the customer's payment. No plans, no monthly fees."
      },
      {
        question: "Do I need a subscription?",
        answer: "No. There are no subscriptions or plans. Custom branding, tax reports, inventory, team access, governed AI and your storefront are all included. You simply fund a prepaid wallet and pay 0.5% per manual invoice (3% on storefront orders paid online)."
      },
      {
        question: "What is the invoice wallet?",
        answer: "The prepaid wallet funds manual invoicing. Each manual invoice costs just 0.5% (min ₦100, capped ₦400 under ₦500,000 — uncapped above), deducted when you create it. Top up anytime — ₦1,250, ₦5,000 or ₦20,000 — from Settings → Billing. New accounts start with a small free balance."
      },
      {
        question: "How do online payments work?",
        answer: "Turn on online payments and share your storefront link. Customers pay by card or bank transfer, the money settles to your bank account via Paystack, and Suoops keeps a flat 3% commission. Nothing is charged upfront for storefront orders."
      },
      {
        question: "What happens if my wallet runs out?",
        answer: "You can still receive storefront/online payments — the 3% is simply taken from each payment. To keep creating manual invoices, top up your wallet from Settings → Billing. Your data and history are always preserved."
      },
      {
        question: "Are there any other fees?",
        answer: "Just 0.5% per manual invoice (minimum ₦100, capped at ₦400 below ₦500,000, then uncapped) and 3% on storefront orders paid online. Courier delivery is quoted separately, and a small payment-processing fee from the payment provider may also apply."
      }
    ]
  },
  {
    title: "Storefront & Delivery",
    icon: <Truck className="h-5 w-5" />,
    faqs: [
      {
        question: "How does my online storefront work?",
        answer: "Turn on your storefront and share your shop link (suoops.com/store/your-name) anywhere — WhatsApp, Instagram, your bio. Customers browse your products, place an order, and pay online. Eligible orders include payment protection through delivery, then cleared funds settle to your bank."
      },
      {
        question: "How does delivery work?",
        answer: "At checkout the customer sees available courier options (including GIG, Fez, Sendbox, Gokada and others where available) with live prices and delivery times, picks one, and pays for delivery as part of their order. When you're ready to ship, open the order and mark it 'Sent' — SuoOps books the selected courier. Options vary by route, parcel and live courier availability."
      },
      {
        question: "Who pays for delivery?",
        answer: "The customer chooses and pays for delivery at checkout, on top of the item price — you don't fund it. The courier is booked from the delivery fee the buyer paid. Buyers who don't need delivery (a service, or self-pickup) can choose 'I don't need delivery'."
      },
      {
        question: "Is my payment protected as a buyer?",
        answer: "Your payment is protected through delivery on eligible storefront orders. If something goes wrong — such as a wrong item or non-delivery — report the problem for evidence-based review before funds are released. Your bank transfer is verified and no card details are stored by SuoOps."
      },
      {
        question: "When do I (the seller) get paid for a storefront order?",
        answer: "The buyer pays up front, but eligible orders are held under buyer protection. For a courier order you're settled after delivery and the applicable inspection window; for pickup orders, after the buyer confirms or the protection window ends. Cleared payouts are sent to your Nigerian bank during the next settlement run."
      }
    ]
  },
  {
    title: "WhatsApp Bot",
    icon: <MessageCircle className="h-5 w-5" />,
    faqs: [
      {
        question: "How do I connect my WhatsApp?",
        answer: "Go to Settings in your dashboard and enter your WhatsApp phone number (with country code, e.g., +2348012345678). Save, then message the SuoOps bot to start creating invoices."
      },
      {
        question: "How do I create invoices via WhatsApp?",
        answer: "Message the SuoOps bot with: 'Invoice [Customer Name] [Phone], [Amount] [Item]'. Example: 'Invoice Joy 08012345678, 12000 wig'. You can also send voice notes!"
      },
      {
        question: "Why does my customer need to reply 'OK'?",
        answer: "WhatsApp requires customers to opt-in before receiving detailed messages. After they reply once, they'll automatically receive full invoice details and PDFs for future invoices."
      },
      {
        question: "What notifications do I receive on WhatsApp?",
        answer: "You receive confirmation when invoices are created and when customers confirm payment. Your customers receive invoice details and payment instructions."
      }
    ]
  },
  {
    title: "Account & Security",
    icon: <Shield className="h-5 w-5" />,
    faqs: [
      {
        question: "How do I log in?",
        answer: "Go to suoops.com and click 'Login'. You can log in with your phone number (OTP sent via WhatsApp) or with Google/email if you signed up that way."
      },
      {
        question: "Is my data secure?",
        answer: "Yes! We use bank-level encryption (SSL/TLS) for all data. Your passwords are hashed, and we never store sensitive payment card details."
      },
      {
        question: "Can I download my invoices?",
        answer: "Yes, you can download any invoice as a PDF from your dashboard. Click on an invoice and use the download button."
      },
      {
        question: "How do I delete my account?",
        answer: "Go to Settings → scroll to 'Danger Zone' → Click 'Delete Account'. You'll need to confirm by typing 'DELETE MY ACCOUNT'. This action is permanent and cannot be undone."
      }
    ]
  }
];

function FAQAccordion({ category }: { category: FAQCategory }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {category.faqs.map((faq, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-slate-900">{faq.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-slate-400 transition-transform ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-5 pb-4">
              <p className="text-slate-600">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">FAQ</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Find quick answers to common questions about SuoOps. Can&apos;t find what 
            you&apos;re looking for? <Link href="/contact" className="text-emerald-600 hover:underline">Contact us</Link>.
          </p>
        </div>

        {/* FAQ Content */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Category Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2 sticky top-20">
              {faqCategories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setActiveCategory(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeCategory === index
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={activeCategory === index ? "text-emerald-600" : "text-slate-400"}>
                    {category.icon}
                  </span>
                  {category.title}
                </button>
              ))}
            </nav>
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <span className="text-emerald-600">{faqCategories[activeCategory].icon}</span>
                {faqCategories[activeCategory].title}
              </h2>
            </div>
            <FAQAccordion category={faqCategories[activeCategory]} />
          </div>
        </div>

        {/* Still Need Help */}
        <div className="mt-16 rounded-2xl bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Still have questions?
          </h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">
            Our support team is here to help. Send us a message and we&apos;ll get back 
            to you within 24 hours.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
