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
  service_offerings?: string[] | null;
  created_at: string;
};

export type VendorInsert = Omit<Vendor, "id" | "createdAt"> & { id?: string };

function parseRating(value: number | string): number {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function rowToVendor(row: VendorRow): Vendor {
  const offerings = row.service_offerings;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    address: row.address ?? "",
    rating: parseRating(row.rating),
    totalProducts: Number(row.total_products) || 0,
    serviceOfferings: Array.isArray(offerings) ? offerings.map(String) : [],
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
    service_offerings: vendor.serviceOfferings ?? [],
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
  if (updates.serviceOfferings !== undefined) patch.service_offerings = updates.serviceOfferings;

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

/**
 * Deletes all ad_applications rows for this vendor.
 * This column has no FK so Postgres does not cascade automatically.
 */
export async function deleteVendorAdApplications(vendorId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("ad_applications").delete().eq("vendor_id", vendorId);

  if (error) {
    throw new Error(`Supabase delete vendor ad_applications failed: ${error.message}`);
  }
}

/**
 * Deletes all buyer_provider_ratings rows where this vendor was the rated provider.
 * This column has no FK so Postgres does not cascade automatically.
 */
export async function deleteVendorProviderRatings(vendorId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("buyer_provider_ratings").delete().eq("provider_id", vendorId);

  if (error) {
    throw new Error(`Supabase delete vendor provider ratings failed: ${error.message}`);
  }
}

/**
 * Deletes the Supabase Auth user whose uid matches the vendor id.
 * Must be called AFTER the vendor row and all dependent DB rows have been removed,
 * so that FK cascades complete before the identity is gone.
 *
 * Skips silently when the id is not a valid UUID (e.g. seed vendors with ids like
 * "1" or "2" that were inserted directly into the DB without going through auth
 * signup) because Supabase Auth requires UUID-format user ids.
 */
export async function deleteVendorAuthUser(vendorId: string): Promise<void> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(vendorId)) return;

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(vendorId);

  if (error && !error.message.toLowerCase().includes("user not found")) {
    throw new Error(`Supabase delete vendor auth user failed: ${error.message}`);
  }
}
