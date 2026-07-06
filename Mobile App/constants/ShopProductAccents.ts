export type ShopProductAccent = {
  bg: string;
  border: string;
};

const ACCENTS: { light: ShopProductAccent; dark: ShopProductAccent }[] = [
  {
    light: { bg: '#EFF6FF', border: '#BFDBFE' },
    dark: { bg: '#0F172A', border: '#1E3A8A' },
  },
  {
    light: { bg: '#ECFDF5', border: '#A7F3D0' },
    dark: { bg: '#0F1A14', border: '#166534' },
  },
  {
    light: { bg: '#FFF7ED', border: '#FED7AA' },
    dark: { bg: '#1A1208', border: '#9A3412' },
  },
  {
    light: { bg: '#F5F3FF', border: '#DDD6FE' },
    dark: { bg: '#151025', border: '#5B21B6' },
  },
  {
    light: { bg: '#FFF1F2', border: '#FECDD3' },
    dark: { bg: '#1A0B0D', border: '#9F1239' },
  },
  {
    light: { bg: '#ECFEFF', border: '#A5F3FC' },
    dark: { bg: '#0B1618', border: '#155E75' },
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
