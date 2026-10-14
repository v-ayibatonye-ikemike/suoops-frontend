"use client";

import { useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, QrCode } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { getApiErrorMessage } from "@/api/errors";
import {
  useCreateProduct,
  useUpdateProduct,
  useCategories,
  useUploadProductImage,
} from "./use-inventory";
import { useCurrency } from "@/hooks/use-currency";
import { getStorefront } from "@/api/payments-storefront";
import { ScanToPayModal } from "./scan-to-pay-modal";
import type { Product, ProductCreate, ProductUpdate } from "./types";

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSuccess?: () => void;
  guided?: boolean;
  initialType?: "physical" | "service";
}

export function ProductForm({
  product, onClose, onSuccess, guided = false, initialType = "physical",
}: ProductFormProps) {
  const isEditing = !!product;
  const { symbol } = useCurrency();
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  // When the business runs a storefront, every listed item must carry a
  // description AND a photo (buyer protection: know what was ordered).
  const {
    data: storefront, isLoading: storefrontLoading, isError: storefrontError, refetch: retryStorefront,
  } = useQuery({
    queryKey: ["storefront"],
    queryFn: getStorefront,
  });
  const storefrontEnabled = Boolean(storefront?.enabled);

  const [formData, setFormData] = useState<ProductCreate>({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    barcode: product?.barcode ?? "",
    category_id: product?.category_id ?? undefined,
    cost_price: product?.cost_price ?? undefined,
    selling_price: product?.selling_price ?? 0,
    quantity_in_stock: product?.quantity_in_stock ?? 0,
    reorder_level: product?.reorder_level ?? 10,
    reorder_quantity: product?.reorder_quantity ?? 20,
    unit: product?.unit ?? "pcs",
    track_stock: product?.track_stock ?? initialType === "physical",
    fulfilment_type: product?.fulfilment_type ?? initialType,
  });

  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image_url ?? null
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enableScanToPay, setEnableScanToPay] = useState(false);
  const [savedProductId, setSavedProductId] = useState<number | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (storefrontLoading || storefrontError) {
      setError("Please wait for storefront requirements to load, or retry the check before saving.");
      return;
    }

    // Storefront items must show buyers a description and a real photo.
    if (storefrontEnabled) {
      if (!(formData.description ?? "").trim()) {
        setError("Add a short description so buyers know what they're getting.");
        return;
      }
      if (!imageFile && !imagePreview) {
        setError("Add a photo of this item — it's required to sell on your storefront.");
        return;
      }
    }

    try {
      let productId = product?.id;
      if (isEditing) {
        const updates: ProductUpdate & { id: number } = {
          id: product.id,
          ...formData,
        };
        await updateProduct.mutateAsync(updates);
      } else {
        const created = await createProduct.mutateAsync(formData);
        productId = created.id;
      }
      if (imageFile && productId) {
        await uploadImage.mutateAsync({ id: productId, file: imageFile });
      }
      onSuccess?.();
      // If the user opted in, show the scan-to-pay QR for the saved product
      // instead of closing straight away.
      if (enableScanToPay && productId) {
        setSavedProductId(productId);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Could not save this item. Please review the details and try again."));
    }
  };

  const isLoading =
    createProduct.isPending || updateProduct.isPending || uploadImage.isPending;
  const physical = formData.fulfilment_type === "physical";
  const guidance = !formData.name.trim()
    ? {
        title: physical ? "Name your product" : "Name your service",
        text: "Use the name customers recognise. Include the size or variant if it matters.",
        button: "Go to name", target: nameRef,
      }
    : !Number.isFinite(formData.selling_price) || formData.selling_price <= 0
      ? {
          title: "Set your selling price",
          text: `Enter what the customer pays in ${symbol}, not what it costs you.`,
          button: "Go to selling price", target: priceRef,
        }
      : storefrontEnabled && !(formData.description ?? "").trim()
        ? {
            title: "Describe what the buyer gets",
            text: "Your storefront needs a description. Explain what is included, the size or how the service works.",
            button: "Go to description", target: descriptionRef,
          }
        : storefrontEnabled && !imagePreview
          ? {
              title: "Add a photo for your storefront",
              text: "Choose a clear photo representing this item. PNG, JPEG or WebP, under 5MB.",
              button: "Go to photo", target: photoRef,
            }
          : {
              title: "Review before saving",
              text: physical
                ? "Check your opening stock: 0 means out of stock. Review the details, then choose Add item to save."
                : "Leave availability blank for an unlimited service, or enter a limit. Review the details, then choose Add item to save.",
              button: physical ? "Review opening stock" : "Review and save",
              target: physical ? quantityRef : saveRef,
            };

  return (
    <>
      <Drawer open={!savedProductId} onClose={onClose} title={isEditing ? "Edit item" : "Add item"} size="max-w-lg" initialFocusRef={nameRef}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {guided && !isEditing && (
            <section aria-label="Product setup guide" className="rounded-xl border border-brand-jade/20 bg-brand-jade/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-evergreen">Ask SuoOps guide</p>
              <p className="mt-1 text-xs text-slate-600">Nothing is saved until you choose Add item.</p>
              <div aria-live="polite">
                <h3 className="mt-3 text-sm font-semibold text-brand-text">{guidance.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{guidance.text}</p>
              </div>
              <button
                type="button"
                onClick={() => guidance.target.current?.focus()}
                className="mt-3 rounded-lg bg-brand-evergreen px-3 py-2 text-xs font-semibold text-white"
              >
                {guidance.button}
              </button>
            </section>
          )}
          {storefrontLoading && <p role="status" className="text-xs text-slate-600">Checking storefront requirements...</p>}
          {storefrontError && (
            <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              Could not check storefront requirements.{" "}
              <button type="button" onClick={() => void retryStorefront()} className="font-semibold underline">
                Retry requirements
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* What are you adding? Drives the rest of the form. Editable while
              editing too, so a service mistakenly saved as a Product (or vice
              versa) can be corrected — it only affects orders placed afterwards. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What are you adding?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={physical}
                onClick={() =>
                  setFormData({
                    ...formData,
                    track_stock: true,
                    fulfilment_type: "physical",
                  })
                }
                className={`rounded-xl border-2 p-3 text-left transition ${
                  physical
                    ? "border-brand-jade bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="text-xl">📦</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Product</div>
                <div className="text-xs text-gray-500">Something you stock &amp; count</div>
              </button>
              <button
                type="button"
                aria-pressed={!physical}
                onClick={() =>
                  setFormData({
                    ...formData,
                    track_stock: false,
                    fulfilment_type: "service",
                  })
                }
                className={`rounded-xl border-2 p-3 text-left transition ${
                  !physical
                    ? "border-brand-jade bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="text-xl">🛠️</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Service</div>
                <div className="text-xs text-gray-500">Freelance, digital — no delivery</div>
              </button>
            </div>
            {isEditing && (
              <p className="mt-2 text-xs text-gray-500">
                Changing this only affects new orders. Orders already placed keep
                the type they had at checkout.
              </p>
            )}
          </div>

          {/* Name — the essential */}
          <div>
            <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {physical ? "Product name" : "Service name"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-name`}
              ref={nameRef}
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
              placeholder={
                physical
                  ? "e.g. Bag of rice, Red handbag"
                  : "e.g. Logo design, Consulting (per hour), Website build"
              }
            />
          </div>

          {/* Price — the essential */}
          <div>
            <label htmlFor={`${formId}-price`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price ({symbol}) <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-price`}
              ref={priceRef}
              type="number"
              required
              min="0.01"
              step="0.01"
              value={formData.selling_price || ""}
              onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500">What you charge customers.</p>
          </div>

          {/* Description — required for storefront items (buyer protection) */}
          <div>
            <label htmlFor={`${formId}-description`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description{" "}
              {storefrontEnabled ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="font-normal text-gray-400">(optional)</span>
              )}
            </label>
            <textarea
              id={`${formId}-description`}
              ref={descriptionRef}
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              rows={2}
              required={storefrontEnabled}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
              placeholder="What's included, size, colour, etc."
            />
            {storefrontEnabled && (
              <p className="mt-1 text-xs text-gray-500">
                Buyers see this on your storefront — it&apos;s how disputes are settled.
              </p>
            )}
          </div>

          {/* Photo — required for storefront items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Photo{" "}
              {storefrontEnabled ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="font-normal text-gray-400">
                  (optional — shown on your storefront)
                </span>
              )}
            </label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Item"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <label className="cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:ring-2 focus-within:ring-brand-jade">
                {imagePreview ? "Change photo" : "Add photo"}
                <input
                  ref={photoRef}
                  aria-label="Item photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          {/* Scan-to-pay opt-in */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
            <input
              type="checkbox"
              checked={enableScanToPay}
              onChange={(e) => setEnableScanToPay(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-jade focus:ring-brand-jade"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                <QrCode className="h-4 w-4 text-brand-jade" />
                Add a scan-to-pay code
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Customers scan a QR to order this and pay online. Print it or put
                it on your shelf. (Needs your storefront turned on.)
              </span>
            </span>
          </label>

          {/* Quantity — stock for products, optional availability for services */}
          {(formData.track_stock || formData.fulfilment_type !== "physical") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${formId}-quantity`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {formData.fulfilment_type !== "physical"
                    ? "Available quantity "
                    : "How many in stock?"}
                  {formData.fulfilment_type !== "physical" && (
                    <span className="font-normal text-gray-400">(optional)</span>
                  )}
                </label>
                <input
                  id={`${formId}-quantity`}
                  ref={quantityRef}
                  type="number"
                  min="0"
                  value={formData.quantity_in_stock || ""}
                  onChange={(e) => {
                    const q = Number(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      quantity_in_stock: q,
                      // A service with a quantity becomes limited (tracked);
                      // blank/0 means unlimited.
                      ...(prev.fulfilment_type !== "physical"
                        ? { track_stock: q > 0 }
                        : {}),
                    }));
                  }}
                  // Physical stock is edited via stock adjustment (audit trail);
                  // services can be edited inline, on add or edit.
                  disabled={isEditing && formData.fulfilment_type === "physical"}
                  placeholder={
                    formData.fulfilment_type !== "physical" ? "Unlimited" : undefined
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {formData.fulfilment_type !== "physical" ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Set how many you can take — or leave blank for unlimited.
                  </p>
                ) : (
                  isEditing && (
                    <p className="text-xs text-gray-500 mt-1">Use stock adjustment to change.</p>
                  )
                )}
              </div>

              {/* Restock alert — physical stock only */}
              {formData.fulfilment_type === "physical" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alert me at
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                  />
                  <p className="text-xs text-gray-500 mt-1">We&apos;ll remind you to restock.</p>
                </div>
              )}
            </div>
          )}

          {/* More options (optional) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-sm font-medium text-brand-jade hover:underline"
            >
              {showAdvanced ? "Hide extra details" : "More options (optional)"}
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id ?? ""}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                >
                  <option value="">No category</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost price ({symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_price ?? ""}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                    placeholder="What it costs you"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code / SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku ?? ""}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>

              {formData.track_stock && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-brand-jade focus:outline-none focus:ring-1 focus:ring-brand-jade"
                  >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="L">Liters</option>
                    <option value="ml">Milliliters</option>
                    <option value="m">Meters</option>
                    <option value="box">Boxes</option>
                    <option value="pack">Packs</option>
                    <option value="dozen">Dozens</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              ref={saveRef}
              type="submit"
              disabled={isLoading || storefrontLoading || storefrontError}
              className="px-4 py-2 rounded-lg bg-brand-jade text-sm font-semibold text-white hover:bg-brand-jadeHover transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : isEditing ? "Update item" : "Add item"}
            </button>
          </div>
        </form>
      </Drawer>

      {savedProductId && (
        <ScanToPayModal
          productId={savedProductId}
          productName={formData.name}
          onClose={() => {
            setSavedProductId(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
