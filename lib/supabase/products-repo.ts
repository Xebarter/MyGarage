import type { Product, ProductInsert } from "@/lib/db";
import { PRODUCT_SEED_ROWS } from "@/lib/data/product-seed";
import { parseProductVariantsRow, parseVariantOptions } from "@/lib/product-variants";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeListingImagesForProductFields } from "@/lib/supabase/listing-image-storage";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  compare_at_price?: number | string | null;
  image: string;
  images?: unknown;
  featured: boolean;
  featured_request_pending: boolean;
  published?: boolean;
  category: string;
  subcategory?: string;
  brand: string;
  sku: string;
  slug?: string;
  tags?: unknown;
  weight_kg?: number | string | null;
  variants?: unknown;
  variant_options?: unknown;
  vendor_id: string;
  created_at: string;
  updated_at?: string;
};

function parsePrice(value: number | string): number {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function rowToProduct(row: ProductRow): Product {
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();
  const updatedRaw = row.updated_at ?? row.created_at;
  const variantOptions = parseVariantOptions(row.variant_options);
  const variants = parseProductVariantsRow(row.variants, variantOptions);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: parsePrice(row.price),
    compareAtPrice: parseOptionalPrice(row.compare_at_price),
    image: row.image ?? "",
    images: parseStringArray(row.images),
    featured: Boolean(row.featured),
    featuredRequestPending: Boolean(row.featured_request_pending),
    published: row.published !== false,
    category: row.category ?? "",
    subcategory: row.subcategory ?? "",
    brand: row.brand ?? "",
    sku: row.sku ?? "",
    slug: row.slug ?? "",
    tags: parseStringArray(row.tags),
    weightKg: parseOptionalNumber(row.weight_kg),
    variantOptions,
    variants,
    vendorId: row.vendor_id,
    createdAt,
    updatedAt: updatedRaw ? new Date(updatedRaw) : createdAt,
  };
}

function insertPayload(product: ProductInsert, id: string) {
  const skuRaw = product.sku != null ? String(product.sku).trim() : "";
  const sku = skuRaw.length > 0 ? skuRaw : `AUTO-${id}`;

  return {
    id,
    name: product.name,
    description: product.description,
    price: product.price,
    compare_at_price: product.compareAtPrice ?? null,
    image: product.image ?? "",
    images: product.images ?? [],
    featured: product.featured ?? false,
    featured_request_pending: product.featuredRequestPending ?? false,
    published: product.published ?? true,
    category: product.category ?? "",
    subcategory: product.subcategory ?? "",
    brand: product.brand ?? "",
    sku,
    slug: product.slug ?? "",
    tags: product.tags ?? [],
    weight_kg: product.weightKg ?? null,
    variants: product.variants ?? [],
    variant_options: product.variantOptions ?? [],
    vendor_id: product.vendorId,
    created_at: new Date().toISOString(),
  };
}

async function ensureSeedIfEmpty(): Promise<void> {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Supabase products count failed: ${countError.message}`);
  }

  if (count !== null && count > 0) return;

  const { error } = await supabase.from("products").insert(PRODUCT_SEED_ROWS);
  if (error) {
    // Race: another request may have inserted first
    if (error.code === "23505") return;
    throw new Error(`Supabase seed products failed: ${error.message}`);
  }
}

export async function listProducts(): Promise<Product[]> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase list products failed: ${error.message}`);
  }

  return (data as ProductRow[] | null)?.map(rowToProduct) ?? [];
}

export async function getProductById(id: string): Promise<Product | undefined> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Supabase get product failed: ${error.message}`);
  }

  if (!data) return undefined;
  return rowToProduct(data as ProductRow);
}

export async function listProductsByVendor(vendorId: string): Promise<Product[]> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase list vendor products failed: ${error.message}`);
  }

  return (data as ProductRow[] | null)?.map(rowToProduct) ?? [];
}

export async function insertProduct(product: ProductInsert): Promise<Product> {
  const supabase = createAdminClient();
  const id = product.id ?? Date.now().toString();
  const row = insertPayload(product, id);

  const { data, error } = await supabase.from("products").insert(row).select("*").single();

  if (error) {
    throw new Error(`Supabase insert product failed: ${error.message}`);
  }

  return rowToProduct(data as ProductRow);
}

export async function updateProductById(id: string, updates: Partial<Product>): Promise<Product | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.price !== undefined) patch.price = updates.price;
  if (updates.compareAtPrice !== undefined) patch.compare_at_price = updates.compareAtPrice;
  if (updates.image !== undefined) patch.image = updates.image;
  if (updates.images !== undefined) patch.images = updates.images;
  if (updates.featured !== undefined) patch.featured = updates.featured;
  if (updates.featuredRequestPending !== undefined) {
    patch.featured_request_pending = updates.featuredRequestPending;
  }
  if (updates.published !== undefined) patch.published = updates.published;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.subcategory !== undefined) patch.subcategory = updates.subcategory;
  if (updates.brand !== undefined) patch.brand = updates.brand;
  if (updates.sku !== undefined) patch.sku = updates.sku;
  if (updates.slug !== undefined) patch.slug = updates.slug;
  if (updates.tags !== undefined) patch.tags = updates.tags;
  if (updates.weightKg !== undefined) patch.weight_kg = updates.weightKg;
  if (updates.variants !== undefined) patch.variants = updates.variants;
  if (updates.variantOptions !== undefined) patch.variant_options = updates.variantOptions;
  if (updates.vendorId !== undefined) patch.vendor_id = updates.vendorId;

  if (Object.keys(patch).length === 0) {
    return getProductById(id).then((p) => p ?? null);
  }

  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select("*").maybeSingle();

  if (error) {
    throw new Error(`Supabase update product failed: ${error.message}`);
  }

  if (!data) return null;
  return rowToProduct(data as ProductRow);
}

export async function deleteProductById(id: string): Promise<boolean> {
  const existing = await getProductById(id);
  if (!existing) {
    return false;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").delete().eq("id", id).select("id");

  if (error) {
    throw new Error(`Supabase delete product failed: ${error.message}`);
  }

  const deleted = Boolean(data && data.length > 0);
  if (deleted) {
    await removeListingImagesForProductFields(existing.image, existing.images);
  }

  return deleted;
}

export async function deleteProductsByVendorId(vendorId: string): Promise<void> {
  const products = await listProductsByVendor(vendorId);
  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("vendor_id", vendorId);

  if (error) {
    throw new Error(`Supabase delete vendor products failed: ${error.message}`);
  }

  await Promise.all(
    products.map((product) => removeListingImagesForProductFields(product.image, product.images)),
  );
}
