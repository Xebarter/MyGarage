import type { Href } from 'expo-router';

export type ProfileMenuItem = {
  id: string;
  label: string;
  description: string;
  icon:
    | 'person-outline'
    | 'notifications-outline'
    | 'card-outline'
    | 'ribbon-outline'
    | 'car-sport-outline'
    | 'document-text-outline'
    | 'construct-outline'
    | 'stats-chart-outline'
    | 'settings-outline';
  navigateTo?: Href;
};

/** Account, billing, and app preferences — opened from Settings routes. */
export const SETTINGS_SECTIONS: Array<{ group: string; items: ProfileMenuItem[] }> = [
  {
    group: 'Account',
    items: [
      { id: 'account', label: 'Account', description: 'Profile, security & verification', icon: 'person-outline' },
      { id: 'notifications', label: 'Alerts', description: 'Notifications & preferences', icon: 'notifications-outline' },
    ],
  },
  {
    group: 'Billing',
    items: [
      { id: 'billing', label: 'Billing', description: 'Payments & history', icon: 'card-outline' },
      { id: 'membership', label: 'Plans', description: 'Membership & subscriptions', icon: 'ribbon-outline' },
    ],
  },
  {
    group: 'App',
    items: [
      { id: 'settings', label: 'App settings', description: 'Units, language & theme', icon: 'settings-outline' },
    ],
  },
];

/** Garage & activity sections — opened from Profile hub section routes. */
export const PROFILE_HUB_SECTIONS: Array<{ group: string; items: ProfileMenuItem[] }> = [
  {
    group: 'Garage',
    items: [
      { id: 'documents', label: 'Documents', description: 'Insurance, logbook & records', icon: 'document-text-outline' },
      { id: 'services', label: 'Services', description: 'Requests & provider messages', icon: 'construct-outline' },
      { id: 'insights', label: 'Insights', description: 'Spend & vehicle health', icon: 'stats-chart-outline' },
    ],
  },
];

/** Full menu shown on the profile tab (settings rows + hub rows). */
export const PROFILE_MENU_SECTIONS: Array<{ group: string; items: ProfileMenuItem[] }> = [
  ...SETTINGS_SECTIONS,
  ...PROFILE_HUB_SECTIONS,
];

export type SettingsSectionId = 'account' | 'notifications' | 'billing' | 'membership' | 'settings';

export type ProfileHubSectionId = 'documents' | 'services' | 'insights';

export type ProfileInlineSectionId = SettingsSectionId | ProfileHubSectionId | 'vehicles';

export type ProfileSectionId = ProfileInlineSectionId;

const SETTINGS_IDS = new Set<string>(['account', 'notifications', 'billing', 'membership', 'settings']);
const HUB_IDS = new Set<string>(['documents', 'services', 'insights']);

export function isSettingsSection(id: string): id is SettingsSectionId {
  return SETTINGS_IDS.has(id);
}

export function isProfileHubSection(id: string): id is ProfileHubSectionId {
  return HUB_IDS.has(id);
}

export function isInlineProfileSection(id: ProfileSectionId): id is ProfileInlineSectionId {
  return SETTINGS_IDS.has(id) || HUB_IDS.has(id) || id === 'vehicles';
}

export function getProfileSection(id: ProfileSectionId): ProfileMenuItem {
  for (const group of PROFILE_MENU_SECTIONS) {
    const item = group.items.find((entry) => entry.id === id);
    if (item) return item;
  }
  return SETTINGS_SECTIONS[0].items[0];
}

export const PROFILE_SECTION_LIST = PROFILE_MENU_SECTIONS.flatMap((group) => group.items);

/** @deprecated use PROFILE_MENU_SECTIONS */
export const PROFILE_SECTIONS = PROFILE_MENU_SECTIONS;
