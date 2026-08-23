/**
 * Query expansion for marketplace search: synonyms, plurals, and token hygiene.
 */

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

/** Bidirectional automotive synonym groups (British/American + common aliases). */
const SYNONYM_GROUPS: string[][] = [
  ['tyre', 'tire', 'tyres', 'tires'],
  ['aluminium', 'aluminum'],
  ['colour', 'color'],
  ['centre', 'center'],
  ['petrol', 'gasoline', 'gas'],
  ['windscreen', 'windshield'],
  ['boot', 'trunk'],
  ['bonnet', 'hood'],
  ['silencer', 'muffler'],
  ['indicator', 'blinker', 'turn signal'],
  ['number plate', 'license plate', 'numberplate'],
  ['brake', 'brakes'],
  ['brake pad', 'brake pads', 'pads'],
  ['brake disc', 'brake disk', 'rotor', 'rotors'],
  ['oil filter', 'oilfilter'],
  ['air filter', 'airfilter'],
  ['fuel filter', 'fuelfilter'],
  ['spark plug', 'sparkplug', 'plugs'],
  ['battery', 'batteries', 'accumulator'],
  ['alternator', 'dynamo'],
  ['starter', 'starter motor'],
  ['radiator', 'radiators'],
  ['shock', 'shocks', 'shock absorber', 'damper'],
  ['suspension', 'strut', 'struts'],
  ['clutch', 'clutches'],
  ['gearbox', 'transmission', 'gear box'],
  ['wiper', 'wipers', 'wiper blade', 'wiper blades'],
  ['headlight', 'headlamp', 'headlights', 'headlamps'],
  ['taillight', 'tail lamp', 'taillights', 'rear light'],
  ['bumper', 'bumpers', 'fender'],
  ['exhaust', 'exhaust system'],
  ['coolant', 'antifreeze'],
  ['engine oil', 'motor oil', 'lubricant'],
  ['bearing', 'bearings'],
  ['belt', 'belts', 'serpentine'],
  ['hose', 'hoses'],
  ['gasket', 'gaskets'],
  ['filter', 'filters'],
  ['sensor', 'sensors'],
  ['pump', 'pumps'],
  ['relay', 'relays'],
  ['fuse', 'fuses'],
  ['bulb', 'bulbs', 'lamp'],
];

const SYNONYM_LOOKUP = (() => {
  const map = new Map<string, string[]>();
  for (const group of SYNONYM_GROUPS) {
    const normalized = group.map((g) => normalizeSearchText(g)).filter(Boolean);
    for (const key of normalized) {
      const others = normalized.filter((x) => x !== key);
      const existing = map.get(key) ?? [];
      map.set(key, Array.from(new Set([...existing, ...others])));
    }
  }
  return map;
})();

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[%,]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeIlikeToken(t: string): string {
  return t.replace(/[%,]/g, '').toLowerCase().trim();
}

export function singularizeToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('ses') && token.length > 4) return token.slice(0, -2);
  if (token.endsWith('es') && token.length > 4) {
    const stem = token.slice(0, -2);
    if (stem.endsWith('sh') || stem.endsWith('ch') || stem.endsWith('x') || stem.endsWith('z')) {
      return stem;
    }
    return token.slice(0, -1);
  }
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function pluralizeToken(token: string): string {
  if (token.length <= 2) return `${token}s`;
  if (token.endsWith('y') && token.length > 3 && !/[aeiou]y$/.test(token)) {
    return `${token.slice(0, -1)}ies`;
  }
  if (token.endsWith('s') || token.endsWith('x') || token.endsWith('z') || token.endsWith('ch') || token.endsWith('sh')) {
    return `${token}es`;
  }
  return `${token}s`;
}

/** Distinct meaningful tokens for ranking (includes singular forms). */
export function searchTokensFromQuery(safeQ: string): string[] {
  const raw = normalizeSearchText(safeQ)
    .split(/\s+/)
    .map(sanitizeIlikeToken)
    .filter((t) => t.length >= 2 && !MATCH_STOP_WORDS.has(t));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    for (const variant of [t, singularizeToken(t)]) {
      if (variant.length < 2 || seen.has(variant)) continue;
      seen.add(variant);
      out.push(variant);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

/**
 * For each primary query token, build an OR-set of surface forms (synonyms + plural/singular)
 * used for DB ILIKE matching.
 */
export function expandTokenVariants(token: string): string[] {
  const t = sanitizeIlikeToken(token);
  if (t.length < 2) return [];

  const variants = new Set<string>([t, singularizeToken(t), pluralizeToken(t), pluralizeToken(singularizeToken(t))]);

  const direct = SYNONYM_LOOKUP.get(t) ?? SYNONYM_LOOKUP.get(singularizeToken(t)) ?? [];
  for (const syn of direct) {
    for (const part of syn.split(/\s+/)) {
      const p = sanitizeIlikeToken(part);
      if (p.length >= 2) {
        variants.add(p);
        variants.add(singularizeToken(p));
      }
    }
    const full = sanitizeIlikeToken(syn);
    if (full.length >= 2 && !full.includes(' ')) variants.add(full);
  }

  // Phrase-level synonyms (e.g. "brake pad") — add constituent words already handled above.
  return Array.from(variants).filter((v) => v.length >= 2).slice(0, 10);
}

/** Expand multi-word synonym phrases when the full query matches a known alias. */
export function expandPhraseAliases(safeQ: string): string[] {
  const q = normalizeSearchText(safeQ);
  if (!q) return [];
  const out = new Set<string>();
  for (const group of SYNONYM_GROUPS) {
    const norms = group.map((g) => normalizeSearchText(g));
    if (!norms.some((n) => n.includes(' ') && (q === n || q.includes(n) || n.includes(q)))) continue;
    for (const n of norms) {
      if (n.length >= 2) out.add(n);
    }
  }
  return Array.from(out).slice(0, 8);
}

export function buildExpandedRankingTokens(safeQ: string): {
  primaryTokens: string[];
  rankingTokens: string[];
  dbTokenGroups: string[][];
} {
  const primaryTokens = searchTokensFromQuery(safeQ);
  const rankingSet = new Set<string>(primaryTokens);
  const phraseAliases = expandPhraseAliases(safeQ);
  for (const phrase of phraseAliases) {
    for (const part of phrase.split(/\s+/)) {
      if (part.length >= 2) rankingSet.add(part);
    }
  }

  const dbTokenGroups =
    primaryTokens.length > 0
      ? primaryTokens.map((t) => expandTokenVariants(t))
      : safeQ.length >= 2
        ? [expandTokenVariants(safeQ)]
        : [];

  for (const group of dbTokenGroups) {
    for (const v of group) rankingSet.add(v);
  }

  return {
    primaryTokens,
    rankingTokens: Array.from(rankingSet).slice(0, 16),
    dbTokenGroups,
  };
}
