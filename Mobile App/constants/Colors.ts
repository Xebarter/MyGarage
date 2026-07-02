/** MyGarage brand palette — aligned with the web storefront. */
const primary = '#3B82F6';
const primaryDark = '#60A5FA';

export default {
  light: {
    text: '#1A2332',
    textMuted: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    tint: primary,
    tabIconDefault: '#94A3B8',
    tabIconSelected: primary,
    primary,
    destructive: '#EF4444',
    success: '#22C55E',
  },
  dark: {
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    tint: primaryDark,
    tabIconDefault: '#64748B',
    tabIconSelected: primaryDark,
    primary: primaryDark,
    destructive: '#F87171',
    success: '#4ADE80',
  },
};
