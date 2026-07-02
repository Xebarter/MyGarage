import type { ServiceCategory } from '@/types';

export type CategoryTheme = {
  accent: string;
  accentMuted: string;
  onAccent: string;
};

/** Unique solid accent per category — priority badge still conveys urgency. */
const themes: Record<string, { light: CategoryTheme; dark: CategoryTheme }> = {
  'emergency-help': {
    light: { accent: '#DC2626', accentMuted: '#FEE2E2', onAccent: '#FFFFFF' },
    dark: { accent: '#F87171', accentMuted: '#450A0A', onAccent: '#1A2332' },
  },
  'fix-my-car': {
    light: { accent: '#16A34A', accentMuted: '#DCFCE7', onAccent: '#FFFFFF' },
    dark: { accent: '#4ADE80', accentMuted: '#14532D', onAccent: '#1A2332' },
  },
  'service-my-car': {
    light: { accent: '#059669', accentMuted: '#D1FAE5', onAccent: '#FFFFFF' },
    dark: { accent: '#34D399', accentMuted: '#064E3B', onAccent: '#1A2332' },
  },
  'tyres-battery': {
    light: { accent: '#CA8A04', accentMuted: '#FEF9C3', onAccent: '#1A2332' },
    dark: { accent: '#FACC15', accentMuted: '#422006', onAccent: '#1A2332' },
  },
  'car-wash-cleaning': {
    light: { accent: '#0891B2', accentMuted: '#CFFAFE', onAccent: '#FFFFFF' },
    dark: { accent: '#22D3EE', accentMuted: '#164E63', onAccent: '#1A2332' },
  },
  'body-repair-painting': {
    light: { accent: '#2563EB', accentMuted: '#DBEAFE', onAccent: '#FFFFFF' },
    dark: { accent: '#60A5FA', accentMuted: '#1E3A5F', onAccent: '#1A2332' },
  },
  'ac-cooling': {
    light: { accent: '#0D9488', accentMuted: '#CCFBF1', onAccent: '#FFFFFF' },
    dark: { accent: '#2DD4BF', accentMuted: '#134E4A', onAccent: '#1A2332' },
  },
  'security-tracking': {
    light: { accent: '#7C3AED', accentMuted: '#EDE9FE', onAccent: '#FFFFFF' },
    dark: { accent: '#A78BFA', accentMuted: '#2E1065', onAccent: '#1A2332' },
  },
  'documents-insurance': {
    light: { accent: '#4F46E5', accentMuted: '#E0E7FF', onAccent: '#FFFFFF' },
    dark: { accent: '#818CF8', accentMuted: '#1E1B4B', onAccent: '#1A2332' },
  },
  'drivers-transport': {
    light: { accent: '#0369A1', accentMuted: '#E0F2FE', onAccent: '#FFFFFF' },
    dark: { accent: '#38BDF8', accentMuted: '#0C4A6E', onAccent: '#1A2332' },
  },
  'fuel-delivery': {
    light: { accent: '#65A30D', accentMuted: '#ECFCCB', onAccent: '#1A2332' },
    dark: { accent: '#A3E635', accentMuted: '#365314', onAccent: '#1A2332' },
  },
  'rent-buy-car': {
    light: { accent: '#475569', accentMuted: '#F1F5F9', onAccent: '#FFFFFF' },
    dark: { accent: '#94A3B8', accentMuted: '#1E293B', onAccent: '#1A2332' },
  },
  'upgrade-my-car': {
    light: { accent: '#9333EA', accentMuted: '#F3E8FF', onAccent: '#FFFFFF' },
    dark: { accent: '#C084FC', accentMuted: '#3B0764', onAccent: '#1A2332' },
  },
};

const fallback: { light: CategoryTheme; dark: CategoryTheme } = {
  light: { accent: '#3B82F6', accentMuted: '#DBEAFE', onAccent: '#FFFFFF' },
  dark: { accent: '#60A5FA', accentMuted: '#1E3A5F', onAccent: '#1A2332' },
};

export function getCategoryTheme(
  categoryId: ServiceCategory['id'],
  scheme: 'light' | 'dark',
): CategoryTheme {
  return themes[categoryId]?.[scheme] ?? fallback[scheme];
}
