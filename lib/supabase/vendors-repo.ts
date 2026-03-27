import type { Vendor } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

type VendorRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number | string;
  total_products: number;
  created_at: string;
};

export type VendorInsert = Omit<Vendor, "id" | "createdAt"> & { id?: string };

function parseRating(value: number | string): number {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function rowToVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    address: row.address ?? "",
    rating: parseRating(row.rating),
    totalProducts: Number(row.total_products) || 0,
    createdAt: new Date(row.created_at),
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase list vendors failed: ${error.message}`);
  }

  return (data as VendorRow[] | null)?.map(rowToVendor) ?? [];
}

export async function getVendorById(id: string): Promise<Vendor | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Supabase get vendor failed: ${error.message}`);
  }

  if (!data) return undefined;
  return rowToVendor(data as VendorRow);
}

export async function insertVendor(vendor: VendorInsert): Promise<Vendor> {
  const supabase = createAdminClient();
  const id = vendor.id ?? Date.now().toString();
  const row = {
    id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    rating: vendor.rating,
    total_products: vendor.totalProducts,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("vendors").insert(row).select("*").single();

  if (error) {
    throw new Error(`Supabase insert vendor failed: ${error.message}`);
  }

  return rowToVendor(data as VendorRow);
}

export async function updateVendorById(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.address !== undefined) patch.address = updates.address;
  if (updates.rating !== undefined) patch.rating = updates.rating;
  if (updates.totalProducts !== undefined) patch.total_products = updates.totalProducts;

  if (Object.keys(patch).length === 0) {
    return getVendorById(id).then((v) => v ?? null);
  }

  const { data, error } = await supabase.from("vendors").update(patch).eq("id", id).select("*").maybeSingle();

  if (error) {
    throw new Error(`Supabase update vendor failed: ${error.message}`);
  }

  if (!data) return null;
  return rowToVendor(data as VendorRow);
}

export async function deleteVendorById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("vendors").delete().eq("id", id).select("id");

  if (error) {
    throw new Error(`Supabase delete vendor failed: ${error.message}`);
  }

  return Boolean(data && data.length > 0);
}
