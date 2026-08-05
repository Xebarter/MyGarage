import { Platform, type ViewStyle } from 'react-native';

/**
 * Shared visual language for the MyGarage buyer app — light, professional, calm motion.
 */
export const AppTheme = {
  colors: {
    canvas: '#F4F6F9',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F4F8',
    border: '#E3E8F0',
    borderSoft: '#ECF0F5',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    primary: '#2563EB',
    primarySoft: '#3B82F6',
    primaryDeep: '#1D4ED8',
    primaryTint: 'rgba(37,99,235,0.10)',
    primaryBorder: 'rgba(37,99,235,0.18)',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    glowBlue: 'rgba(191,219,254,0.55)',
    glowSoft: 'rgba(37,99,235,0.08)',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
} as const;

export type AppShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'tab';

export function appShadow(level: AppShadowLevel = 'sm'): ViewStyle {
  if (level === 'none') return {};

  const map = {
    sm: { opacity: 0.05, radius: 10, offsetY: 3, elevation: 1 },
    md: { opacity: 0.07, radius: 16, offsetY: 6, elevation: 2 },
    lg: { opacity: 0.09, radius: 24, offsetY: 10, elevation: 4 },
    tab: { opacity: 0.06, radius: 16, offsetY: -6, elevation: 8 },
  } as const;

  const s = map[level];
  return Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: s.opacity,
      shadowOffset: { width: 0, height: s.offsetY },
      shadowRadius: s.radius,
    },
    android: {
      elevation: s.elevation,
    },
    default: {},
  }) as ViewStyle;
}

/** Soft press feedback values used with style callbacks. */
export const pressFeedback = {
  opacity: 0.88,
  scale: 0.985,
} as const;
