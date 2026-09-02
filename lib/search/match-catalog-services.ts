import {
  serviceIntentKeywordsByCategoryId,
  userServiceCategories,
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

/** Rank buyer catalog services for a marketplace search query. */
export function matchCatalogServices(query: string, limit = 12): MatchedCatalogService[] {
  const safeQ = normalizeSearchText(query);
  if (!safeQ || safeQ.length < 2) return [];

  const { rankingTokens } = buildExpandedRankingTokens(safeQ);
  const scored: MatchedCatalogService[] = [];

  for (const cat of userServiceCategories) {
    const keywords = serviceIntentKeywordsByCategoryId[cat.id] ?? [];
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
      scored.push({
        id: `${cat.id}\x1f${service.name}`,
        name: service.name,
        categoryId: cat.id,
        categoryTitle: cat.title,
        emoji: cat.emoji,
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, Math.max(1, limit));
}
