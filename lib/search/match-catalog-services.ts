import {
  serviceIntentKeywordsByCategoryId,
  userServiceCategories,
  type UserServiceCategory,
} from '@/lib/services-catalog';
import { buildExpandedRankingTokens, normalizeSearchText } from '@/lib/search/expand-query';

export type MatchedCatalogService = {
  id: string;
  name: string;
  categoryId: string;
  categoryTitle: string;
  emoji: string;
  score: number;
};

export type MatchedCatalogCategory = {
  category: UserServiceCategory;
  matchingServiceCount: number;
  topServiceName: string;
  score: number;
};

export type BuyerServicesSearchResult = {
  query: string;
  categories: MatchedCatalogCategory[];
  services: MatchedCatalogService[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenHaystackScore(hay: string, token: string, weight: number): number {
  if (!hay || !token) return 0;
  const t = token.toLowerCase();
  if (hay === t) return weight * 10;
  if (hay.startsWith(`${t} `) || hay.startsWith(`${t}-`) || hay.startsWith(`${t}(`)) return weight * 7;
  if (hay.startsWith(t)) return weight * 6;
  const boundary = new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}([^a-z0-9]|$)`, 'i');
  if (boundary.test(hay)) return weight * 4;
  if (hay.includes(t)) return weight;
  return 0;
}

export function scoreCatalogService(
  serviceName: string,
  categoryTitle: string,
  categoryId: string,
  keywords: string[],
  qLower: string,
  tokens: string[],
): number {
  const svc = serviceName.toLowerCase();
  const title = categoryTitle.toLowerCase();
  const idNorm = categoryId.toLowerCase().replace(/-/g, ' ');
  const kwBlob = keywords.map((k) => k.toLowerCase()).join(' ');
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

function scoreCatalogCategory(
  cat: UserServiceCategory,
  keywords: string[],
  qLower: string,
  tokens: string[],
  bestServiceScore: number,
  matchingServiceCount: number,
): number {
  const title = cat.title.toLowerCase();
  const useWhen = cat.useWhen.toLowerCase();
  const idNorm = cat.id.toLowerCase().replace(/-/g, ' ');
  const kwBlob = keywords.map((k) => k.toLowerCase()).join(' ');
  const effectiveTokens = tokens.length > 0 ? tokens : qLower.length >= 2 ? [qLower] : [];

  let score = Math.max(0, Math.floor(bestServiceScore * 0.55));
  if (qLower.length >= 2 && title.includes(qLower)) score += 28;
  if (qLower.length >= 2 && useWhen.includes(qLower)) score += 10;
  if (qLower.length >= 2 && idNorm.includes(qLower)) score += 12;

  for (const tok of effectiveTokens) {
    score += tokenHaystackScore(title, tok, 12);
    score += tokenHaystackScore(useWhen, tok, 4);
    score += tokenHaystackScore(idNorm, tok, 6);
    score += tokenHaystackScore(kwBlob, tok, 7);
  }

  if (matchingServiceCount > 0) score += Math.min(18, matchingServiceCount * 3);
  if (cat.priority === 'urgent') score += 2;
  return score;
}

/** Rank buyer catalog services for a marketplace search query. */
export function matchCatalogServices(query: string, limit = 12): MatchedCatalogService[] {
  return searchBuyerServicesCatalog(query, { serviceLimit: limit }).services;
}

/**
 * Live catalog search for the buyer Services page: ranked categories + line-item services.
 * Empty / short queries return every category and no service hits (browse mode).
 */
export function searchBuyerServicesCatalog(
  query: string,
  options?: { serviceLimit?: number },
): BuyerServicesSearchResult {
  const safeQ = normalizeSearchText(query);
  const serviceLimit = Math.max(1, options?.serviceLimit ?? 24);

  if (!safeQ || safeQ.length < 2) {
    return {
      query: safeQ,
      categories: userServiceCategories.map((category) => ({
        category,
        matchingServiceCount: category.services.length,
        topServiceName: category.services[0]?.name ?? '',
        score: 0,
      })),
      services: [],
    };
  }

  const { rankingTokens } = buildExpandedRankingTokens(safeQ);
  const services: MatchedCatalogService[] = [];
  const categories: MatchedCatalogCategory[] = [];

  for (const cat of userServiceCategories) {
    const keywords = serviceIntentKeywordsByCategoryId[cat.id] ?? [];
    let bestServiceScore = 0;
    let matchingServiceCount = 0;
    let topServiceName = cat.services[0]?.name ?? '';

    for (const service of cat.services) {
      const score = scoreCatalogService(
        service.name,
        cat.title,
        cat.id,
        keywords,
        safeQ,
        rankingTokens,
      );
      if (score <= 0) continue;
      matchingServiceCount += 1;
      if (score > bestServiceScore) {
        bestServiceScore = score;
        topServiceName = service.name;
      }
      services.push({
        id: `${cat.id}\x1f${service.name}`,
        name: service.name,
        categoryId: cat.id,
        categoryTitle: cat.title,
        emoji: cat.emoji,
        score,
      });
    }

    const catScore = scoreCatalogCategory(
      cat,
      keywords,
      safeQ,
      rankingTokens,
      bestServiceScore,
      matchingServiceCount,
    );
    if (catScore <= 0) continue;

    categories.push({
      category: cat,
      matchingServiceCount: matchingServiceCount || cat.services.length,
      topServiceName,
      score: catScore,
    });
  }

  services.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  categories.sort(
    (a, b) =>
      b.score - a.score ||
      a.category.title.localeCompare(b.category.title),
  );

  return {
    query: safeQ,
    categories,
    services: services.slice(0, serviceLimit),
  };
}
