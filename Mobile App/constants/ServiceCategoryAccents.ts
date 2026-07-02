/** Mirrors web `CATEGORY_CARD_ACCENTS` on buyer/services — solid colors only. */
export type CategoryCardAccent = {
  iconBg: string;
  ring: string;
};

const ACCENTS: { light: CategoryCardAccent; dark: CategoryCardAccent }[] = [
  { light: { iconBg: '#FFE4E6', ring: '#FECDD3' }, dark: { iconBg: '#4C0519', ring: '#9F1239' } },
  { light: { iconBg: '#E0F2FE', ring: '#BAE6FD' }, dark: { iconBg: '#0C4A6E', ring: '#0369A1' } },
  { light: { iconBg: '#D1FAE5', ring: '#A7F3D0' }, dark: { iconBg: '#064E3B', ring: '#047857' } },
  { light: { iconBg: '#FEF3C7', ring: '#FDE68A' }, dark: { iconBg: '#451A03', ring: '#B45309' } },
  { light: { iconBg: '#EDE9FE', ring: '#DDD6FE' }, dark: { iconBg: '#2E1065', ring: '#6D28D9' } },
  { light: { iconBg: '#CCFBF1', ring: '#99F6E4' }, dark: { iconBg: '#134E4A', ring: '#0F766E' } },
];

const FALLBACK: { light: CategoryCardAccent; dark: CategoryCardAccent } = {
  light: { iconBg: '#E0F2FE', ring: '#BAE6FD' },
  dark: { iconBg: '#0C4A6E', ring: '#0369A1' },
};

export function getCategoryCardAccent(index: number, scheme: 'light' | 'dark'): CategoryCardAccent {
  if (!Number.isFinite(index) || ACCENTS.length === 0) {
    return FALLBACK[scheme];
  }
  const safeIndex = ((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length;
  return ACCENTS[safeIndex]?.[scheme] ?? FALLBACK[scheme];
}

export const CATEGORY_CARD_ACCENT_COUNT = ACCENTS.length;
