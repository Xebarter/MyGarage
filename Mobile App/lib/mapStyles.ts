import type { ColorSchemeName } from 'react-native';

/** Clean, muted map skin similar to Uber / ride-hailing apps. */
export const RIDE_MAP_LIGHT_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f3f4f6' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f9fafb' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d1d5db' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fde68a' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#fcd34d' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7e3f8' }] },
];

export const RIDE_MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1c2333' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3748' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f2744' }] },
];

export function getRideMapStyle(scheme: ColorSchemeName | null | undefined) {
  return scheme === 'dark' ? RIDE_MAP_DARK_STYLE : RIDE_MAP_LIGHT_STYLE;
}

export const ROUTE_CORE_COLOR = '#2563EB';
export const ROUTE_CASING_COLOR = '#FFFFFF';
export const ROUTE_SHADOW_COLOR = 'rgba(15, 23, 42, 0.22)';
export const PICKUP_PIN_COLOR = '#111827';
export const PROVIDER_PIN_COLOR = '#2563EB';
