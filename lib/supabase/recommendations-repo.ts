import type { Product } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { listProducts, rowToProduct } from "@/lib/supabase/products-repo";

type RecommendedProductRow = {
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
  feed_rank: number;
  feed_score: number | string;
  score_breakdown?: Record<string, unknown> | null;
};

export type RecommendedProduct = Product & {
  feedRank: number;
  feedScore: number;
  scoreBreakdown: Record<string, unknown>;
};

function parseScore(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function rowToRecommendedProduct(row: RecommendedProductRow): RecommendedProduct {
  const base = rowToProduct(row);
  return {
    ...base,
    feedRank: Number(row.feed_rank) || 0,
    feedScore: parseScore(row.feed_score),
    scoreBreakdown:
      row.score_breakdown && typeof row.score_breakdown === "object"
        ? row.score_breakdown
        : {},
  };
}

function mapRecommendedRows(rows: RecommendedProductRow[]): RecommendedProduct[] {
  const out: RecommendedProduct[] = [];
  for (const row of rows) {
    try {
      out.push(rowToRecommendedProduct(row));
    } catch {
      // RPC / snapshot shape drift; skip bad rows instead of failing the whole feed.
    }
  }
  return out;
}

async function listPublishedProductsFeed(
  limit: number,
  scoreBreakdown: Record<string, unknown>,
): Promise<RecommendedProduct[]> {
  const fallback = await listProducts();
  return fallback
    .filter((product) => product.published)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((product, index) => ({
      ...product,
      feedRank: index + 1,
      feedScore: product.featured ? 3 : 0,
      scoreBreakdown,
    }));
}

async function listCreativeAnonymousFeed(limit: number): Promise<RecommendedProduct[]> {
  const fallback = await listProducts();
  const published = fallback.filter((product) => product.published);
  const featured = published.filter((p) => p.featured);
  const rest = published.filter((p) => !p.featured);

  const shuffle = <T,>(arr: T[]) => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const shuffledFeatured = shuffle(featured);
  const shuffledRest = shuffle(rest);

  const featuredTarget = Math.min(shuffledFeatured.length, Math.ceil(limit * 0.6));
  const featuredPicked = shuffledFeatured.slice(0, featuredTarget);
  const remaining = Math.max(0, limit - featuredPicked.length);
  const restPicked = shuffledRest.slice(0, remaining);
  const combined = [...featuredPicked, ...restPicked];

  combined.sort((a, b) => Number(b.featured) - Number(a.featured) || Math.random() - 0.5);

  return combined.slice(0, limit).map((product, index) => ({
    ...product,
    feedRank: index + 1,
    feedScore: product.featured ? 3 : 0,
    scoreBreakdown: { fallback: true, creative: true },
  }));
}

export async function listRecommendedHomeFeed(
  customerId?: string,
  limit = 80,
  options?: { forceRefresh?: boolean },
): Promise<RecommendedProduct[]> {
  const forceRefresh = options?.forceRefresh ?? false;
  if (!customerId?.trim()) {
    try {
      return await listCreativeAnonymousFeed(limit);
    } catch (error) {
      console.error("listRecommendedHomeFeed anonymous feed:", error);
      try {
        return await listPublishedProductsFeed(limit, { fallback: true, reason: "anonymous_exception" });
      } catch (inner) {
        console.error("listRecommendedHomeFeed anonymous product fallback:", inner);
        return [];
      }
    }
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_customer_home_feed", {
      p_customer_id: customerId,
      p_limit: limit,
      p_force_refresh: forceRefresh,
    });

    if (error) {
      console.error("get_customer_home_feed RPC:", error.message);
      return listPublishedProductsFeed(limit, { fallback: true, reason: "rpc_error" });
    }

    const rows = (data as RecommendedProductRow[] | null) ?? [];

    if (!forceRefresh && rows.length > 0 && rows.length < Math.min(limit, 20)) {
      const refreshed = await supabase.rpc("get_customer_home_feed", {
        p_customer_id: customerId,
        p_limit: limit,
        p_force_refresh: true,
      });
      if (!refreshed.error) {
        const refreshedRows = (refreshed.data as RecommendedProductRow[] | null) ?? [];
        const mappedRefresh = mapRecommendedRows(refreshedRows);
        if (mappedRefresh.length > 0) return mappedRefresh;
      }
    }

    const mapped = mapRecommendedRows(rows);
    if (mapped.length > 0) return mapped;

    return listPublishedProductsFeed(limit, { fallback: true, reason: "empty_or_unmapped_rows" });
  } catch (error) {
    console.error("listRecommendedHomeFeed personalized path:", error);
    try {
      return await listPublishedProductsFeed(limit, { fallback: true, reason: "exception" });
    } catch (inner) {
      console.error("listRecommendedHomeFeed product fallback:", inner);
      return [];
    }
  }
}

export async function refreshAllCustomerHomeFeeds(limit = 120): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refresh_all_customer_home_feeds", {
    p_limit: limit,
  });

  if (error) {
    throw new Error(`Supabase refresh all feeds failed: ${error.message}`);
  }
}
