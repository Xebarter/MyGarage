/**
 * Light professional services/profile chrome — cool canvas, white surfaces, blue accent.
 * Aligned with AppTheme.
 */
import { AppTheme } from '@/constants/AppTheme';

const C = AppTheme.colors;

export const SERVICES_PREMIUM = {
  bg: C.canvas,
  bgElevated: C.surface,
  bgGlass: C.surface,
  borderGlass: C.border,
  borderGlow: C.primaryBorder,
  text: C.text,
  textMuted: C.textSecondary,
  accent: C.primary,
  accentSoft: C.primarySoft,
  accentDeep: C.primaryDeep,
  copper: C.warning,
};

/** Services tab header shell — soft white with ambient blue. */
export const SERVICES_HEADER = {
  shellTop: C.surface,
  shellBottom: '#F8FAFC',
  glowPrimary: C.glowBlue,
  glowSecondary: C.glowSoft,
  bgGlass: C.surface,
  borderGlass: C.border,
};

export const SERVICES_SURFACE = {
  light: C.canvas,
  dark: C.canvas,
};

export function getServicesPageBackground(_scheme: 'light' | 'dark') {
  return SERVICES_SURFACE.light;
}

/** Profile header — same light family as Services. */
export const PROFILE_PREMIUM = {
  light: {
    shellTop: C.surface,
    shellBottom: '#F8FAFC',
    glowPrimary: C.glowBlue,
    glowSecondary: C.glowSoft,
    cardBg: C.surface,
    cardBorder: C.border,
    statBg: C.surfaceMuted,
    statBorder: C.border,
    text: C.text,
    textMuted: C.textSecondary,
    accent: C.primary,
    accentSoft: C.primarySoft,
    avatarBg: C.primaryTint,
    avatarBorder: C.primaryBorder,
    menuBtnBg: C.surface,
    menuBtnBorder: C.border,
    divider: C.borderSoft,
  },
  dark: {
    shellTop: C.surface,
    shellBottom: '#F8FAFC',
    glowPrimary: C.glowBlue,
    glowSecondary: C.glowSoft,
    cardBg: C.surface,
    cardBorder: C.border,
    statBg: C.surfaceMuted,
    statBorder: C.border,
    text: C.text,
    textMuted: C.textSecondary,
    accent: C.primary,
    accentSoft: C.primarySoft,
    avatarBg: C.primaryTint,
    avatarBorder: C.primaryBorder,
    menuBtnBg: C.surface,
    menuBtnBorder: C.border,
    divider: C.borderSoft,
  },
} as const;

export function getProfilePremium(_scheme: 'light' | 'dark') {
  return PROFILE_PREMIUM.light;
}

export function getProfilePageBackground(scheme: 'light' | 'dark') {
  return getServicesPageBackground(scheme);
}

export const SERVICES_TINT = {
  trustBg: C.primaryTint,
  trustBorder: C.primaryBorder,
  iconBg: C.primaryTint,
  activeBg: C.primaryTint,
  clearBg: C.primaryTint,
  glowTop: C.glowBlue,
  glowSide: C.glowSoft,
  locationBg: 'rgba(217,119,6,0.10)',
};
