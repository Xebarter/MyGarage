import type { Product, ProductInsert } from "@/lib/db";
import { PRODUCT_SEED_ROWS } from "@/lib/data/product-seed";
import { parseProductVariantsRow, parseVariantOptions } from "@/lib/product-variants";
import { deleteAdApplicationsByProductId } from "@/lib/supabase/ad-applications-repo";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFetchError, formatSupabaseError, isTransientFetchError } from "@/lib/supabase/fetch-errors";
import { removeListingImagesForProductFields } from "@/lib/supabase/listing-image-storage";
import { deletePromoCarouselItemsByProductId } from "@/lib/supabase/promotions-repo";

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

/** Skip a count round-trip after the catalog is known to have rows. */
let productsSeedEnsured = false;

async function ensureSeedIfEmpty(): Promise<void> {
  if (productsSeedEnsured) return;

  const supabase = createAdminClient();
  let count: number | null = null;

  try {
    // Prefer GET over HEAD: some proxies return an empty PostgREST error on HEAD counts.
    const result = await supabase.from("products").select("id", { count: "exact" }).limit(1);
    count = result.count;
    if (result.error) {
      if (isTransientFetchError(result.error)) {
        console.warn(`Supabase products count skipped (network): ${formatSupabaseError(result.error)}`);
        return;
      }
      // Seeding is optional; do not block listing the live catalog.
      console.warn(`Supabase products count skipped: ${formatSupabaseError(result.error)}`);
      return;
    }
  } catch (error) {
    if (isTransientFetchError(error)) {
      console.warn(`Supabase products count skipped (network): ${formatFetchError(error)}`);
      return;
    }
    console.warn(`Supabase products count skipped: ${formatSupabaseError(error)}`);
    return;
  }

  if (count !== null && count > 0) {
    productsSeedEnsured = true;
    return;
  }

  const { error } = await supabase.from("products").insert(PRODUCT_SEED_ROWS);
  if (error) {
    // Race: another request may have inserted first
    if (error.code === "23505") {
      productsSeedEnsured = true;
      return;
    }
    throw new Error(`Supabase seed products failed: ${formatSupabaseError(error)}`);
  }
  productsSeedEnsured = true;
}

async function queryProducts() {
  const supabase = createAdminClient();
  return supabase.from("products").select("*").order("created_at", { ascending: true });
}

/** Published rows for the storefront feed, capped so the home page does not download the whole catalog. */
export async function listPublishedProductsLimited(limit: number): Promise<Product[]> {
  await ensureSeedIfEmpty();
  const capped = Math.min(Math.max(Math.trunc(limit) || 80, 1), 400);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("published", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(capped);

    if (error) {
      if (isTransientFetchError(error)) {
        console.warn(`Supabase list published products skipped (network): ${formatSupabaseError(error)}`);
        return [];
      }
      throw new Error(`Supabase list published products failed: ${formatSupabaseError(error)}`);
    }

    return (data as ProductRow[] | null)?.map(rowToProduct) ?? [];
  } catch (error) {
    if (isTransientFetchError(error)) {
      console.warn(`Supabase list published products skipped (network): ${formatFetchError(error)}`);
      return [];
    }
    throw error;
  }
}

export async function listProducts(): Promise<Product[]> {
  await ensureSeedIfEmpty();

  try {
    const { data, error } = await queryProducts();

    if (error) {
      if (isTransientFetchError(error)) {
        console.warn(`Supabase list products skipped (network): ${formatSupabaseError(error)}`);
        return [];
      }
      throw new Error(`Supabase list products failed: ${formatSupabaseError(error)}`);
    }

    return (data as ProductRow[] | null)?.map(rowToProduct) ?? [];
  } catch (error) {
    if (isTransientFetchError(error)) {
      console.warn(`Supabase list products skipped (network): ${formatFetchError(error)}`);
      return [];
    }
    throw error;
  }
}

export async function getProductById(id: string): Promise<Product | undefined> {
  await ensureSeedIfEmpty();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

    if (error) {
      if (isTransientFetchError(error)) {
        console.warn(`Supabase get product skipped (network): ${error.message}`);
        return undefined;
      }
      throw new Error(`Supabase get product failed: ${error.message}`);
    }

    if (!data) return undefined;
    return rowToProduct(data as ProductRow);
  } catch (error) {
    if (isTransientFetchError(error)) {
      console.warn(`Supabase get product skipped (network): ${formatFetchError(error)}`);
      return undefined;
    }
    throw error;
  }
}

const DEFAULT_LISTING_IMAGE = "/products/default.jpg";

function pickUsableListingImage(image: string | null | undefined, images: unknown): string | undefined {
  for (const candidate of [image, ...parseStringArray(images)]) {
    const t = typeof candidate === "string" ? candidate.trim() : "";
    if (t && t !== DEFAULT_LISTING_IMAGE) return t;
  }
  return undefined;
}

/** Batch-resolve listing images for wishlist and similar UIs (one round-trip). */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  await ensureSeedIfEmpty();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("products").select("*").in("id", unique);

    if (error) {
      if (isTransientFetchError(error)) {
        console.warn(`Supabase get products by id skipped (network): ${formatSupabaseError(error)}`);
        return [];
      }
      throw new Error(`Supabase get products by id failed: ${formatSupabaseError(error)}`);
    }

    return (data as ProductRow[] | null)?.map(rowToProduct) ?? [];
  } catch (error) {
    if (isTransientFetchError(error)) {
      console.warn(`Supabase get products by id skipped (network): ${formatFetchError(error)}`);
      return [];
    }
    throw error;
  }
}

export async function getProductImagesByIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();

  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").select("id, image, images").in("id", unique);

  if (error) {
    throw new Error(`Supabase get product images failed: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of (data as { id: string; image: string | null; images?: unknown }[] | null) ?? []) {
    if (!row?.id) continue;
    const url = pickUsableListingImage(row.image, row.images);
    if (url) map.set(row.id, url);
  }
  return map;
}

export async function listProductsByCategories(categories: string[]): Promise<Product[]> {
  if (categories.length === 0) return [];
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("category", categories)
    .eq("published", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Supabase list products by categories failed: ${error.message}`);
  }

  return (data as ProductRow[] | null)?.map(rowToProduct) ?? [];
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

async function deleteProductRelatedRecords(productId: string): Promise<void> {
  await Promise.all([
    deletePromoCarouselItemsByProductId(productId),
    deleteAdApplicationsByProductId(productId),
  ]);
}

export async function deleteProductById(id: string): Promise<boolean> {
  const productId = id.trim();
  if (!productId) return false;

  const existing = await getProductById(productId);
  if (!existing) {
    return false;
  }

  await deleteProductRelatedRecords(productId);

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) {
    throw new Error(`Supabase delete product failed: ${error.message}`);
  }

  const { data: stillThere, error: verifyError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (verifyError) {
    throw new Error(`Supabase verify product delete failed: ${verifyError.message}`);
  }
  if (stillThere) {
    throw new Error("Supabase delete product failed: row still exists after delete");
  }

  await removeListingImagesForProductFields(existing.image, existing.images);
  return true;
}

export async function deleteProductsByVendorId(vendorId: string): Promise<void> {
  const products = await listProductsByVendor(vendorId);
  await Promise.all(products.map((product) => deleteProductRelatedRecords(product.id)));

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").delete().eq("vendor_id", vendorId);

  if (error) {
    throw new Error(`Supabase delete vendor products failed: ${error.message}`);
  }

  await Promise.all(
    products.map((product) => removeListingImagesForProductFields(product.image, product.images)),
  );
}
