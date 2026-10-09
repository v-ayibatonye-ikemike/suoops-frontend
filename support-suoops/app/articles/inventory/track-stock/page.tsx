import Link from "next/link";
import { ChevronRight, Package, Clock, TrendingDown, Bell } from "lucide-react";

export default function TrackStockArticle() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles" className="hover:text-emerald-600">Articles</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/articles/inventory" className="hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900">Track Stock</span>
        </nav>

        {/* Article Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
              <Package className="h-3 w-3" />
              Inventory
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              4 min read
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Track Your Inventory and Stock Levels
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Never run out of stock or oversell again. Suoops helps you monitor what you have and what you need to restock.
          </p>
        </div>

        {/* Key Benefit */}
        <div className="mb-8 rounded-xl bg-orange-50 border border-orange-200 p-6">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900 mb-1">Stay Ahead of Stockouts</h3>
              <p className="text-sm text-orange-800">
                Know exactly what you have in stock before you invoice. Avoid awkward situations where you sell something you don&apos;t have.
              </p>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <article className="prose prose-slate prose-emerald max-w-none">
          <h2>What is Inventory Tracking?</h2>
          <p>
            Inventory tracking means keeping count of your products. Every time you sell something, 
            Suoops automatically reduces your stock count. When you restock, you add more.
          </p>
          <p>
            This helps you:
          </p>
          <ul>
            <li><strong>Know what you have</strong> - Check stock levels anytime</li>
            <li><strong>Avoid overselling</strong> - Don&apos;t invoice for items you don&apos;t have</li>
            <li><strong>Plan restocking</strong> - See what&apos;s running low</li>
            <li><strong>Track best sellers</strong> - Know which products move fastest</li>
          </ul>

          <h2>How to Set Up Inventory</h2>

          <h3>Step 1: Add Your Products</h3>
          <ol>
            <li>Go to <strong>Inventory</strong> in the sidebar</li>
            <li>Click <strong>&quot;Add Product&quot;</strong></li>
            <li>Enter product details:
              <ul>
                <li><strong>Product Name</strong> - What you&apos;re selling</li>
                <li><strong>Price</strong> - How much per unit</li>
                <li><strong>Stock Quantity</strong> - How many you have right now</li>
                <li><strong>Low Stock Alert</strong> - When to notify you (optional)</li>
              </ul>
            </li>
            <li>Click <strong>&quot;Save Product&quot;</strong></li>
          </ol>

          <div className="not-prose my-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Pro Tip: Set Low Stock Alerts
                </p>
                <p className="text-sm text-blue-800">
                  When adding a product, set a &quot;Low Stock Alert&quot; threshold (e.g., 5 units). 
                  You&apos;ll get notified before you run out.
                </p>
              </div>
            </div>
          </div>

          <h3>Step 2: Stock Reduces Automatically</h3>
          <p>
            When you create an invoice with a product:
          </p>
          <ol>
            <li>You select the product from your inventory</li>
            <li>Choose the quantity (e.g., 3 units)</li>
            <li>When the invoice is marked as <strong>Paid</strong>, stock automatically reduces by 3</li>
          </ol>
          <p>
            No manual counting needed — Suoops tracks it for you.
          </p>

          <h3>Step 3: Restock When Running Low</h3>
          <p>
            When you buy new inventory:
          </p>
          <ol>
            <li>Go to <strong>Inventory</strong></li>
            <li>Find the product that&apos;s running low</li>
            <li>Click <strong>&quot;Restock&quot;</strong> button</li>
            <li>Enter how many new units you bought</li>
            <li>Stock count updates automatically</li>
          </ol>

          <h2>Viewing Stock Levels</h2>

          <h3>Inventory Dashboard</h3>
          <p>
            The Inventory page shows all your products with:
          </p>
          <ul>
            <li><strong>Product name and image</strong></li>
            <li><strong>Current stock quantity</strong></li>
            <li><strong>Price per unit</strong></li>
            <li><strong>Status badges</strong> - In Stock, Low Stock, Out of Stock</li>
            <li><strong>Last restocked date</strong></li>
          </ul>

          <h3>Stock Status Indicators</h3>
          <div className="not-prose space-y-3 my-6">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">In Stock</p>
                  <p className="text-xs text-slate-600">
                    Plenty available. You can confidently invoice for this product.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Low Stock</p>
                  <p className="text-xs text-slate-600">
                    Below your alert threshold. Time to restock soon.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-red-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">Out of Stock</p>
                  <p className="text-xs text-slate-600">
                    Zero units available. Cannot invoice until restocked.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h2>Using Inventory When Invoicing</h2>
          <p>
            When creating an invoice:
          </p>
          <ol>
            <li>Click <strong>&quot;Add Line Item&quot;</strong></li>
            <li>Select <strong>&quot;From Inventory&quot;</strong></li>
            <li>Choose the product from your list</li>
            <li>Suoops automatically fills in:
              <ul>
                <li>Product name</li>
                <li>Price per unit</li>
                <li>Current stock available</li>
              </ul>
            </li>
            <li>Enter quantity (Suoops warns if you&apos;re trying to sell more than you have)</li>
          </ol>

          <div className="not-prose my-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-amber-900 font-medium mb-1">
                  Overselling Protection
                </p>
                <p className="text-sm text-amber-800">
                  If you try to invoice for 10 units but only have 3 in stock, Suoops will show a warning: 
                  &quot;Only 3 units available. Restock or reduce quantity.&quot;
                </p>
              </div>
            </div>
          </div>

          <h2>Common Questions</h2>

          <h3>What if I don&apos;t sell physical products?</h3>
          <p>
            If you sell services (design, consulting, etc.), you don&apos;t need inventory tracking. 
            Just create invoices normally without selecting products.
          </p>

          <h3>Can I track inventory for multiple locations?</h3>
          <p>
            Not yet. Currently, inventory is tracked across your whole business. 
            Multi-location tracking is coming soon.
          </p>

          <h3>What if I manually sell something outside of Suoops?</h3>
          <p>
            You can manually adjust stock:
          </p>
          <ol>
            <li>Go to <strong>Inventory</strong></li>
            <li>Click the product</li>
            <li>Click <strong>&quot;Adjust Stock&quot;</strong></li>
            <li>Enter the adjustment (e.g., -2 if you sold 2 units elsewhere)</li>
          </ol>

          <h3>Does stock reduce when I create the invoice or when it&apos;s paid?</h3>
          <p>
            Stock reduces when the invoice is marked as <strong>Paid</strong>. This prevents stock 
            from being deducted for unpaid or cancelled invoices.
          </p>

          <h3>Can I see stock movement history?</h3>
          <p>
            Yes! Click any product, then view the <strong>&quot;Stock History&quot;</strong> tab to see:
          </p>
          <ul>
            <li>When stock was added (restocking)</li>
            <li>When stock was reduced (sales)</li>
            <li>Manual adjustments</li>
            <li>Date and quantity for each movement</li>
          </ul>

          <h2>Best Practices</h2>

          <h3>1. Count Your Stock Regularly</h3>
          <p>
            Once a week (or monthly), do a physical count of your inventory and compare it to 
            what Suoops shows. Adjust if there are differences.
          </p>

          <h3>2. Set Realistic Low Stock Alerts</h3>
          <p>
            Think about:
          </p>
          <ul>
            <li>How long it takes to restock</li>
            <li>How fast the product sells</li>
            <li>Minimum order quantities from suppliers</li>
          </ul>
          <p>
            Example: If a product takes 2 weeks to restock and you sell 5 per week, 
            set the alert to 10 units.
          </p>

          <h3>3. Keep Product Info Updated</h3>
          <p>
            When prices change, update them in your inventory. This ensures new invoices 
            use the current price.
          </p>

          <h3>4. Use Product Images</h3>
          <p>
            Upload photos of your products. This helps you (and your team) quickly identify 
            items when creating invoices.
          </p>

          <h2>Export Inventory Reports</h2>
          <p>
            Need a full inventory list for accounting or auditing?
          </p>
          <ol>
            <li>Go to <strong>Inventory</strong></li>
            <li>Click <strong>&quot;Export&quot;</strong> at the top right</li>
            <li>Choose format: PDF or CSV</li>
            <li>Download your inventory report with all products and stock levels</li>
          </ol>
        </article>

        {/* Next Steps */}
        <div className="mt-12 rounded-xl bg-slate-50 border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Related Articles</h3>
          <div className="space-y-3">
            <Link 
              href="/articles/inventory/products"
              className="flex items-center gap-3 text-sm text-emerald-600 hover:underline"
            >
              <ChevronRight className="h-4 w-4" />
              Add and manage products
            </Link>
            <Link 
              href="/articles/inventory/low-stock-alerts"
              className="flex items-center gap-3 text-sm text-emerald-600 hover:underline"
            >
              <ChevronRight className="h-4 w-4" />
              Set up low-stock alerts
            </Link>
            <Link 
              href="/articles/getting-started/first-invoice"
              className="flex items-center gap-3 text-sm text-emerald-600 hover:underline"
            >
              <ChevronRight className="h-4 w-4" />
              Create your first invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
