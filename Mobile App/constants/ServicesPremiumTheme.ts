/** Premium services palette — teal/forest, distinct from shop navy/blue. */
export const SERVICES_PREMIUM = {
  bg: '#0C1816',
  bgElevated: '#132822',
  bgGlass: 'rgba(255,255,255,0.06)',
  borderGlass: 'rgba(255,255,255,0.11)',
  borderGlow: 'rgba(20,184,166,0.42)',
  text: '#ECFDF8',
  textMuted: '#8FA8A0',
  accent: '#14B8A6',
  accentSoft: '#5EEAD4',
  accentDeep: '#0F766E',
  copper: '#E8A838',
};

export const SERVICES_SURFACE = {
  light: '#EFFAF6',
  dark: '#0A1210',
};

export function getServicesPageBackground(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? SERVICES_SURFACE.dark : SERVICES_SURFACE.light;
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
