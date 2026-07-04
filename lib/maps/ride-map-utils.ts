export type MapPoint = { lat: number; lng: number };

export const ROUTE_CORE_COLOR = '#2563EB';
export const ROUTE_CASING_COLOR = '#FFFFFF';
export const ROUTE_SHADOW_COLOR = 'rgba(15, 23, 42, 0.22)';
export const PICKUP_PIN_COLOR = '#111827';
export const PROVIDER_PIN_COLOR = '#2563EB';

export function getRideTileUrl(dark: boolean): string {
  return dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
}

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

export function pickupMarkerHtml(color = PICKUP_PIN_COLOR): string {
  return `<div class="ride-pin-wrap" aria-hidden="true">
    <div class="ride-pin-pulse" style="border-color:${color}"></div>
    <div class="ride-pin-head" style="background:${color}">
      <div class="ride-pin-inner">●</div>
    </div>
    <div class="ride-pin-stem" style="background:${color}"></div>
    <div class="ride-pin-dot" style="background:${color}"></div>
  </div>`;
}

export function providerMarkerHtml(color = PROVIDER_PIN_COLOR): string {
  return `<div class="ride-provider-wrap" aria-hidden="true">
    <div class="ride-provider-halo" style="border-color:${color}66;background:${color}1a"></div>
    <div class="ride-provider-badge">
      <div class="ride-provider-icon" style="background:${color}">🚗</div>
    </div>
  </div>`;
}

export function radarMarkerHtml(color = PROVIDER_PIN_COLOR): string {
  return `<div class="ride-radar-wrap" aria-hidden="true">
    <div class="ride-radar-ring" style="border-color:${color}"></div>
    <div class="ride-radar-ring ride-radar-delay" style="border-color:${color}"></div>
    ${pickupMarkerHtml(color)}
  </div>`;
}

export const RIDE_MAP_LEAFLET_CSS = `
.ride-map-marker-icon { background: transparent !important; border: none !important; }
.ride-pin-wrap { position: relative; width: 48px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.ride-pin-pulse { position: absolute; bottom: 0; width: 52px; height: 52px; border-radius: 50%; border: 2px solid; background: rgba(37,99,235,.1); animation: ridePinPulse 1.8s ease-out infinite; }
.ride-pin-head { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 14px rgba(15,23,42,.28); display: flex; align-items: center; justify-content: center; z-index: 2; }
.ride-pin-inner { width: 22px; height: 22px; border-radius: 50%; background: #fff; color: #111827; font-size: 11px; line-height: 22px; text-align: center; }
.ride-pin-stem { width: 3px; height: 12px; margin-top: -1px; border-radius: 2px; z-index: 2; }
.ride-pin-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: -1px; border: 2px solid #fff; z-index: 2; }
.ride-provider-wrap { position: relative; width: 54px; height: 54px; }
.ride-provider-halo { position: absolute; inset: 0; border-radius: 50%; border: 2px solid; animation: rideHalo 2.2s ease-in-out infinite; }
.ride-provider-badge { position: absolute; inset: 6px; border-radius: 50%; background: #fff; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,.22); display: flex; align-items: center; justify-content: center; }
.ride-provider-icon { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.ride-radar-wrap { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; }
.ride-radar-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid rgba(37,99,235,.55); background: rgba(37,99,235,.1); animation: rideRadar 2.2s ease-out infinite; }
.ride-radar-delay { animation-delay: 1.1s; }
.ride-radar-wrap .ride-pin-wrap { transform: scale(0.92); }
@keyframes ridePinPulse { 0% { transform: scale(0.55); opacity: 0.45; } 100% { transform: scale(1.35); opacity: 0; } }
@keyframes rideHalo { 0%, 100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.18); opacity: 0.12; } }
@keyframes rideRadar { 0% { transform: scale(0.35); opacity: 0.5; } 100% { transform: scale(1); opacity: 0; } }
`;
