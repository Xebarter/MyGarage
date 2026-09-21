import { buildExpandedRankingTokens, normalizeSearchText, searchTokensFromQuery } from '@/lib/search/expand-query';

export type SearchableManagedService = {
  id: string;
  name: string;
  group: string;
  categoryId: string;
  description?: string;
  status: 'active' | 'paused' | string;
  mobileAvailable?: boolean;
  emergency?: boolean;
};

function fieldScore(hay: string, token: string, weight: number): number {
  if (!hay || !token) return 0;
  if (hay === token) return weight * 10;
  if (hay.startsWith(token)) return weight * 6;
  const re = new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  if (re.test(hay)) return weight * 4;
  if (hay.includes(token)) return weight;
  return 0;
}

/** Score how well a managed listing matches [query]. 0 = no match. */
export function scoreManagedService(service: SearchableManagedService, query: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 1;

  const name = normalizeSearchText(service.name);
  const group = normalizeSearchText(service.group);
  const desc = normalizeSearchText(service.description ?? '');
  const categoryId = normalizeSearchText(service.categoryId.replace(/-/g, ' '));
  const flags = normalizeSearchText(
    [service.status, service.mobileAvailable ? 'mobile' : '', service.emergency ? 'emergency' : '']
      .filter(Boolean)
      .join(' '),
  );

  const { rankingTokens } = buildExpandedRankingTokens(q);
  const primary = searchTokensFromQuery(q);
  const variants =
    rankingTokens.length > 0 ? rankingTokens : primary.length > 0 ? primary : q.length >= 2 ? [q] : [];

  let score = 0;
  if (q.length >= 2 && name.includes(q)) score += 28;
  if (q.length >= 2 && group.includes(q)) score += 14;
  if (q.length >= 2 && desc.includes(q)) score += 8;

  for (const tok of variants) {
    score += fieldScore(name, tok, 14);
    score += fieldScore(group, tok, 7);
    score += fieldScore(desc, tok, 4);
    score += fieldScore(flags, tok, 5);
    score += fieldScore(categoryId, tok, 3);
  }
  return score;
}

export function filterManagedServices<T extends SearchableManagedService>(
  services: T[],
  query: string,
  opts?: { status?: 'all' | 'active' | 'paused' },
): T[] {
  const status = opts?.status ?? 'all';
  let base = services;
  if (status === 'active') base = base.filter((s) => s.status === 'active');
  if (status === 'paused') base = base.filter((s) => s.status === 'paused');

  const q = query.trim();
  if (!q) return base;

  return base
    .map((service) => ({ service, score: scoreManagedService(service, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.service.name.localeCompare(b.service.name);
    })
    .map((row) => row.service);
}
