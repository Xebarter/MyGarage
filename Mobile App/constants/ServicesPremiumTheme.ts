/** Premium services palette — teal/forest, distinct from shop navy/blue. */
export const SERVICES_PREMIUM = {
  bg: '#0C1816',
  bgElevated: '#132822',
  bgGlass: 'rgba(255,255,255,0.08)',
  borderGlass: 'rgba(255,255,255,0.14)',
  borderGlow: 'rgba(20,184,166,0.42)',
  text: '#ECFDF8',
  textMuted: '#9CB5AC',
  accent: '#14B8A6',
  accentSoft: '#5EEAD4',
  accentDeep: '#0F766E',
  copper: '#E8A838',
};

/** Services tab header shell — lifted above flat SERVICES_PREMIUM.bg, still darker than profile. */
export const SERVICES_HEADER = {
  shellTop: '#121F1C',
  shellBottom: '#1A322C',
  glowPrimary: 'rgba(20,184,166,0.18)',
  glowSecondary: 'rgba(94,234,212,0.09)',
  bgGlass: 'rgba(255,255,255,0.08)',
  borderGlass: 'rgba(255,255,255,0.14)',
};

export const SERVICES_SURFACE = {
  light: '#EFFAF6',
  dark: '#0A1210',
};

export function getServicesPageBackground(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? SERVICES_SURFACE.dark : SERVICES_SURFACE.light;
}

/** Profile header — same premium family as Services, lifted one step lighter. */
export const PROFILE_PREMIUM = {
  light: {
    shellTop: '#172A26',
    shellBottom: '#1F3833',
    glowPrimary: 'rgba(20,184,166,0.24)',
    glowSecondary: 'rgba(94,234,212,0.14)',
    cardBg: 'rgba(255,255,255,0.1)',
    cardBorder: 'rgba(255,255,255,0.16)',
    statBg: 'rgba(255,255,255,0.09)',
    statBorder: 'rgba(255,255,255,0.14)',
    text: '#F0FDF9',
    textMuted: '#A8C0B8',
    accent: '#14B8A6',
    accentSoft: '#5EEAD4',
    avatarBg: 'rgba(20,184,166,0.24)',
    avatarBorder: 'rgba(20,184,166,0.48)',
    menuBtnBg: 'rgba(255,255,255,0.1)',
    menuBtnBorder: 'rgba(255,255,255,0.16)',
    divider: 'rgba(255,255,255,0.1)',
  },
  dark: {
    shellTop: '#142622',
    shellBottom: '#1A2F2A',
    glowPrimary: 'rgba(20,184,166,0.26)',
    glowSecondary: 'rgba(52,211,153,0.13)',
    cardBg: 'rgba(255,255,255,0.09)',
    cardBorder: 'rgba(255,255,255,0.14)',
    statBg: 'rgba(255,255,255,0.08)',
    statBorder: 'rgba(255,255,255,0.12)',
    text: '#F0FDF9',
    textMuted: '#9DB8AF',
    accent: '#2DD4BF',
    accentSoft: '#5EEAD4',
    avatarBg: 'rgba(20,184,166,0.26)',
    avatarBorder: 'rgba(20,184,166,0.5)',
    menuBtnBg: 'rgba(255,255,255,0.09)',
    menuBtnBorder: 'rgba(255,255,255,0.14)',
    divider: 'rgba(255,255,255,0.08)',
  },
} as const;

export function getProfilePremium(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? PROFILE_PREMIUM.dark : PROFILE_PREMIUM.light;
}

export function getProfilePageBackground(scheme: 'light' | 'dark') {
  return getServicesPageBackground(scheme);
}

export const SERVICES_TINT = {
  trustBg: 'rgba(20,184,166,0.12)',
  trustBorder: 'rgba(20,184,166,0.22)',
  iconBg: 'rgba(20,184,166,0.16)',
  activeBg: 'rgba(20,184,166,0.14)',
  clearBg: 'rgba(20,184,166,0.12)',
  glowTop: 'rgba(20,184,166,0.17)',
  glowSide: 'rgba(52,211,153,0.11)',
  locationBg: 'rgba(232,168,56,0.14)',
};
