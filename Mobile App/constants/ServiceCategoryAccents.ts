/** Per-category glass accents — each card gets a distinct tinted glass identity. */
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
      iconBg: 'rgba(255, 228, 230, 0.88)',
      ring: 'rgba(244, 63, 94, 0.42)',
      glassBg: 'rgba(255, 241, 242, 0.68)',
      glassBorder: 'rgba(244, 63, 94, 0.32)',
      glow: 'rgba(244, 63, 94, 0.22)',
      glowSecondary: 'rgba(251, 113, 133, 0.14)',
      accent: '#E11D48',
      sheen: 'rgba(255, 255, 255, 0.28)',
    },
    dark: {
      iconBg: 'rgba(159, 18, 57, 0.58)',
      ring: 'rgba(251, 113, 133, 0.45)',
      glassBg: 'rgba(76, 5, 25, 0.55)',
      glassBorder: 'rgba(251, 113, 133, 0.35)',
      glow: 'rgba(225, 29, 72, 0.32)',
      glowSecondary: 'rgba(190, 18, 60, 0.18)',
      accent: '#FB7185',
      sheen: 'rgba(255, 255, 255, 0.05)',
    },
  },
  {
    light: {
      iconBg: 'rgba(224, 242, 254, 0.9)',
      ring: 'rgba(14, 165, 233, 0.42)',
      glassBg: 'rgba(240, 249, 255, 0.7)',
      glassBorder: 'rgba(14, 165, 233, 0.3)',
      glow: 'rgba(14, 165, 233, 0.2)',
      glowSecondary: 'rgba(56, 189, 248, 0.12)',
      accent: '#0284C7',
      sheen: 'rgba(255, 255, 255, 0.28)',
    },
    dark: {
      iconBg: 'rgba(3, 105, 161, 0.55)',
      ring: 'rgba(56, 189, 248, 0.45)',
      glassBg: 'rgba(12, 74, 110, 0.58)',
      glassBorder: 'rgba(56, 189, 248, 0.32)',
      glow: 'rgba(14, 165, 233, 0.3)',
      glowSecondary: 'rgba(2, 132, 199, 0.16)',
      accent: '#38BDF8',
      sheen: 'rgba(255, 255, 255, 0.05)',
    },
  },
  {
    light: {
      iconBg: 'rgba(209, 250, 229, 0.9)',
      ring: 'rgba(16, 185, 129, 0.42)',
      glassBg: 'rgba(236, 253, 245, 0.7)',
      glassBorder: 'rgba(16, 185, 129, 0.3)',
      glow: 'rgba(16, 185, 129, 0.2)',
      glowSecondary: 'rgba(52, 211, 153, 0.12)',
      accent: '#059669',
      sheen: 'rgba(255, 255, 255, 0.28)',
    },
    dark: {
      iconBg: 'rgba(4, 120, 87, 0.55)',
      ring: 'rgba(52, 211, 153, 0.45)',
      glassBg: 'rgba(6, 78, 59, 0.58)',
      glassBorder: 'rgba(52, 211, 153, 0.32)',
      glow: 'rgba(16, 185, 129, 0.3)',
      glowSecondary: 'rgba(5, 150, 105, 0.16)',
      accent: '#34D399',
      sheen: 'rgba(255, 255, 255, 0.05)',
    },
  },
  {
    light: {
      iconBg: 'rgba(254, 243, 199, 0.92)',
      ring: 'rgba(245, 158, 11, 0.45)',
      glassBg: 'rgba(255, 251, 235, 0.72)',
      glassBorder: 'rgba(245, 158, 11, 0.32)',
      glow: 'rgba(245, 158, 11, 0.22)',
      glowSecondary: 'rgba(251, 191, 36, 0.14)',
      accent: '#D97706',
      sheen: 'rgba(255, 255, 255, 0.28)',
    },
    dark: {
      iconBg: 'rgba(180, 83, 9, 0.55)',
      ring: 'rgba(251, 191, 36, 0.45)',
      glassBg: 'rgba(69, 26, 3, 0.58)',
      glassBorder: 'rgba(251, 191, 36, 0.32)',
      glow: 'rgba(245, 158, 11, 0.3)',
      glowSecondary: 'rgba(217, 119, 6, 0.16)',
      accent: '#FBBF24',
      sheen: 'rgba(255, 255, 255, 0.05)',
    },
  },
  {
    light: {
      iconBg: 'rgba(237, 233, 254, 0.9)',
      ring: 'rgba(139, 92, 246, 0.42)',
      glassBg: 'rgba(245, 243, 255, 0.7)',
      glassBorder: 'rgba(139, 92, 246, 0.3)',
      glow: 'rgba(139, 92, 246, 0.2)',
      glowSecondary: 'rgba(167, 139, 250, 0.12)',
      accent: '#7C3AED',
      sheen: 'rgba(255, 255, 255, 0.28)',
    },
    dark: {
      iconBg: 'rgba(109, 40, 217, 0.55)',
      ring: 'rgba(167, 139, 250, 0.45)',
      glassBg: 'rgba(46, 16, 101, 0.58)',
      glassBorder: 'rgba(167, 139, 250, 0.32)',
      glow: 'rgba(139, 92, 246, 0.3)',
      glowSecondary: 'rgba(124, 58, 237, 0.16)',
      accent: '#A78BFA',
      sheen: 'rgba(255, 255, 255, 0.05)',
    },
  },
  {
    light: {
      iconBg: 'rgba(204, 251, 241, 0.9)',
      ring: 'rgba(20, 184, 166, 0.42)',
      glassBg: 'rgba(240, 253, 250, 0.7)',
      glassBorder: 'rgba(20, 184, 166, 0.3)',
      glow: 'rgba(20, 184, 166, 0.2)',
      glowSecondary: 'rgba(45, 212, 191, 0.12)',
      accent: '#0D9488',
      sheen: 'rgba(255, 255, 255, 0.28)',
    },
    dark: {
      iconBg: 'rgba(15, 118, 110, 0.55)',
      ring: 'rgba(45, 212, 191, 0.45)',
      glassBg: 'rgba(19, 78, 74, 0.58)',
      glassBorder: 'rgba(45, 212, 191, 0.32)',
      glow: 'rgba(20, 184, 166, 0.3)',
      glowSecondary: 'rgba(13, 148, 136, 0.16)',
      accent: '#2DD4BF',
      sheen: 'rgba(255, 255, 255, 0.05)',
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
