'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ROUTE_CASING_COLOR,
  ROUTE_CORE_COLOR,
  RIDE_MAP_LEAFLET_CSS,
  getRideTileUrl,
  pickupMarkerHtml,
  providerMarkerHtml,
  type MapPoint,
} from '@/lib/maps/ride-map-utils';
import { cn } from '@/lib/utils';

export type TripMapPoint = MapPoint;

export type ServiceTripMapInnerProps = {
  destination: TripMapPoint | null;
  provider: TripMapPoint | null;
  className?: string;
  providerLabel?: string;
  destinationLabel?: string;
  destinationAddress?: string;
  mode?: 'tracking' | 'searching' | 'auto';
  minHeight?: string;
  onRouteMeta?: (meta: {
    distanceMeters: number | null;
    durationSeconds: number | null;
    etaMinutes: number | null;
  } | null) => void;
};

function bearingDegrees(from: MapPoint, to: MapPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversine(a: MapPoint, b: MapPoint): number {
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

function interpolate(a: MapPoint, b: MapPoint, t: number): MapPoint {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

function destinationIcon(searching: boolean) {
  return L.divIcon({
    className: 'ride-map-marker-icon',
    html: pickupMarkerHtml(searching ? '#1E4ED8' : '#0F172A'),
    iconSize: [48, 64],
    iconAnchor: [24, 62],
  });
}

function vehicleIcon(heading: number) {
  return L.divIcon({
    className: 'ride-map-marker-icon',
    html: `<div style="transform:rotate(${heading}deg);transform-origin:center center">${providerMarkerHtml()}</div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
}

function DragGuard({ onDrag }: { onDrag: () => void }) {
  useMapEvents({
    dragstart: onDrag,
  });
  return null;
}

function FitTripView({
  destination,
  provider,
  searching,
  userDragged,
}: {
  destination: TripMapPoint | null;
  provider: TripMapPoint | null;
  searching: boolean;
  userDragged: boolean;
}) {
  const map = useMap();
  const fittedKeyRef = useRef('');
  const wasSearchingRef = useRef(searching);

  useEffect(() => {
    if (searching !== wasSearchingRef.current) {
      fittedKeyRef.current = '';
      wasSearchingRef.current = searching;
    }
    if (userDragged) return;

    const fitKey = [
      provider && !searching ? `${provider.lat.toFixed(3)},${provider.lng.toFixed(3)}` : '',
      destination ? `${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}` : '',
      searching ? 'search' : 'track',
    ].join('|');
    if (fittedKeyRef.current === fitKey) return;
    fittedKeyRef.current = fitKey;

    if (provider && destination && !searching) {
      const bounds = L.latLngBounds(
        [provider.lat, provider.lng],
        [destination.lat, destination.lng],
      );
      map.fitBounds(bounds, { padding: [72, 48], maxZoom: 16, animate: true });
      return;
    }

    const focus = provider && !searching ? provider : destination;
    if (focus) {
      map.setView([focus.lat, focus.lng], searching ? 16 : 15, { animate: true });
    }
  }, [map, destination, provider, searching, userDragged]);

  return null;
}

export function ServiceTripMapInner({
  destination,
  provider,
  className,
  providerLabel = 'Provider',
  destinationLabel = 'Customer',
  destinationAddress,
  mode = 'auto',
  minHeight = 'min(48vh,420px)',
  onRouteMeta,
}: ServiceTripMapInnerProps) {
  const [geocodedDest, setGeocodedDest] = useState<TripMapPoint | null>(null);
  const [routePath, setRoutePath] = useState<TripMapPoint[]>([]);
  const [smoothProvider, setSmoothProvider] = useState<TripMapPoint | null>(provider);
  const [heading, setHeading] = useState(0);
  const [userDragged, setUserDragged] = useState(false);
  const animRef = useRef<number | null>(null);
  const lastProviderRef = useRef<TripMapPoint | null>(provider);
  const lastRouteFetchRef = useRef('');
  const lastSmoothRef = useRef<TripMapPoint | null>(null);

  const resolvedDestination = destination ?? geocodedDest;

  useEffect(() => {
    if (destination || !destinationAddress?.trim() || destinationAddress.trim().length < 3) {
      setGeocodedDest(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/geocode?q=${encodeURIComponent(destinationAddress.trim())}`)
      .then((res) => res.json())
      .then((json: { lat?: number | null; lng?: number | null }) => {
        if (cancelled || json.lat == null || json.lng == null) return;
        setGeocodedDest({ lat: json.lat, lng: json.lng });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [destination, destinationAddress]);

  useEffect(() => {
    if (!provider) {
      setSmoothProvider(null);
      lastProviderRef.current = null;
      return;
    }
    const from = lastProviderRef.current ?? provider;
    const to = provider;
    lastProviderRef.current = provider;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (haversine(from, to) < 2) {
      setSmoothProvider(to);
      return;
    }

    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 2;
      setSmoothProvider(interpolate(from, to, eased));
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [provider?.lat, provider?.lng]);

  useEffect(() => {
    if (!smoothProvider) {
      lastSmoothRef.current = null;
      return;
    }
    const prev = lastSmoothRef.current;
    if (prev && haversine(prev, smoothProvider) > 4) {
      setHeading(bearingDegrees(prev, smoothProvider));
    }
    lastSmoothRef.current = smoothProvider;
  }, [smoothProvider?.lat, smoothProvider?.lng]);

  const isSearching =
    mode === 'searching' ||
    (mode === 'auto' && Boolean(resolvedDestination) && !provider);

  useEffect(() => {
    setUserDragged(false);
  }, [isSearching]);

  useEffect(() => {
    if (!provider || !resolvedDestination || isSearching) {
      setRoutePath([]);
      onRouteMeta?.(null);
      return;
    }

    const key = `${provider.lat.toFixed(4)},${provider.lng.toFixed(4)}|${resolvedDestination.lat.toFixed(4)},${resolvedDestination.lng.toFixed(4)}`;
    if (key === lastRouteFetchRef.current) return;
    lastRouteFetchRef.current = key;

    let cancelled = false;
    const qs = new URLSearchParams({
      originLat: String(provider.lat),
      originLng: String(provider.lng),
      destLat: String(resolvedDestination.lat),
      destLng: String(resolvedDestination.lng),
    });

    void fetch(`/api/maps/directions?${qs}`)
      .then((res) => res.json())
      .then(
        (json: {
          path?: TripMapPoint[];
          distanceMeters?: number | null;
          durationSeconds?: number | null;
          etaMinutes?: number | null;
        }) => {
          if (cancelled) return;
          setRoutePath(Array.isArray(json.path) ? json.path : [provider, resolvedDestination]);
          onRouteMeta?.({
            distanceMeters: json.distanceMeters ?? null,
            durationSeconds: json.durationSeconds ?? null,
            etaMinutes: json.etaMinutes ?? null,
          });
        },
      )
      .catch(() => {
        if (cancelled) return;
        setRoutePath([provider, resolvedDestination]);
        onRouteMeta?.({
          distanceMeters: Math.round(haversine(provider, resolvedDestination)),
          durationSeconds: null,
          etaMinutes: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    provider?.lat,
    provider?.lng,
    resolvedDestination?.lat,
    resolvedDestination?.lng,
    isSearching,
    onRouteMeta,
  ]);

  const center = useMemo((): TripMapPoint => {
    if (smoothProvider) return smoothProvider;
    if (resolvedDestination) return resolvedDestination;
    return { lat: 0.3476, lng: 32.5825 };
  }, [smoothProvider, resolvedDestination]);

  const destMarker = useMemo(() => destinationIcon(isSearching), [isSearching]);
  const providerMarker = useMemo(() => vehicleIcon(heading), [heading]);

  if (!resolvedDestination && !provider) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-sm text-muted-foreground',
          className,
        )}
        style={{ minHeight }}
      >
        Map will appear when location is available.
      </div>
    );
  }

  const pathLatLng = routePath.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)} style={{ minHeight, height: minHeight }}>
      <style>{RIDE_MAP_LEAFLET_CSS}</style>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-16 bg-gradient-to-b from-background/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] h-20 bg-gradient-to-t from-background/90 to-transparent"
        aria-hidden
      />

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={isSearching ? 16 : 14}
        style={{ width: '100%', height: '100%', minHeight, background: '#f3f5f8' }}
        zoomControl={false}
        attributionControl
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={getRideTileUrl(false)}
          subdomains={['a', 'b', 'c', 'd']}
        />
        <ZoomControl position="bottomright" />
        <DragGuard onDrag={() => setUserDragged(true)} />
        <FitTripView
          destination={resolvedDestination}
          provider={smoothProvider}
          searching={isSearching}
          userDragged={userDragged}
        />

        {isSearching && resolvedDestination ? (
          <>
            <Circle
              center={[resolvedDestination.lat, resolvedDestination.lng]}
              radius={220}
              pathOptions={{
                fillColor: '#1E4ED8',
                fillOpacity: 0.07,
                color: '#1E4ED8',
                opacity: 0.22,
                weight: 1,
              }}
            />
            <Circle
              center={[resolvedDestination.lat, resolvedDestination.lng]}
              radius={90}
              pathOptions={{
                fillColor: '#1E4ED8',
                fillOpacity: 0.1,
                color: '#1E4ED8',
                opacity: 0.35,
                weight: 1,
              }}
            />
          </>
        ) : null}

        {pathLatLng.length > 1 && !isSearching ? (
          <>
            <Polyline positions={pathLatLng} pathOptions={{ color: ROUTE_CASING_COLOR, weight: 10, opacity: 1 }} />
            <Polyline positions={pathLatLng} pathOptions={{ color: ROUTE_CORE_COLOR, weight: 5, opacity: 1 }} />
          </>
        ) : null}

        {resolvedDestination ? (
          <Marker
            position={[resolvedDestination.lat, resolvedDestination.lng]}
            icon={destMarker}
            title={destinationLabel}
            zIndexOffset={isSearching ? 1000 : 800}
          />
        ) : null}

        {smoothProvider && !isSearching ? (
          <Marker
            position={[smoothProvider.lat, smoothProvider.lng]}
            icon={providerMarker}
            title={providerLabel}
            zIndexOffset={900}
          />
        ) : null}
      </MapContainer>

      {isSearching ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[401] flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Scanning for providers
        </div>
      ) : null}
    </div>
  );
}
