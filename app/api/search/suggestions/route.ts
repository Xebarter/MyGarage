import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SuggestionProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  category: string;
  brand: string;
};

type SuggestionCategory = {
  name: string;
  image: string;
  count: number;
  topScore: number;
};

type SuggestionsResponse = {
  query: string;
  categories: Array<Omit<SuggestionCategory, "topScore">>;
  products: SuggestionProduct[];
};

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (raw.length === 0) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function scoreProduct(p: SuggestionProduct & { tags?: unknown }, qLower: string): number {
  const name = p.name?.toLowerCase?.() ?? "";
  const desc = p.description?.toLowerCase?.() ?? "";
  const category = p.category?.toLowerCase?.() ?? "";
  const brand = p.brand?.toLowerCase?.() ?? "";
  const tags = Array.isArray(p.tags) ? (p.tags as unknown[]).map((t) => String(t).toLowerCase()) : [];

  let score = 0;
  if (name.includes(qLower)) score += 6;
  if (brand && brand.includes(qLower)) score += 4;
  if (category && category.includes(qLower)) score += 4;
  if (desc && desc.includes(qLower)) score += 2;
  if (tags.some((t) => t.includes(qLower))) score += 3;

  return score;
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const limitProductsParam = Number(req.nextUrl.searchParams.get("limitProducts") || "8");
    const limitCategoriesParam = Number(req.nextUrl.searchParams.get("limitCategories") || "6");

    const limitProducts = Number.isFinite(limitProductsParam) ? Math.min(Math.max(limitProductsParam, 1), 12) : 8;
    const limitCategories = Number.isFinite(limitCategoriesParam) ? Math.min(Math.max(limitCategoriesParam, 1), 10) : 6;

    if (!q || q.length < 2) {
      return NextResponse.json({
        query: q,
        categories: [],
        products: [],
      } satisfies SuggestionsResponse);
    }

    // Prevent Supabase `.or('...')` parse issues from commas/wildcards.
    const safeQ = q.replace(/[%,]/g, "").toLowerCase();
    if (!safeQ) {
      return NextResponse.json({
        query: q,
        categories: [],
        products: [],
      } satisfies SuggestionsResponse);
    }

    const pattern = `%${safeQ}%`;
    const orExpression = [
      `name.ilike.${pattern}`,
      `description.ilike.${pattern}`,
      `category.ilike.${pattern}`,
      `brand.ilike.${pattern}`,
      `subcategory.ilike.${pattern}`,
    ].join(",");

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price,compare_at_price,image,category,subcategory,brand,tags,published,featured,created_at")
      .or(orExpression)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ query: q, categories: [], products: [] } satisfies SuggestionsResponse, { status: 200 });
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    // Use the same sanitized query we used for the ilike search to keep scoring consistent.
    const qLower = safeQ;

    const scored = rows
      .map((row) => {
        const product: SuggestionProduct & { tags?: unknown } = {
          id: String(row.id),
          name: String(row.name ?? ""),
          description: String(row.description ?? ""),
          price: parseNumber(row.price),
          compareAtPrice: parseOptionalNumber(row.compare_at_price),
          image: String(row.image ?? ""),
          category: String(row.category ?? ""),
          brand: String(row.brand ?? ""),
          tags: row.tags,
        };

        const score = scoreProduct(product, qLower);
        return { product, score };
      })
      .filter((item) => item.product.name.length > 0 && item.score > 0)
      .sort((a, b) => b.score - a.score);

    const topProducts = scored.slice(0, limitProducts).map((s) => s.product);

    const categoryMap = new Map<string, SuggestionCategory>();
    for (const { product, score } of scored) {
      const name = product.category?.trim();
      if (!name) continue;

      const existing = categoryMap.get(name);
      if (!existing) {
        categoryMap.set(name, {
          name,
          image: product.image,
          count: 1,
          topScore: score,
        });
        continue;
      }

      existing.count += 1;
      if (score > existing.topScore) {
        existing.topScore = score;
        existing.image = product.image;
      }
    }

    const topCategories = Array.from(categoryMap.values())
      .sort((a, b) => b.topScore - a.topScore || b.count - a.count)
      .slice(0, limitCategories)
      .map(({ topScore: _topScore, ...rest }) => rest);

    const response: SuggestionsResponse = {
      query: q,
      categories: topCategories,
      products: topProducts,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      {
        query: "",
        categories: [],
        products: [],
      } satisfies SuggestionsResponse,
      { status: 200 }
    );
  }
}

