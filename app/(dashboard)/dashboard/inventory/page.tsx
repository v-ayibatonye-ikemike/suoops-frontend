"use client";

import { useEffect, useState } from "react";
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

type CurrentUser = components["schemas"]["UserOut"];

export default function InventoryPage() {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("create") !== "1") return;
    setEditingProduct(null);
    setShowProductForm(true);
    url.searchParams.delete("create");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // Fetch current user to check plan
  const { isLoading } = useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<CurrentUser>("/users/me");
      return response.data;
    },
    staleTime: 60000,
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-jade" />
      </div>
    );
  }

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleSelectProduct = (product: Product) => {
    // Open stock adjustment modal
    setAdjustingProduct(product);
  };

  return (
    <div className="space-y-6">
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
            onCreateProduct={handleCreateProduct}
            onEditProduct={handleEditProduct}
            onSelectProduct={handleSelectProduct}
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
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
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
