/**
 * Light professional services/profile chrome — cool gray canvas, white surfaces, blue accent.
 * Matches the Services Flutter app aesthetic.
 */
export const SERVICES_PREMIUM = {
  bg: '#F6F7F9',
  bgElevated: '#FFFFFF',
  bgGlass: '#FFFFFF',
  borderGlass: '#E2E6EE',
  borderGlow: 'rgba(37,99,235,0.28)',
  text: '#0F172A',
  textMuted: '#64748B',
  accent: '#2563EB',
  accentSoft: '#3B82F6',
  accentDeep: '#1D4ED8',
  copper: '#D97706',
};

/** Services tab header shell — soft white with ambient blue glow. */
export const SERVICES_HEADER = {
  shellTop: '#FFFFFF',
  shellBottom: '#F8FAFC',
  glowPrimary: 'rgba(191,219,254,0.55)',
  glowSecondary: 'rgba(37,99,235,0.08)',
  bgGlass: '#FFFFFF',
  borderGlass: '#E2E6EE',
};

export const SERVICES_SURFACE = {
  light: '#F6F7F9',
  dark: '#F6F7F9',
};

export function getServicesPageBackground(_scheme: 'light' | 'dark') {
  return SERVICES_SURFACE.light;
}

/** Profile header — same light family as Services. */
export const PROFILE_PREMIUM = {
  light: {
    shellTop: '#FFFFFF',
    shellBottom: '#F8FAFC',
    glowPrimary: 'rgba(191,219,254,0.55)',
    glowSecondary: 'rgba(37,99,235,0.08)',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E6EE',
    statBg: '#F6F7F9',
    statBorder: '#E2E6EE',
    text: '#0F172A',
    textMuted: '#64748B',
    accent: '#2563EB',
    accentSoft: '#3B82F6',
    avatarBg: 'rgba(37,99,235,0.1)',
    avatarBorder: 'rgba(37,99,235,0.28)',
    menuBtnBg: '#FFFFFF',
    menuBtnBorder: '#E2E6EE',
    divider: '#EBEEF4',
  },
  dark: {
    shellTop: '#FFFFFF',
    shellBottom: '#F8FAFC',
    glowPrimary: 'rgba(191,219,254,0.55)',
    glowSecondary: 'rgba(37,99,235,0.08)',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E6EE',
    statBg: '#F6F7F9',
    statBorder: '#E2E6EE',
    text: '#0F172A',
    textMuted: '#64748B',
    accent: '#2563EB',
    accentSoft: '#3B82F6',
    avatarBg: 'rgba(37,99,235,0.1)',
    avatarBorder: 'rgba(37,99,235,0.28)',
    menuBtnBg: '#FFFFFF',
    menuBtnBorder: '#E2E6EE',
    divider: '#EBEEF4',
  },
} as const;

export function getProfilePremium(_scheme: 'light' | 'dark') {
  return PROFILE_PREMIUM.light;
}

export function getProfilePageBackground(scheme: 'light' | 'dark') {
  return getServicesPageBackground(scheme);
}

export const SERVICES_TINT = {
  trustBg: 'rgba(37,99,235,0.08)',
  trustBorder: 'rgba(37,99,235,0.16)',
  iconBg: 'rgba(37,99,235,0.1)',
  activeBg: 'rgba(37,99,235,0.1)',
  clearBg: 'rgba(37,99,235,0.08)',
  glowTop: 'rgba(191,219,254,0.45)',
  glowSide: 'rgba(37,99,235,0.08)',
  locationBg: 'rgba(217,119,6,0.1)',
};
