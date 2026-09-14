export type MapPoint = { lat: number; lng: number };

export const ROUTE_CORE_COLOR = '#1E4ED8';
export const ROUTE_CASING_COLOR = '#FFFFFF';
export const ROUTE_SHADOW_COLOR = 'rgba(15, 23, 42, 0.22)';
export const PICKUP_PIN_COLOR = '#0F172A';
export const PROVIDER_PIN_COLOR = '#1E4ED8';

export function buildCurvedRouteCoordinates(from: MapPoint, to: MapPoint, segments = 42): MapPoint[] {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng) || 0.001;
  const curveStrength = Math.min(0.28, dist * 0.35);
  const control = {
    lat: midLat + (-dLng / dist) * curveStrength,
    lng: midLng + (dLat / dist) * curveStrength,
  };

  const coords: MapPoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const inv = 1 - t;
    coords.push({
      lat: inv * inv * from.lat + 2 * inv * t * control.lat + t * t * to.lat,
      lng: inv * inv * from.lng + 2 * inv * t * control.lng + t * t * to.lng,
    });
  }
  return coords;
}

export function toLatLngTuple(point: MapPoint): [number, number] {
  return [point.lat, point.lng];
}
