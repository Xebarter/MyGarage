export type ShopProductAccent = {
  bg: string;
  border: string;
};

/** Soft pastel tile fills on the light canvas. */
const ACCENTS: { light: ShopProductAccent; dark: ShopProductAccent }[] = [
  {
    light: { bg: '#FFFFFF', border: '#E2E6EE' },
    dark: { bg: '#FFFFFF', border: '#E2E6EE' },
  },
  {
    light: { bg: '#F8FAFC', border: '#E2E6EE' },
    dark: { bg: '#F8FAFC', border: '#E2E6EE' },
  },
  {
    light: { bg: '#FFFFFF', border: '#DBEAFE' },
    dark: { bg: '#FFFFFF', border: '#DBEAFE' },
  },
  {
    light: { bg: '#FFFFFF', border: '#D1FAE5' },
    dark: { bg: '#FFFFFF', border: '#D1FAE5' },
  },
  {
    light: { bg: '#FFFFFF', border: '#FEF3C7' },
    dark: { bg: '#FFFFFF', border: '#FEF3C7' },
  },
  {
    light: { bg: '#FFFFFF', border: '#E0E7FF' },
    dark: { bg: '#FFFFFF', border: '#E0E7FF' },
  },
];

const FALLBACK = ACCENTS[0]!;

export function getShopProductAccent(index: number, scheme: 'light' | 'dark'): ShopProductAccent {
  if (!Number.isFinite(index) || ACCENTS.length === 0) {
    return FALLBACK[scheme];
  }
  const safeIndex = ((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length;
  return ACCENTS[safeIndex]?.[scheme] ?? FALLBACK[scheme];
}

export function shopProductAccentIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % ACCENTS.length;
  }
  return hash;
}
