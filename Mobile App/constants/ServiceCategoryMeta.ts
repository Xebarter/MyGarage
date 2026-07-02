import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { ServiceCategory } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ServiceCategoryMeta = {
  icon: IoniconName;
  shortDescription: string;
};

export const SERVICE_CATEGORY_META: Record<ServiceCategory['id'], ServiceCategoryMeta> = {
  'emergency-help': {
    icon: 'warning',
    shortDescription: '24/7 roadside assistance and towing',
  },
  'fix-my-car': {
    icon: 'construct',
    shortDescription: 'Diagnose and repair mechanical problems',
  },
  'service-my-car': {
    icon: 'settings',
    shortDescription: 'Oil changes, inspections, and servicing',
  },
  'tyres-battery': {
    icon: 'battery-charging',
    shortDescription: 'Tyre replacement, punctures, and batteries',
  },
  'car-wash-cleaning': {
    icon: 'water',
    shortDescription: 'Exterior wash, interior clean, and detailing',
  },
  'body-repair-painting': {
    icon: 'color-wand',
    shortDescription: 'Dents, scratches, and accident body work',
  },
  'ac-cooling': {
    icon: 'snow',
    shortDescription: 'AC repair, gas refill, and cooling issues',
  },
  'security-tracking': {
    icon: 'shield-checkmark',
    shortDescription: 'Trackers, alarms, and anti-theft systems',
  },
  'documents-insurance': {
    icon: 'document-text',
    shortDescription: 'Insurance, licensing, and ownership help',
  },
  'drivers-transport': {
    icon: 'people',
    shortDescription: 'Hire a driver or chauffeur services',
  },
  'fuel-delivery': {
    icon: 'flash',
    shortDescription: 'Fuel, oil, and battery delivery to you',
  },
  'rent-buy-car': {
    icon: 'car-sport',
    shortDescription: 'Rent, buy, or sell a vehicle',
  },
  'upgrade-my-car': {
    icon: 'star',
    shortDescription: 'Audio, tinting, wraps, and custom upgrades',
  },
};

export const QUICK_SERVICE_ACTIONS: {
  categoryId: ServiceCategory['id'];
  title: string;
  subtitle: string;
  icon: IoniconName;
}[] = [
  { categoryId: 'emergency-help', title: 'Emergency', subtitle: 'Get help now', icon: 'warning' },
  { categoryId: 'fix-my-car', title: 'Repair', subtitle: 'Fix my car', icon: 'construct' },
  { categoryId: 'tyres-battery', title: 'Battery & Tyres', subtitle: 'Common issues', icon: 'battery-charging' },
  { categoryId: 'fuel-delivery', title: 'Fuel', subtitle: 'Delivery help', icon: 'flash' },
];

export function getServiceCategoryMeta(categoryId: string): ServiceCategoryMeta {
  return (
    SERVICE_CATEGORY_META[categoryId as ServiceCategory['id']] ?? {
      icon: 'car',
      shortDescription: 'Browse available services',
    }
  );
}
