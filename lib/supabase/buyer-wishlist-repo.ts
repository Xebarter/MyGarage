import { createAdminClient } from "@/lib/supabase/admin";

export interface BuyerWishlistItem {
  id: string;
  customerId: string;
  productId?: string;
  productName: string;
  priceSnapshot: number;
  categorySnapshot: string;
  createdAt: Date;
  updatedAt: Date;
}

type BuyerWishlistRow = {
  id: string;
  customer_id: string;
  product_id: string | null;
  product_name: string;
  price_snapshot: number | string;
  category_snapshot: string;
  created_at: string;
  updated_at: string;
};

export type BuyerWishlistInsert = Omit<BuyerWishlistItem, "id" | "createdAt" | "updatedAt"> & { id?: string };

function parseMoney(value: number | string): number {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function rowToBuyerWishlistItem(row: BuyerWishlistRow): BuyerWishlistItem {
  return {
    id: row.id,
    customerId: row.customer_id,
    productId: row.product_id ?? undefined,
    productName: row.product_name,
    priceSnapshot: parseMoney(row.price_snapshot),
    categorySnapshot: row.category_snapshot ?? "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listBuyerWishlistItems(customerId: string): Promise<BuyerWishlistItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_wishlist_items")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Supabase list buyer wishlist failed: ${error.message}`);
  return (data as BuyerWishlistRow[] | null)?.map(rowToBuyerWishlistItem) ?? [];
}

export async function insertBuyerWishlistItem(item: BuyerWishlistInsert): Promise<BuyerWishlistItem> {
  const supabase = createAdminClient();
  const id = item.id ?? Date.now().toString();
  const row = {
    id,
    customer_id: item.customerId,
    product_id: item.productId ?? null,
    product_name: item.productName,
    price_snapshot: item.priceSnapshot,
    category_snapshot: item.categorySnapshot,
  };
  const { data, error } = await supabase.from("buyer_wishlist_items").insert(row).select("*").single();
  if (error) throw new Error(`Supabase insert buyer wishlist failed: ${error.message}`);
  return rowToBuyerWishlistItem(data as BuyerWishlistRow);
}

export async function deleteBuyerWishlistItemById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("buyer_wishlist_items").delete().eq("id", id).select("id");
  if (error) throw new Error(`Supabase delete buyer wishlist failed: ${error.message}`);
  return Boolean(data && data.length > 0);
}
