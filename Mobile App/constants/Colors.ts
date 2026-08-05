/** MyGarage brand palette — light professional buyer app. */
import { AppTheme } from '@/constants/AppTheme';

const primary = AppTheme.colors.primary;
const primarySoft = AppTheme.colors.primarySoft;

export default {
  light: {
    text: AppTheme.colors.text,
    textMuted: AppTheme.colors.textMuted,
    background: AppTheme.colors.canvas,
    card: AppTheme.colors.surface,
    border: AppTheme.colors.border,
    tint: primary,
    tabIconDefault: AppTheme.colors.textMuted,
    tabIconSelected: primary,
    primary,
    destructive: AppTheme.colors.danger,
    success: AppTheme.colors.success,
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
