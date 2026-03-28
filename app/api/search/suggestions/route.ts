import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serviceIntentKeywordsByCategoryId, userServiceCategories } from "@/lib/services-catalog";

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

type CategoryAggregate = {
  name: string;
  image: string;
  count: number;
  topScore: number;
};

type CategorySearchRow = {
  name: string;
  image: string;
  count: number;
  headline: string;
};

type SuggestionService = {
  id: string;
  name: string;
  categoryId: string;
  categoryTitle: string;
};

type ServiceCategorySearchRow = {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  count: number;
  headline: string;
  topServiceName: string;
};

type SuggestionsResponse = {
  query: string;
  categories: CategorySearchRow[];
  products: SuggestionProduct[];
  serviceCategories: ServiceCategorySearchRow[];
  services: SuggestionService[];
};

function titleCaseDisplayQuery(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (w.length >= 2 && w === w.toUpperCase()) return w;
      return w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** e.g. "tyre" + "Tyres" → "Tyre in Tyres"; same label as query+category → "Tyres · N products". */
function categoryBrowseHeadline(displayTopic: string, categoryName: string, count: number): string {
  const cat = categoryName.trim();
  const topic = displayTopic.trim();
  const tL = topic.toLowerCase();
  const cL = cat.toLowerCase();
  const countLabel = `${count} ${count === 1 ? "product" : "products"}`;
  if (!topic) {
    return `${cat} · ${countLabel}`;
  }
  if (tL === cL) {
    return `${cat} · ${countLabel}`;
  }
  return `${topic} in ${cat}`;
}

/** Headline for buyer service catalog category rows (e.g. Tow in Emergency Help…). */
function serviceBrowseHeadline(displayTopic: string, categoryTitle: string, count: number): string {
  const cat = categoryTitle.trim();
  const topic = displayTopic.trim();
  const tL = topic.toLowerCase();
  const cL = cat.toLowerCase();
  const countLabel = `${count} matching ${count === 1 ? "service" : "services"}`;
  if (!topic) {
    return `${cat} · ${countLabel}`;
  }
  if (tL === cL) {
    return `${cat} · ${countLabel}`;
  }
  return `${topic} in ${cat}`;
}

function imagePreferenceRank(url: string): number {
  const u = (url || "").trim().toLowerCase();
  if (!u) return 0;
  if (u.includes("placeholder")) return 1;
  return 2;
}

function categoryQueryAffinity(categoryName: string, qLower: string, tokens: string[]): number {
  const c = categoryName.toLowerCase();
  let bonus = 0;
  if (qLower.length >= 2 && c.includes(qLower)) bonus += 10;
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (c === t) bonus += 14;
    else if (c.includes(t)) bonus += 6;
  }
  return bonus;
}

function serviceCategoryAffinity(
  categoryTitle: string,
  categoryId: string,
  keywords: string[],
  qLower: string,
  tokens: string[],
): number {
  const title = categoryTitle.toLowerCase();
  const idNorm = categoryId.toLowerCase().replace(/-/g, " ");
  let bonus = 0;
  if (qLower.length >= 2 && title.includes(qLower)) bonus += 10;
  if (qLower.length >= 2 && idNorm.includes(qLower)) bonus += 6;
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (title.includes(t)) bonus += 7;
    if (idNorm.includes(t)) bonus += 5;
  }
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (qLower.length >= 2 && (k.includes(qLower) || qLower.includes(k))) bonus += 6;
    for (const t of tokens) {
      if (t.length < 2) continue;
      if (k.includes(t) || t.includes(k)) bonus += 3;
    }
  }
  return bonus;
}

type ServiceCategoryAggregate = {
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  count: number;
  topScore: number;
  topServiceName: string;
};

function scoreAllCatalogServices(
  qLower: string,
  tokens: string[],
): Array<{ item: SuggestionService; score: number }> {
  const out: Array<{ item: SuggestionService; score: number }> = [];
  for (const cat of userServiceCategories) {
    const keywords = serviceIntentKeywordsByCategoryId[cat.id] ?? [];
    for (const name of cat.services) {
      const score = scoreCatalogServiceSmart(name, cat.title, cat.id, keywords, qLower, tokens);
      if (score <= 0) continue;
      out.push({
        score,
        item: {
          id: `${cat.id}\x1f${name}`,
          name,
          categoryId: cat.id,
          categoryTitle: cat.title,
        },
      });
    }
  }
  return out;
}

function buildServiceSuggestionPayload(
  serviceScored: Array<{ item: SuggestionService; score: number }>,
  q: string,
  qLower: string,
  rankingTokens: string[],
  limitServiceCategories: number,
  limitLineItems: number,
): { serviceCategories: ServiceCategorySearchRow[]; services: SuggestionService[] } {
  const displayTopic = titleCaseDisplayQuery(q);
  const byCat = new Map<string, ServiceCategoryAggregate>();
  const catMeta = new Map(userServiceCategories.map((c) => [c.id, c] as const));

  for (const { item, score } of serviceScored) {
    const id = item.categoryId;
    const meta = catMeta.get(id);
    const emoji = meta?.emoji ?? "📋";
    const title = item.categoryTitle;
    const ex = byCat.get(id);
    if (!ex) {
      byCat.set(id, {
        categoryId: id,
        categoryTitle: title,
        emoji,
        count: 1,
        topScore: score,
        topServiceName: item.name,
      });
      continue;
    }
    ex.count += 1;
    if (score > ex.topScore) {
      ex.topScore = score;
      ex.topServiceName = item.name;
    } else if (score === ex.topScore && item.name.length > ex.topServiceName.length) {
      ex.topServiceName = item.name;
    }
  }

  const serviceCategories: ServiceCategorySearchRow[] = Array.from(byCat.values())
    .sort((a, b) => {
      const kwA = serviceIntentKeywordsByCategoryId[a.categoryId] ?? [];
      const kwB = serviceIntentKeywordsByCategoryId[b.categoryId] ?? [];
      const affA = serviceCategoryAffinity(a.categoryTitle, a.categoryId, kwA, qLower, rankingTokens);
      const affB = serviceCategoryAffinity(b.categoryTitle, b.categoryId, kwB, qLower, rankingTokens);
      const ra = a.topScore + affA;
      const rb = b.topScore + affB;
      if (rb !== ra) return rb - ra;
      return b.count - a.count || a.categoryTitle.localeCompare(b.categoryTitle);
    })
    .slice(0, limitServiceCategories)
    .map((row) => ({
      categoryId: row.categoryId,
      categoryTitle: row.categoryTitle,
      emoji: row.emoji,
      count: row.count,
      headline: serviceBrowseHeadline(displayTopic, row.categoryTitle, row.count),
      topServiceName: row.topServiceName,
    }));

  const sorted = [...serviceScored].sort((a, b) => b.score - a.score);
  const distinctCats = byCat.size;
  const many = serviceScored.length >= 5 || distinctCats >= 2;
  const sliceN = many ? Math.min(3, limitLineItems) : limitLineItems;

  const services: SuggestionService[] = [];
  const seen = new Set<string>();
  for (const { item } of sorted) {
    const key = `${item.categoryId}\x1f${item.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    services.push(item);
    if (services.length >= sliceN) break;
  }

  return { serviceCategories, services };
}

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

const PRODUCT_ILIKE_FIELDS = ["name", "description", "category", "brand", "subcategory"] as const;

function sanitizeIlikeToken(t: string): string {
  return t.replace(/[%,]/g, "").toLowerCase();
}

/** Distinct search tokens (2+ chars), max 6 — used for AND-style DB filter + ranking. */
function searchTokensFromSafeQuery(safeQ: string): string[] {
  const raw = safeQ
    .split(/\s+/)
    .map(sanitizeIlikeToken)
    .filter((t) => t.length >= 2);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}

function ilikeOrClauseForToken(token: string): string {
  const p = `%${token}%`;
  return PRODUCT_ILIKE_FIELDS.map((f) => `${f}.ilike.${p}`).join(",");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * How strongly `token` matches `hay` (already lowercased): exact > prefix > word boundary > substring.
 */
function tokenHaystackScore(hay: string, token: string, weight: number): number {
  if (!hay || !token) return 0;
  const t = token.toLowerCase();
  if (hay === t) return weight * 10;
  if (hay.startsWith(t + " ") || hay.startsWith(t + "-") || hay.startsWith(t + "(")) return weight * 7;
  if (hay.startsWith(t)) return weight * 6;
  const boundary = new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}([^a-z0-9]|$)`, "i");
  if (boundary.test(hay)) return weight * 4;
  if (hay.includes(t)) return weight;
  return 0;
}

type ProductScoreInput = SuggestionProduct & {
  tags?: unknown;
  subcategory?: string;
  featured?: boolean;
  createdAt?: string;
};

function scoreProductSmart(p: ProductScoreInput, qLower: string, tokens: string[]): number {
  const name = (p.name || "").toLowerCase();
  const brand = (p.brand || "").toLowerCase();
  const category = (p.category || "").toLowerCase();
  const sub = (p.subcategory || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const tags = Array.isArray(p.tags) ? (p.tags as unknown[]).map((t) => String(t).toLowerCase()) : [];
  const tagBlob = tags.join(" ");

  const effectiveTokens = tokens.length > 0 ? tokens : qLower.length >= 2 ? [qLower] : [];

  let score = 0;
  if (qLower.length >= 2 && name.includes(qLower)) score += 28;
  else if (qLower.length >= 2 && `${brand} ${category} ${sub}`.includes(qLower)) score += 6;

  let tokensAllInName = effectiveTokens.length > 0;
  for (const tok of effectiveTokens) {
    const inName = tokenHaystackScore(name, tok, 12);
    const inBrand = tokenHaystackScore(brand, tok, 7);
    const inTax = Math.max(tokenHaystackScore(category, tok, 6), tokenHaystackScore(sub, tok, 6));
    const inTags = tokenHaystackScore(tagBlob, tok, 5);
    const inDesc = tokenHaystackScore(desc, tok, 2);
    const best = Math.max(inName, inBrand, inTax, inTags, inDesc);
    score += best;
    if (inName < 1) tokensAllInName = false;
  }

  if (effectiveTokens.length >= 2 && tokensAllInName) score += 18;
  if (effectiveTokens.length >= 2 && name.includes(qLower)) score += 12;

  return score;
}

function scoreCatalogServiceSmart(
  serviceName: string,
  categoryTitle: string,
  categoryId: string,
  keywords: string[],
  qLower: string,
  tokens: string[],
): number {
  const svc = serviceName.toLowerCase();
  const title = categoryTitle.toLowerCase();
  const idNorm = categoryId.toLowerCase().replace(/-/g, " ");
  const kwBlob = keywords.map((k) => k.toLowerCase()).join(" ");

  const effectiveTokens = tokens.length > 0 ? tokens : qLower.length >= 2 ? [qLower] : [];

  let score = 0;
  if (qLower.length >= 2 && svc.includes(qLower)) score += 24;

  for (const tok of effectiveTokens) {
    score += tokenHaystackScore(svc, tok, 14);
    score += tokenHaystackScore(title, tok, 6);
    score += tokenHaystackScore(idNorm, tok, 4);
    score += tokenHaystackScore(kwBlob, tok, 5);
  }

  if (effectiveTokens.length >= 2 && effectiveTokens.every((t) => svc.includes(t))) score += 14;
  return score;
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const limitProductsParam = Number(req.nextUrl.searchParams.get("limitProducts") || "8");
    const limitCategoriesParam = Number(req.nextUrl.searchParams.get("limitCategories") || "6");
    const limitServicesParam = Number(req.nextUrl.searchParams.get("limitServices") || "6");
    const limitServiceCategoriesParam = Number(req.nextUrl.searchParams.get("limitServiceCategories") || "6");

    const limitProducts = Number.isFinite(limitProductsParam) ? Math.min(Math.max(limitProductsParam, 1), 12) : 8;
    const limitCategories = Number.isFinite(limitCategoriesParam) ? Math.min(Math.max(limitCategoriesParam, 1), 10) : 6;
    const limitServices = Number.isFinite(limitServicesParam) ? Math.min(Math.max(limitServicesParam, 1), 10) : 6;
    const limitServiceCategories = Number.isFinite(limitServiceCategoriesParam)
      ? Math.min(Math.max(limitServiceCategoriesParam, 1), 10)
      : 6;

    if (!q || q.length < 2) {
      return NextResponse.json({
        query: q,
        categories: [],
        products: [],
        serviceCategories: [],
        services: [],
      } satisfies SuggestionsResponse);
    }

    // Prevent Supabase `.or('...')` parse issues from commas/wildcards.
    const safeQ = q
      .replace(/[%,]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
    if (!safeQ) {
      return NextResponse.json({
        query: q,
        categories: [],
        products: [],
        serviceCategories: [],
        services: [],
      } satisfies SuggestionsResponse);
    }

    const searchTokens = searchTokensFromSafeQuery(safeQ);
    const rankingTokens = searchTokens.length > 0 ? searchTokens : safeQ.length >= 2 ? [safeQ] : [];
    const serviceScored = scoreAllCatalogServices(safeQ, rankingTokens);
    const { serviceCategories, services: catalogServices } = buildServiceSuggestionPayload(
      serviceScored,
      q,
      safeQ,
      rankingTokens,
      limitServiceCategories,
      limitServices,
    );

    const supabase = createAdminClient();
    let productQuery = supabase
      .from("products")
      .select("id,name,description,price,compare_at_price,image,category,subcategory,brand,tags,published,featured,created_at")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(120);

    for (const token of rankingTokens) {
      productQuery = productQuery.or(ilikeOrClauseForToken(token));
    }

    const { data, error } = await productQuery;

    if (error) {
      return NextResponse.json(
        {
          query: q,
          categories: [],
          products: [],
          serviceCategories,
          services: catalogServices,
        } satisfies SuggestionsResponse,
        { status: 200 },
      );
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    // Use the same sanitized query we used for the ilike search to keep scoring consistent.
    const qLower = safeQ;

    const scored = rows
      .map((row) => {
        const product: ProductScoreInput = {
          id: String(row.id),
          name: String(row.name ?? ""),
          description: String(row.description ?? ""),
          price: parseNumber(row.price),
          compareAtPrice: parseOptionalNumber(row.compare_at_price),
          image: String(row.image ?? ""),
          category: String(row.category ?? ""),
          brand: String(row.brand ?? ""),
          subcategory: String(row.subcategory ?? ""),
          tags: row.tags,
          featured: Boolean(row.featured),
          createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
        };

        const score = scoreProductSmart(product, qLower, rankingTokens);
        return { product, score };
      })
      .filter((item) => item.product.name.length > 0 && item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const fa = a.product.featured ? 1 : 0;
        const fb = b.product.featured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        const ta = a.product.createdAt ?? "";
        const tb = b.product.createdAt ?? "";
        return tb.localeCompare(ta);
      });

    const categoryMap = new Map<string, CategoryAggregate>();
    for (const { product, score } of scored) {
      const name = product.category?.trim();
      if (!name || name.toLowerCase() === "all") continue;

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
      } else if (score === existing.topScore) {
        if (imagePreferenceRank(product.image) > imagePreferenceRank(existing.image)) {
          existing.image = product.image;
        }
      }
    }

    const distinctCategoryCount = categoryMap.size;
    const totalMatched = scored.length;
    const preferCategoryBrowse = totalMatched >= 4 || distinctCategoryCount >= 2;
    const productSliceLimit = preferCategoryBrowse ? Math.min(3, limitProducts) : limitProducts;
    const topProducts = scored.slice(0, productSliceLimit).map((s) => s.product);

    const displayTopic = titleCaseDisplayQuery(q);
    const topCategories: CategorySearchRow[] = Array.from(categoryMap.values())
      .sort((a, b) => {
        const affA = categoryQueryAffinity(a.name, qLower, rankingTokens);
        const affB = categoryQueryAffinity(b.name, qLower, rankingTokens);
        const rankA = a.topScore + affA;
        const rankB = b.topScore + affB;
        if (rankB !== rankA) return rankB - rankA;
        return b.count - a.count || a.name.localeCompare(b.name);
      })
      .slice(0, limitCategories)
      .map((row) => ({
        name: row.name,
        image: row.image?.trim() ? row.image : "",
        count: row.count,
        headline: categoryBrowseHeadline(displayTopic, row.name, row.count),
      }));

    const response: SuggestionsResponse = {
      query: q,
      categories: topCategories,
      products: topProducts,
      serviceCategories,
      services: catalogServices,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      {
        query: "",
        categories: [],
        products: [],
        serviceCategories: [],
        services: [],
      } satisfies SuggestionsResponse,
      { status: 200 }
    );
  }
}

