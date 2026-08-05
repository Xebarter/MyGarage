/** MyGarage brand palette — light professional, aligned with Services app. */
const primary = '#2563EB';
const primarySoft = '#3B82F6';

export default {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F6F7F9',
    card: '#FFFFFF',
    border: '#E2E6EE',
    tint: primary,
    tabIconDefault: '#94A3B8',
    tabIconSelected: primary,
    primary,
    destructive: '#DC2626',
    success: '#059669',
  },
  /** Kept for typed scheme access; app is light-first. */
  dark: {
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    tint: primarySoft,
    tabIconDefault: '#64748B',
    tabIconSelected: primarySoft,
    primary: primarySoft,
    destructive: '#F87171',
    success: '#34D399',
  },
};
