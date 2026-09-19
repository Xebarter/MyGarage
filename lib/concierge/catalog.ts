import { createAdminClient } from "@/lib/supabase/admin";
import { matchCatalogServices } from "@/lib/search/match-catalog-services";
import { sanitizeIlikeToken } from "@/lib/search/expand-query";
import {
  findCatalogService,
  resolveBuyerServiceCategory,
} from "@/lib/services-catalog";
import { getProduct } from "@/lib/db";
import type { ConciergeQuoteLine } from "@/lib/concierge/types";

export type ConciergeCatalogProduct = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  brand: string;
  vendorId: string;
};

export type ConciergeCatalogService = {
  name: string;
  categoryId: string;
  categoryTitle: string;
};

export async function searchConciergeCatalog(query: string): Promise<{
  products: ConciergeCatalogProduct[];
  services: ConciergeCatalogService[];
}> {
  const q = query.trim();
  const services = matchCatalogServices(q, 8).map((row) => ({
    name: row.name,
    categoryId: row.categoryId,
    categoryTitle: row.categoryTitle,
  }));

  if (q.length < 2) return { products: [], services };

  const token = sanitizeIlikeToken(q).slice(0, 48);
  if (token.length < 2) return { products: [], services };

  const pattern = `%${token}%`;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,image,category,brand,vendor_id,published")
    .eq("published", true)
    .or(`name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},brand.ilike.${pattern}`)
    .limit(16);

  if (error) {
    console.error("searchConciergeCatalog products failed:", error.message);
    return { products: [], services };
  }

  const products: ConciergeCatalogProduct[] = (data ?? [])
    .map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      price: Number(row.price) || 0,
      image: String(row.image ?? ""),
      category: String(row.category ?? ""),
      brand: String(row.brand ?? ""),
      vendorId: String(row.vendor_id ?? ""),
    }))
    .filter((row) => row.id && row.name)
    .slice(0, 8);

  return { products, services };
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
