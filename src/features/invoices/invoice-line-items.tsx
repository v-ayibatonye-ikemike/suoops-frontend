import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useProducts } from "@/features/inventory";
import type { Product } from "@/features/inventory";
import { useCurrency } from "@/hooks/use-currency";

export interface LineDraft {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  product_id?: number | null;  // Link to inventory product
}

interface InvoiceLineItemsProps {
  lines: LineDraft[];
  onUpdateLine: (id: string, patch: Partial<LineDraft>) => void;
  onRemoveLine: (id: string) => void;
  onAddLine: () => void;
  showProductPicker?: boolean;  // Enable inventory product selection
  /** The invoice's own currency — determines symbol and formatting (no conversion). */
  currency?: "NGN" | "USD";
}

/** Format an amount using the invoice's own currency (no exchange-rate conversion). */
function fmtInvoice(amount: number, cur: string): string {
  const sym = cur === "USD" ? "$" : "₦";
  return `${sym}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function ProductSelector({
  value,
  onSelect,
  currency = "NGN",
  convertPrice,
}: {
  value?: number | null;
  onSelect: (product: Product | null) => void;
  currency?: string;
  /** Convert NGN product price to the invoice currency. */
  convertPrice?: (ngn: number) => number;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useProducts({ search, page_size: 10 });

  const products = data?.products ?? [];
  const selectedProduct = value
    ? products.find((p) => p.id === value)
    : null;

  return (
    <div className="relative">
      <input
        type="text"
        value={selectedProduct ? selectedProduct.name : search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder="Search products..."
        className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-jade focus:ring-2 focus:ring-brand-jade/20"
      />
      {showDropdown && products.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-brand-border bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setSearch("");
              setShowDropdown(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
          >
            Clear selection
          </button>
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product);
                setSearch("");
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-brand-jade/5"
            >
              <div className="font-medium text-brand-text">{product.name}</div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>SKU: {product.sku}</span>
                <span>{fmtInvoice(convertPrice ? convertPrice(product.selling_price) : product.selling_price, currency)}</span>
                <span className={product.quantity_in_stock > 0 ? "text-green-600" : "text-red-500"}>
                  Stock: {product.quantity_in_stock}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function InvoiceLineItems({
  lines,
  onUpdateLine,
  onRemoveLine,
  onAddLine,
  showProductPicker = false,
  currency = "NGN",
}: InvoiceLineItemsProps) {
  const symbol = currency === "USD" ? "$" : "₦";
  const { exchangeRate } = useCurrency();
  const usdExchangeRate =
    exchangeRate != null && Number.isFinite(exchangeRate) && exchangeRate > 0
      ? exchangeRate
      : null;

  /** Convert an NGN product price to the invoice currency. */
  const convertPrice = (ngnPrice: number): number => {
    if (currency !== "USD") return ngnPrice;
    if (usdExchangeRate === null) {
      throw new Error("A valid exchange rate is required to select a product for a USD invoice.");
    }
    return Math.round((ngnPrice / usdExchangeRate) * 100) / 100;
  };

  const handleProductSelect = (lineId: string, product: Product | null) => {
    if (product) {
      onUpdateLine(lineId, {
        product_id: product.id,
        description: product.name,
        unit_price: convertPrice(product.selling_price),
      });
    } else {
      onUpdateLine(lineId, {
        product_id: null,
      });
    }
  };

  return (
    <section className="rounded-lg border border-brand-border bg-white p-6 shadow-card">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-text">Line items</h3>
          <p className="text-xs text-brand-textMuted mt-0.5">What your customer is paying for</p>
        </div>
        <Button type="button" size="sm" onClick={onAddLine}>
          Add line
        </Button>
      </header>
      {showProductPicker && currency === "USD" && usdExchangeRate === null && (
        <p role="status" className="mb-3 text-sm text-amber-700">
          The exchange rate is unavailable. Enter the USD price manually or switch to NGN.
        </p>
      )}
      <div className="space-y-3">
        {lines.map((line) => (
          <div
            key={line.id}
            className="space-y-2"
          >
            {/* Product Picker Row (when enabled) */}
            {showProductPicker && (currency !== "USD" || usdExchangeRate !== null) && (
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-[1fr_auto]">
                <ProductSelector
                  value={line.product_id}
                  onSelect={(product) => handleProductSelect(line.id, product)}
                  currency={currency}
                  convertPrice={convertPrice}
                />
                <span className="text-xs text-gray-500 self-center">
                  {line.product_id ? "Linked to inventory" : "Optional: link to product"}
                </span>
              </div>
            )}
            {/* Line Details Row */}
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[2fr_repeat(3,_minmax(80px,_1fr))_auto]">
              <div className="sm:col-span-2 md:col-span-1">
                <label htmlFor={`line-${line.id}-description`} className="mb-1 block text-xs font-medium text-brand-textMuted">Description</label>
                <input
                  id={`line-${line.id}-description`}
                  value={line.description}
                  onChange={(e) => onUpdateLine(line.id, { description: e.target.value })}
                  placeholder="What are you charging for?"
                  className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2 md:col-span-3 md:grid-cols-3">
                <div>
                  <label htmlFor={`line-${line.id}-quantity`} className="mb-1 block text-xs font-medium text-brand-textMuted">Qty</label>
                  <input
                    id={`line-${line.id}-quantity`}
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => onUpdateLine(line.id, { quantity: Number(e.target.value) })}
                    placeholder="1"
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor={`line-${line.id}-price`} className="mb-1 block text-xs font-medium text-brand-textMuted">Unit Price ({symbol})</label>
                  <input
                    id={`line-${line.id}-price`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => onUpdateLine(line.id, { unit_price: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-brand-textMuted">Total <span className="text-brand-jade">(auto)</span></label>
                  <div className="rounded-lg border border-brand-border bg-gray-50 px-3 py-2 text-sm font-medium text-brand-text">
                    {fmtInvoice((line.quantity || 0) * (line.unit_price || 0), currency)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveLine(line.id)}
                disabled={lines.length === 1}
                className="justify-self-start sm:justify-self-end md:justify-self-start text-sm font-semibold text-brand-jade transition hover:text-brand-jade/80 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 md:col-span-1"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Grand Total */}
      <div className="mt-4 flex items-center justify-end gap-4 border-t border-brand-border pt-4">
        <span className="text-sm font-medium text-brand-textMuted">Invoice Total:</span>
        <div className="rounded-lg bg-brand-jade/10 px-4 py-2 text-lg font-bold text-brand-jade">
          {fmtInvoice(lines.reduce((sum, line) => sum + ((line.quantity || 0) * (line.unit_price || 0)), 0), currency)}
        </div>
      </div>
    </section>
  );
}
