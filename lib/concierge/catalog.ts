import { createAdminClient } from "@/lib/supabase/admin";
import { matchCatalogServices } from "@/lib/search/match-catalog-services";
import {
  buildExpandedRankingTokens,
  normalizeSearchText,
  sanitizeIlikeToken,
} from "@/lib/search/expand-query";
import {
  findCatalogService,
  resolveBuyerServiceCategory,
} from "@/lib/services-catalog";
import { listShopDepartments, matchSidebarCategoryTitles } from "@/data/sidebar-categories";
import { getProduct } from "@/lib/db";
import type { ConciergeProductCard, ConciergeProductBrowse, ConciergeQuoteLine } from "@/lib/concierge/types";

export type ConciergeCatalogProduct = {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  category: string;
  subcategory: string;
  brand: string;
  vendorId: string;
  description: string;
  featured: boolean;
};

export type ConciergeCatalogService = {
  name: string;
  categoryId: string;
  categoryTitle: string;
};

export type ConciergeProductSearchInput = {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  offset?: number;
  limit?: number;
  vehicleHint?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
};

const PRODUCT_SELECT =
  "id,name,price,compare_at_price,image,images,category,subcategory,brand,vendor_id,description,featured,published";

function parseOptionalPrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstImage(row: { image?: unknown; images?: unknown }): string {
  const primary = String(row.image ?? "").trim();
  if (primary) return primary;
  if (Array.isArray(row.images)) {
    const hit = row.images.find((item) => typeof item === "string" && item.trim());
    if (typeof hit === "string") return hit.trim();
  }
  return "";
}

function rowToCatalogProduct(row: Record<string, unknown>): ConciergeCatalogProduct | null {
  const id = String(row.id ?? "").trim();
  const name = String(row.name ?? "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    price: Number(row.price) || 0,
    compareAtPrice: parseOptionalPrice(row.compare_at_price),
    image: firstImage(row),
    category: String(row.category ?? ""),
    subcategory: String(row.subcategory ?? ""),
    brand: String(row.brand ?? ""),
    vendorId: String(row.vendor_id ?? ""),
    description: String(row.description ?? ""),
    featured: Boolean(row.featured),
  };
}

export function toConciergeProductCard(product: ConciergeCatalogProduct): ConciergeProductCard {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    image: product.image,
    category: product.category,
    brand: product.brand,
    href: `/products/${encodeURIComponent(product.id)}`,
  };
}

function scoreProduct(product: ConciergeCatalogProduct, tokens: string[], vehicleTokens: string[]): number {
  const name = product.name.toLowerCase();
  const brand = product.brand.toLowerCase();
  const category = `${product.category} ${product.subcategory}`.toLowerCase();
  const hay = `${name} ${brand} ${category} ${product.description}`.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (token.length < 2) continue;
    if (name === token) score += 28;
    else if (name.startsWith(token)) score += 16;
    else if (name.includes(token)) score += 12;
    if (brand.includes(token)) score += 8;
    if (category.includes(token)) score += 6;
    if (hay.includes(token)) score += 2;
  }
  for (const token of vehicleTokens) {
    if (token.length >= 3 && hay.includes(token)) score += 4;
  }
  if (product.featured) score += 3;
  return score;
}

function vehicleTokensFromHint(hint: string): string[] {
  return normalizeSearchText(hint)
    .split(/\s+/)
    .map(sanitizeIlikeToken)
    .filter((token) => token.length >= 3 && !/^\d{4}$/.test(token))
    .slice(0, 6);
}

function buildOrFilter(tokens: string[]): string {
  const fields = ["name", "description", "category", "brand"];
  const parts: string[] = [];
  for (const token of tokens.slice(0, 5)) {
    const safe = sanitizeIlikeToken(token).slice(0, 40);
    if (safe.length < 2) continue;
    for (const field of fields) {
      parts.push(`${field}.ilike.%${safe}%`);
    }
  }
  return parts.slice(0, 20).join(",");
}

export function listConciergeShopDepartments() {
  return listShopDepartments();
}

export function listConciergeShopSubcategories(title: string) {
  const needle = title.trim().toLowerCase();
  if (!needle) return [];
  const departments = listShopDepartments();
  const exact = departments.find((dept) => dept.title.toLowerCase() === needle);
  if (exact) return exact.children.map((child) => ({ title: child, children: [] as string[] }));
  for (const dept of departments) {
    if (dept.children.some((child) => child.toLowerCase() === needle)) {
      return dept.children.map((child) => ({ title: child, children: [] as string[] }));
    }
  }
  return [];
}

function browseDepartmentsFor(categoryQuery: string) {
  if (!categoryQuery.trim()) return listConciergeShopDepartments();
  const children = listConciergeShopSubcategories(categoryQuery);
  return children.length ? children : listConciergeShopDepartments();
}

export async function getConciergeShopHome(): Promise<{
  departments: ReturnType<typeof listConciergeShopDepartments>;
  browse: ConciergeProductBrowse;
}> {
  const browse = await searchConciergeProducts({ limit: 8, sort: "newest" });
  const departments = listConciergeShopDepartments();
  return {
    departments,
    browse: { ...browse, title: browse.title || "Shop parts", departments },
  };
}

export async function searchConciergeProducts(
  input: ConciergeProductSearchInput,
): Promise<ConciergeProductBrowse> {
  const query = (input.query ?? "").trim();
  const categoryQuery = (input.category ?? "").trim();
  const brand = (input.brand ?? "").trim();
  const offset = Math.max(0, Math.round(Number(input.offset) || 0));
  const limit = Math.min(12, Math.max(4, Math.round(Number(input.limit) || 8)));
  const sort = input.sort ?? "relevance";
  const minPrice = Number.isFinite(input.minPrice) ? Number(input.minPrice) : null;
  const maxPrice = Number.isFinite(input.maxPrice) ? Number(input.maxPrice) : null;
  const vehicleTokens = vehicleTokensFromHint(input.vehicleHint ?? "");

  const categoryTitles = categoryQuery ? matchSidebarCategoryTitles(categoryQuery) : null;
  const { rankingTokens, dbTokenGroups } = buildExpandedRankingTokens(query);
  const dbTokens = dbTokenGroups.flat().slice(0, 8);
  const orFilter = query.length >= 2 ? buildOrFilter(dbTokens.length ? dbTokens : [query]) : "";

  const supabase = createAdminClient();
  let request = supabase.from("products").select(PRODUCT_SELECT).eq("published", true);

  if (categoryTitles?.length) {
    request = request.in("category", categoryTitles.slice(0, 80));
  } else if (categoryQuery) {
    const token = sanitizeIlikeToken(categoryQuery).slice(0, 48);
    if (token.length >= 2) request = request.ilike("category", `%${token}%`);
  }

  if (brand) {
    const token = sanitizeIlikeToken(brand).slice(0, 48);
    if (token.length >= 2) request = request.ilike("brand", `%${token}%`);
  }
  if (minPrice != null && minPrice > 0) request = request.gte("price", minPrice);
  if (maxPrice != null && maxPrice > 0) request = request.lte("price", maxPrice);
  if (orFilter) request = request.or(orFilter);
  else {
    request = request.order('featured', { ascending: false }).order('created_at', { ascending: false });
  }

  const fetchCount = Math.min(120, Math.max(32, offset + limit * 4));
  const { data, error } = await request.limit(fetchCount);

  if (error) {
    console.error("searchConciergeProducts failed:", error.message);
    return {
      title: categoryQuery || query || "Shop",
      query: query || undefined,
      category: categoryQuery || undefined,
      total: 0,
      offset,
      hasMore: false,
      products: [],
      departments: browseDepartmentsFor(categoryQuery),
    };
  }

  let products = (data ?? [])
    .map((row) => rowToCatalogProduct(row as Record<string, unknown>))
    .filter((row): row is ConciergeCatalogProduct => Boolean(row));

  if (sort === "price_asc") products.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") products.sort((a, b) => b.price - a.price);
  else if (sort === "newest") products.sort((a, b) => a.id.localeCompare(b.id));
  else {
    products.sort(
      (a, b) =>
        scoreProduct(b, rankingTokens, vehicleTokens) - scoreProduct(a, rankingTokens, vehicleTokens),
    );
  }

  const total = products.length;
  const page = products.slice(offset, offset + limit);
  const title = categoryQuery
    ? categoryQuery
    : query
      ? `Results for ${query}`
      : "Shop parts";

  return {
    title,
    query: query || undefined,
    category: categoryQuery || undefined,
    total,
    offset,
    hasMore: offset + page.length < total,
    products: page.map(toConciergeProductCard),
    departments: browseDepartmentsFor(categoryQuery),
  };
}

export async function getConciergeProductDetail(productId: string): Promise<{
  product: ConciergeProductCard & { description: string; sku: string; subcategory: string };
  related: ConciergeProductCard[];
} | null> {
  const id = productId.trim();
  if (!id) return null;
  const product = await getProduct(id);
  if (!product || product.published === false) return null;

  const relatedBrowse = await searchConciergeProducts({
    category: product.category || product.subcategory,
    query: product.brand || product.name.split(/\s+/).slice(0, 2).join(" "),
    limit: 5,
  });
  const related = relatedBrowse.products.filter((row) => row.id !== product.id).slice(0, 4);

  return {
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      image: product.image,
      category: product.category,
      brand: product.brand,
      href: `/products/${encodeURIComponent(product.id)}`,
      description: (product.description || "").trim().slice(0, 480),
      sku: product.sku || "",
      subcategory: product.subcategory || "",
    },
    related,
  };
}

export async function searchConciergeCatalog(
  query: string,
  extras: { category?: string; vehicleHint?: string } = {},
): Promise<{
  products: ConciergeCatalogProduct[];
  services: ConciergeCatalogService[];
  browse: ConciergeProductBrowse;
}> {
  const q = query.trim();
  const services = matchCatalogServices(q, 8).map((row) => ({
    name: row.name,
    categoryId: row.categoryId,
    categoryTitle: row.categoryTitle,
  }));

  const browse = await searchConciergeProducts({
    query: q,
    category: extras.category,
    vehicleHint: extras.vehicleHint,
    limit: 8,
  });

  const products: ConciergeCatalogProduct[] = browse.products.map((card) => ({
    id: card.id,
    name: card.name,
    price: card.price,
    compareAtPrice: card.compareAtPrice ?? null,
    image: card.image,
    category: card.category,
    subcategory: "",
    brand: card.brand,
    vendorId: "",
    description: "",
    featured: false,
  }));

  return { products, services, browse };
}

export function resolveConciergeService(input: {
  categoryId?: string | null;
  category?: string | null;
  service: string;
}): ConciergeCatalogService | null {
  const service = input.service.trim();
  if (!service) return null;
  const resolved = resolveBuyerServiceCategory({
    categoryId: input.categoryId,
    category: input.category,
  });
  const exact = findCatalogService(service, resolved?.id);
  if (exact && resolved) {
    return { name: exact.name, categoryId: resolved.id, categoryTitle: resolved.title };
  }
  const matches = matchCatalogServices(`${resolved?.title ?? ""} ${service}`.trim(), 6);
  const best =
    (resolved ? matches.find((row) => row.categoryId === resolved.id) : undefined) ?? matches[0];
  if (!best) return null;
  return { name: best.name, categoryId: best.categoryId, categoryTitle: best.categoryTitle };
}

export async function resolveQuoteLines(
  items: Array<{ productId: string; quantity?: number }>,
  allowedIds?: string[],
): Promise<ConciergeQuoteLine[]> {
  const allow = allowedIds?.length ? new Set(allowedIds) : null;
  const lines: ConciergeQuoteLine[] = [];
  const seen = new Set<string>();
  for (const item of items.slice(0, 8)) {
    const id = String(item.productId ?? "").trim();
    if (!id || seen.has(id)) continue;
    if (allow && !allow.has(id)) continue;
    seen.add(id);
    const product = await getProduct(id);
    if (!product || product.published === false) continue;
    lines.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: Math.max(1, Math.min(12, Math.round(Number(item.quantity) || 1))),
      vendorId: product.vendorId,
    });
  }
  return lines;
}
