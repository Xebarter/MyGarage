import { getGoogleMapsApiKey } from '@/lib/geocode/address-suggestions';
import { buildCurvedRouteCoordinates, type MapPoint } from '@/lib/maps/ride-map-utils';

export type DirectionsResult = {
  path: MapPoint[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  source: 'google' | 'osrm' | 'curved';
};

type GoogleDirectionsResponse = {
  status?: string;
  routes?: Array<{
    overview_polyline?: { points?: string };
    legs?: Array<{
      distance?: { value?: number };
      duration?: { value?: number };
    }>;
  }>;
};

/** Decode Google encoded polyline into lat/lng points. */
export function decodeGooglePolyline(encoded: string): MapPoint[] {
  const points: MapPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function haversineMeters(a: MapPoint, b: MapPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchOsrmDirections(from: MapPoint, to: MapPoint): Promise<DirectionsResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };
    const route = json.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (json.code !== 'Ok' || !coords?.length) return null;
    return {
      path: coords.map(([lng, lat]) => ({ lat, lng })),
      distanceMeters: typeof route.distance === 'number' ? Math.round(route.distance) : null,
      durationSeconds: typeof route.duration === 'number' ? Math.round(route.duration) : null,
      source: 'osrm',
    };
  } catch {
    return null;
  }
}

function curvedFallback(from: MapPoint, to: MapPoint): DirectionsResult {
  const meters = haversineMeters(from, to);
  return {
    path: buildCurvedRouteCoordinates(from, to, 48),
    distanceMeters: Math.round(meters),
    durationSeconds: Math.round((meters / 1000 / 25) * 3600),
    source: 'curved',
  };
}

export async function fetchGoogleDirections(
  from: MapPoint,
  to: MapPoint,
): Promise<DirectionsResult> {
  const key = getGoogleMapsApiKey();
  if (!key) {
    return (await fetchOsrmDirections(from, to)) ?? curvedFallback(from, to);
  }

  const params = new URLSearchParams({
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    mode: 'driving',
    key,
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) throw new Error(`Directions HTTP ${res.status}`);
    const json = (await res.json()) as GoogleDirectionsResponse;
    const route = json.routes?.[0];
    const encoded = route?.overview_polyline?.points;
    if (json.status !== 'OK' || !encoded) throw new Error(json.status || 'NO_ROUTE');

    const path = decodeGooglePolyline(encoded);
    const leg = route?.legs?.[0];
    return {
      path: path.length > 1 ? path : [from, to],
      distanceMeters: leg?.distance?.value ?? Math.round(haversineMeters(from, to)),
      durationSeconds: leg?.duration?.value ?? null,
      source: 'google',
    };
  } catch {
    return (await fetchOsrmDirections(from, to)) ?? curvedFallback(from, to);
  }
}
