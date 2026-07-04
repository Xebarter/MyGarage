import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import type { AddressSuggestion } from '@/lib/api';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const POI_TYPES = new Set([
  'establishment',
  'point_of_interest',
  'store',
  'shopping_mall',
  'restaurant',
  'hospital',
  'school',
  'gas_station',
  'lodging',
]);

const STREET_TYPES = new Set(['route', 'street_address', 'premise', 'subpremise', 'intersection']);

export function getAddressSuggestionIcon(types?: string[]): IoniconName {
  if (!types?.length) return 'location-outline';
  if (types.some((type) => POI_TYPES.has(type))) return 'business-outline';
  if (types.some((type) => STREET_TYPES.has(type))) return 'navigate-outline';
  return 'location-outline';
}

export function canResolveSuggestion(item: AddressSuggestion): boolean {
  return Boolean(item.placeId || (item.lat != null && item.lng != null));
}
