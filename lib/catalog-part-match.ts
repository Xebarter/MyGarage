import type { CatalogPick } from '@/data/sidebar-categories';
import { getAllCatalogPicks } from '@/data/sidebar-categories';

export type ScoredCatalogPick = CatalogPick & { score: number };

const MATCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'the',
  'with',
  'kit',
  'set',
  'new',
  'oem',
  'genuine',
  'original',
  'pair',
  'pcs',
  'pc',
  'pack',
  'front',
  'rear',
  'left',
  'right',
  'car',
  'auto',
  'vehicle',
  'part',
  'parts',
  'compatible',
  'replacement',
  'aftermarket',
  'brand',
  'model',
  'series',
  'type',
  'grade',
  'premium',
  'heavy',
  'duty',
  'high',
  'quality',
  'professional',
]);

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function tokenizeCatalogQuery(query: string): string[] {
  const normalized = normalizeMatchText(query);
  if (!normalized) return [];

  const raw = normalized.split(' ').filter(Boolean);
  const tokens = new Set<string>();

  for (const word of raw) {
    if (word.length < 2 || MATCH_STOP_WORDS.has(word)) continue;
    tokens.add(word);
    const singular = singularizeToken(word);
    if (singular !== word) tokens.add(singular);
  }

  return Array.from(tokens);
}

function scoreCatalogPick(query: string, tokens: string[], pick: CatalogPick, departmentHint?: string): number {
  const q = normalizeMatchText(query);
  if (!q) return 0;

  const category = normalizeMatchText(pick.category);
  const subcategory = normalizeMatchText(pick.subcategory);
  const department = normalizeMatchText(pick.department);
  const label = normalizeMatchText(pick.label);
  const combined = `${department} ${subcategory} ${category} ${label}`;

  let score = 0;

  if (category === q) score += 120;
  if (label === q) score += 110;
  if (category.includes(q)) score += 70;
  if (label.includes(q)) score += 55;
  if (subcategory.includes(q)) score += 35;
  if (department.includes(q)) score += 20;

  let matchedTokens = 0;
  for (const token of tokens) {
    let tokenMatched = false;
    if (category === token) {
      score += 45;
      tokenMatched = true;
    } else if (category.includes(token)) {
      score += 28;
      tokenMatched = true;
    } else if (label.includes(token)) {
      score += 18;
      tokenMatched = true;
    } else if (subcategory.includes(token)) {
      score += 12;
      tokenMatched = true;
    } else if (department.includes(token)) {
      score += 6;
      tokenMatched = true;
    }
    if (tokenMatched) matchedTokens += 1;
  }

  if (tokens.length > 0 && matchedTokens === tokens.length) {
    score += 25 + tokens.length * 4;
  }

  if (tokens.length >= 2) {
    const phrase = tokens.join(' ');
    if (category.includes(phrase)) score += 40;
    if (label.includes(phrase)) score += 30;
  }

  if (departmentHint && pick.department === departmentHint) {
    score += 12;
  }

  return score;
}

export function searchCatalogPicks(
  query: string,
  options?: {
    department?: string;
    limit?: number;
    minScore?: number;
  },
): ScoredCatalogPick[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const tokens = tokenizeCatalogQuery(trimmed);
  const departmentHint = options?.department?.trim() || undefined;
  const limit = options?.limit ?? 12;
  const minScore = options?.minScore ?? 18;

  const scored = getAllCatalogPicks()
    .map((pick) => ({
      ...pick,
      score: scoreCatalogPick(trimmed, tokens, pick, departmentHint),
    }))
    .filter((row) => row.score >= minScore)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.label.localeCompare(b.label) ||
        a.department.localeCompare(b.department),
    );

  return scored.slice(0, limit);
}

/** Best catalog match for a product/part name query, if confidence is high enough. */
export function findBestCatalogPick(
  query: string,
  options?: {
    department?: string;
    minScore?: number;
    minLead?: number;
  },
): ScoredCatalogPick | null {
  const results = searchCatalogPicks(query, {
    department: options?.department,
    limit: 3,
    minScore: options?.minScore ?? 40,
  });
  if (results.length === 0) return null;

  const best = results[0];
  const second = results[1];
  const minLead = options?.minLead ?? 8;

  if (second && best.score - second.score < minLead && best.score < 85) {
    return null;
  }

  return best;
}
