import type { BuyerServiceRequestDetail, ServiceRequestUiPhase } from '@/types';

export type GeoPoint = { lat: number; lng: number };

export type ServiceRequestPhaseOptions = {
  providerDistanceKm?: number | null;
};

const NEARBY_KM = 0.5;
const SERVICE_STARTED_MS = 90_000;
const PREPARING_MAX_MS = 120_000;

export function getServiceRequestUiPhase(
  request: BuyerServiceRequestDetail,
  options: ServiceRequestPhaseOptions = {},
): ServiceRequestUiPhase {
  if (request.status === 'cancelled') return 'cancelled';
  if (request.status === 'completed' || request.completedAt) return 'completed';

  if (request.startedAt) {
    const startedMs = new Date(request.startedAt).getTime();
    if (!Number.isNaN(startedMs) && Date.now() - startedMs < SERVICE_STARTED_MS) {
      return 'service_started';
    }
    return 'service_in_progress';
  }

  if (request.arrivedAt) return 'arrived';

  const matched = Boolean(request.acceptedAt || request.providerId || request.status === 'matched');
  if (!matched) return 'searching';

  const hasProviderCoords = isValidPoint({
    lat: request.providerLat ?? null,
    lng: request.providerLng ?? null,
  });

  const distanceKm = options.providerDistanceKm ?? null;

  if (hasProviderCoords && distanceKm != null) {
    if (distanceKm <= NEARBY_KM) return 'nearby';
    return 'en_route';
  }

  if (request.acceptedAt) {
    const acceptedMs = new Date(request.acceptedAt).getTime();
    if (!Number.isNaN(acceptedMs) && Date.now() - acceptedMs < PREPARING_MAX_MS && !hasProviderCoords) {
      return 'preparing_to_depart';
    }
    return 'provider_accepted';
  }

  return 'provider_found';
}

export function isTrackingPhase(phase: ServiceRequestUiPhase): boolean {
  return phase !== 'searching' && phase !== 'completed' && phase !== 'cancelled';
}

export function canCancelServiceRequest(phase: ServiceRequestUiPhase): boolean {
  return phase === 'searching' || phase === 'provider_found' || phase === 'provider_accepted' || phase === 'preparing_to_depart';
}

export const SEARCH_STATUS_MESSAGES = [
  'Locating nearby providers...',
  'Checking provider availability...',
  'Comparing response times...',
  'Finding the closest expert...',
  'Contacting nearby providers...',
  'Almost done...',
] as const;

export function phaseHeadline(phase: ServiceRequestUiPhase): string {
  switch (phase) {
    case 'searching':
      return 'Finding a provider';
    case 'provider_found':
      return 'Provider found';
    case 'provider_accepted':
      return 'Provider accepted';
    case 'preparing_to_depart':
      return 'Preparing to depart';
    case 'en_route':
      return 'En route to you';
    case 'nearby':
      return 'Provider nearby';
    case 'arrived':
      return 'Provider arrived';
    case 'service_started':
      return 'Service started';
    case 'service_in_progress':
      return 'Service in progress';
    case 'completed':
      return 'Service completed';
    case 'cancelled':
      return 'Request cancelled';
    default:
      return 'Live tracking';
  }
}

export function phaseDescription(phase: ServiceRequestUiPhase): string {
  switch (phase) {
    case 'searching':
      return 'Matching you with nearby verified professionals.';
    case 'provider_found':
      return 'A provider is reviewing your request.';
    case 'provider_accepted':
      return 'Your provider confirmed the job.';
    case 'preparing_to_depart':
      return 'Your provider is getting ready to head your way.';
    case 'en_route':
      return 'Your provider is traveling to your location.';
    case 'nearby':
      return 'Your provider is almost at your location.';
    case 'arrived':
      return 'Your provider has arrived on site.';
    case 'service_started':
      return 'Work has just begun at your location.';
    case 'service_in_progress':
      return 'Your service is underway.';
    case 'completed':
      return 'Your service has been completed.';
    case 'cancelled':
      return 'This request is no longer active.';
    default:
      return 'Live updates are enabled.';
  }
}

export function estimateDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateEtaMinutes(distanceKm: number): number {
  const speedKmH = 28;
  return Math.max(3, Math.round((distanceKm / speedKmH) * 60));
}

export function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.max(50, Math.round(distanceKm * 1000))} m`;
  return `${distanceKm.toFixed(1)} km`;
}

export function isValidPoint(point: { lat: number | null; lng: number | null } | null): point is GeoPoint {
  if (!point) return false;
  return (
    point.lat != null &&
    point.lng != null &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  );
}

/** Interpolate points along a route for a smoother polyline. */
export function buildRouteCoordinates(from: GeoPoint, to: GeoPoint, segments = 24): GeoPoint[] {
  return buildCurvedRouteCoordinates(from, to, segments);
}

/** Curved route (quadratic bezier) for a more natural map path. */
export function buildCurvedRouteCoordinates(from: GeoPoint, to: GeoPoint, segments = 32): GeoPoint[] {
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

  const coords: GeoPoint[] = [];
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
