import type { ServicePriority } from '@/types';

export type PriorityPalette = {
  accent: string;
  accentMuted: string;
  onAccent: string;
  label: string;
};

const palettes: Record<ServicePriority, { light: PriorityPalette; dark: PriorityPalette }> = {
  urgent: {
    light: {
      accent: '#DC2626',
      accentMuted: '#FEE2E2',
      onAccent: '#FFFFFF',
      label: 'Urgent',
    },
    dark: {
      accent: '#F87171',
      accentMuted: '#450A0A',
      onAccent: '#1A2332',
      label: 'Urgent',
    },
  },
  common: {
    light: {
      accent: '#16A34A',
      accentMuted: '#DCFCE7',
      onAccent: '#FFFFFF',
      label: 'Common',
    },
    dark: {
      accent: '#4ADE80',
      accentMuted: '#14532D',
      onAccent: '#1A2332',
      label: 'Common',
    },
  },
  optional: {
    light: {
      accent: '#2563EB',
      accentMuted: '#DBEAFE',
      onAccent: '#FFFFFF',
      label: 'Optional',
    },
    dark: {
      accent: '#60A5FA',
      accentMuted: '#1E3A5F',
      onAccent: '#1A2332',
      label: 'Optional',
    },
  },
};

export function getPriorityPalette(
  priority: ServicePriority,
  scheme: 'light' | 'dark',
): PriorityPalette {
  return palettes[priority][scheme];
}

export const priorityLegend: { priority: ServicePriority; description: string }[] = [
  { priority: 'urgent', description: 'Immediate help' },
  { priority: 'common', description: 'Frequently needed' },
  { priority: 'optional', description: 'When you need it' },
];
