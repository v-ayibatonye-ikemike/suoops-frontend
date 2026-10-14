"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  InventorySummaryCards,
  LowStockAlertsList,
  ProductList,
  ProductForm,
  StockAdjustmentModal,
  CategoryManager,
} from "@/features/inventory";
import type { Product } from "@/features/inventory";
import { apiClient } from "@/api/client";
import type { components } from "@/api/types";
import { InventoryAdviser } from "@/features/inventory/inventory-adviser";
import { useTeamRole } from "@/features/settings/use-team-role";

type CurrentUser = components["schemas"]["UserOut"];

export default function InventoryPage() {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [guided, setGuided] = useState(false);
  const [initialType, setInitialType] = useState<"physical" | "service">("physical");
  const [entryError, setEntryError] = useState<string | null>(null);
  const role = useTeamRole();
  const canEdit = !role.loading && !role.error && role.canEditInventory;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledCreate = useRef<string | null>(null);

  // Fetch current user to check plan
  const { isLoading } = useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<CurrentUser>("/users/me");
      return response.data;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (searchParams.get("create") !== "1") {
      handledCreate.current = null;
      return;
    }
    if (isLoading || role.loading || role.error) return;
    const key = searchParams.toString();
    if (handledCreate.current === key) return;
    handledCreate.current = key;
    const params = new URLSearchParams(key);
    const guidedProduct = params.get("assistant") === "product";
    const itemType = guidedProduct && params.get("type") === "service" ? "service" : "physical";
    params.delete("create");
    if (guidedProduct) {
      params.delete("assistant");
      params.delete("type");
    }
    router.replace(`${pathname}${params.size ? `?${params}` : ""}${window.location.hash}`, { scroll: false });
    if (!canEdit) {
      setEntryError("Only the workspace owner or team admin can add products or services.");
      return;
    }
    if (showProductForm || adjustingProduct) {
      setEntryError("Your current form is still open. Finish or close it before adding another item.");
      return;
    }
    setEntryError(null);
    setEditingProduct(null);
    setGuided(guidedProduct);
    setInitialType(itemType);
    setShowProductForm(true);
  }, [searchParams, pathname, router, isLoading, role.loading, role.error, canEdit, showProductForm, adjustingProduct]);

  const closeProductForm = useCallback(() => {
    setShowProductForm(false);
    setEditingProduct(null);
    setGuided(false);
    setEntryError(null);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-jade" />
      </div>
    );
  }

  const handleCreateProduct = () => {
    setEntryError(null);
    setEditingProduct(null);
    setGuided(false);
    setInitialType("physical");
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEntryError(null);
    setGuided(false);
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleSelectProduct = (product: Product) => {
    // Open stock adjustment modal
    setAdjustingProduct(product);
  };

  return (
    <div className="space-y-6">
      {entryError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{entryError}</p>}
      {role.error && (
        <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          Could not check inventory permissions. Please retry before changing inventory.{" "}
          <button type="button" onClick={() => void role.refresh()} className="font-semibold underline">
            Retry permissions
          </button>
        </div>
      )}
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-jade/10">
          <Package className="h-6 w-6 text-brand-jade" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory that supports your sales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track stock to invoice faster and avoid payment delays
          </p>
        </div>
      </div>

      <InventoryAdviser />

      {/* Summary Cards */}
      <InventorySummaryCards />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <ProductList
            onCreateProduct={canEdit ? handleCreateProduct : undefined}
            onEditProduct={canEdit ? handleEditProduct : undefined}
            onSelectProduct={canEdit ? handleSelectProduct : undefined}
          />
        </div>

        {/* Sidebar - Categories & Low Stock Alerts */}
        <div className="space-y-6">
          <CategoryManager />
          <LowStockAlertsList />
        </div>
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          guided={guided}
          initialType={initialType}
          onClose={closeProductForm}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
        />
      )}
    </div>
  );
}
