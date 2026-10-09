import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";

const articles: { slug: string; title: string; description: string }[] = [
  {
    slug: "track-stock",
    title: "Track your inventory and stock levels",
    description: "Set up products, monitor stock, and get alerts when running low"
  },
  {
    slug: "low-stock-alerts",
    title: "Set up low-stock alerts",
    description: "Get notified before you run out of products to sell"
  },
  {
    slug: "products",
    title: "Add and manage products",
    description: "Create your product catalog with prices and stock quantities"
  }
];

export default function InventoryPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Inventory & Stock</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Inventory & Stock</h1>
              <p className="text-slate-600">Track products and get low-stock alerts</p>
            </div>
          </div>
          <p className="text-slate-600 mt-4">
            Suoops helps you manage your product inventory so you always know what&apos;s in stock. 
            Set up alerts to get notified before you run out.
          </p>
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/inventory/${article.slug}`}
              className="block rounded-xl border border-slate-200 bg-white p-6 hover:border-orange-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <Package className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{article.title}</h3>
                  <p className="text-sm text-slate-600">{article.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 ml-auto shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-6">
          <p className="text-sm text-slate-600">
            📝 More inventory articles coming soon. Need help with something specific?{" "}
            <Link href="/contact" className="text-emerald-600 hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
