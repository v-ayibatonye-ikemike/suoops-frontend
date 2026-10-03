/**
 * TypeScript types for Inventory API.
 * 
 * These types match the Pydantic schemas in the backend.
 */

// Product Category Types
export interface ProductCategory {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  is_active: boolean;
  pack_price?: number | null;
  product_count: number;
}

export interface ProductCategoryCreate {
  name: string;
  description?: string | null;
  color?: string | null;
  is_active?: boolean;
  pack_price?: number | null;
}

export interface ProductCategoryUpdate {
  name?: string;
  description?: string | null;
  color?: string | null;
  is_active?: boolean;
  pack_price?: number | null;
}

// Product Types
export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  barcode?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  cost_price?: number | null;
  selling_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  unit: string;
  is_active: boolean;
  track_stock: boolean;
  fulfilment_type: "physical" | "service" | "digital";
  image_url?: string | null;
  storefront_featured?: boolean;
  storefront_discount_percent?: number;
  storefront_bundle_label?: string | null;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  stock_value?: number | null;
  profit_margin?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProductCreate {
  sku: string;
  name: string;
  description?: string | null;
  barcode?: string | null;
  category_id?: number | null;
  cost_price?: number | null;
  selling_price: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  unit?: string;
  track_stock?: boolean;
  fulfilment_type?: "physical" | "service" | "digital";
  image_url?: string | null;
}

export interface ProductUpdate {
  sku?: string;
  name?: string;
  description?: string | null;
  barcode?: string | null;
  category_id?: number | null;
  cost_price?: number | null;
  selling_price?: number;
  quantity_in_stock?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  unit?: string;
  track_stock?: boolean;
  is_active?: boolean;
  fulfilment_type?: "physical" | "service" | "digital";
  image_url?: string | null;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Stock Movement Types
export type StockMovementType = 
  | "purchase" 
  | "sale" 
  | "adjustment" 
  | "return_in" 
  | "return_out" 
  | "transfer" 
  | "opening";

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string | null;
  product_sku?: string | null;
  movement_type: StockMovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface StockAdjustmentCreate {
  product_id: number;
  quantity: number;
  movement_type?: StockMovementType;
  reason?: string | null;
  notes?: string | null;
  unit_cost?: number | null;
}

export interface StockMovementListResponse {
  movements: StockMovement[];
  total: number;
  page: number;
  page_size: number;
}

// Supplier Types
export interface Supplier {
  id: number;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface SupplierCreate {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface SupplierUpdate {
  name?: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// Analytics Types
export interface InventorySummary {
  total_products: number;
  active_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value: number;
  total_potential_revenue: number;
  categories_count: number;
}

export interface LowStockAlert {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  unit: string;
}
