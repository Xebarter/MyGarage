import type * as Location from 'expo-location';

export function formatGeocodedAddress(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name,
    address.street,
    address.streetNumber,
    address.district || address.subregion,
    address.city || address.region,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  return [...new Set(parts)].join(', ');
}

export function formatGeocodedAddresses(addresses: Location.LocationGeocodedAddress[]): string {
  const first = addresses[0];
  if (!first) return '';
  return formatGeocodedAddress(first);
}
