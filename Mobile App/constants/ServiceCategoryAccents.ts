/** Per-category accents — soft tinted white cards for light professional UI. */
export type CategoryCardAccent = {
  iconBg: string;
  ring: string;
  glassBg: string;
  glassBorder: string;
  glow: string;
  glowSecondary: string;
  accent: string;
  sheen: string;
};

const ACCENTS: { light: CategoryCardAccent; dark: CategoryCardAccent }[] = [
  {
    light: {
      iconBg: '#FEE2E2',
      ring: 'rgba(220,38,38,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(220,38,38,0.08)',
      glowSecondary: 'rgba(251,113,133,0.05)',
      accent: '#DC2626',
      sheen: 'rgba(255,255,255,0)',
    },
    dark: {
      iconBg: '#FEE2E2',
      ring: 'rgba(220,38,38,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(220,38,38,0.08)',
      glowSecondary: 'rgba(251,113,133,0.05)',
      accent: '#DC2626',
      sheen: 'rgba(255,255,255,0)',
    },
  },
  {
    light: {
      iconBg: '#DBEAFE',
      ring: 'rgba(37,99,235,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(37,99,235,0.08)',
      glowSecondary: 'rgba(96,165,250,0.05)',
      accent: '#2563EB',
      sheen: 'rgba(255,255,255,0)',
    },
    dark: {
      iconBg: '#DBEAFE',
      ring: 'rgba(37,99,235,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(37,99,235,0.08)',
      glowSecondary: 'rgba(96,165,250,0.05)',
      accent: '#2563EB',
      sheen: 'rgba(255,255,255,0)',
    },
  },
  {
    light: {
      iconBg: '#D1FAE5',
      ring: 'rgba(5,150,105,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(5,150,105,0.08)',
      glowSecondary: 'rgba(52,211,153,0.05)',
      accent: '#059669',
      sheen: 'rgba(255,255,255,0)',
    },
    dark: {
      iconBg: '#D1FAE5',
      ring: 'rgba(5,150,105,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(5,150,105,0.08)',
      glowSecondary: 'rgba(52,211,153,0.05)',
      accent: '#059669',
      sheen: 'rgba(255,255,255,0)',
    },
  },
  {
    light: {
      iconBg: '#FEF3C7',
      ring: 'rgba(217,119,6,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(217,119,6,0.08)',
      glowSecondary: 'rgba(251,191,36,0.05)',
      accent: '#D97706',
      sheen: 'rgba(255,255,255,0)',
    },
    dark: {
      iconBg: '#FEF3C7',
      ring: 'rgba(217,119,6,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(217,119,6,0.08)',
      glowSecondary: 'rgba(251,191,36,0.05)',
      accent: '#D97706',
      sheen: 'rgba(255,255,255,0)',
    },
  },
  {
    light: {
      iconBg: '#E0E7FF',
      ring: 'rgba(79,70,229,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(79,70,229,0.08)',
      glowSecondary: 'rgba(129,140,248,0.05)',
      accent: '#4F46E5',
      sheen: 'rgba(255,255,255,0)',
    },
    dark: {
      iconBg: '#E0E7FF',
      ring: 'rgba(79,70,229,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(79,70,229,0.08)',
      glowSecondary: 'rgba(129,140,248,0.05)',
      accent: '#4F46E5',
      sheen: 'rgba(255,255,255,0)',
    },
  },
  {
    light: {
      iconBg: '#CCFBF1',
      ring: 'rgba(13,148,136,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(13,148,136,0.08)',
      glowSecondary: 'rgba(45,212,191,0.05)',
      accent: '#0D9488',
      sheen: 'rgba(255,255,255,0)',
    },
    dark: {
      iconBg: '#CCFBF1',
      ring: 'rgba(13,148,136,0.28)',
      glassBg: '#FFFFFF',
      glassBorder: '#E2E6EE',
      glow: 'rgba(13,148,136,0.08)',
      glowSecondary: 'rgba(45,212,191,0.05)',
      accent: '#0D9488',
      sheen: 'rgba(255,255,255,0)',
    },
  },
];

const FALLBACK: { light: CategoryCardAccent; dark: CategoryCardAccent } = ACCENTS[1]!;

export function getCategoryCardAccent(index: number, scheme: 'light' | 'dark'): CategoryCardAccent {
  if (!Number.isFinite(index) || ACCENTS.length === 0) {
    return FALLBACK[scheme];
  }
  const safeIndex = ((index % ACCENTS.length) + ACCENTS.length) % ACCENTS.length;
  return ACCENTS[safeIndex]?.[scheme] ?? FALLBACK[scheme];
}

export const CATEGORY_CARD_ACCENT_COUNT = ACCENTS.length;
