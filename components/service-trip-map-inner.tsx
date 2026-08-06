'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import {
  ROUTE_CASING_COLOR,
  ROUTE_CORE_COLOR,
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

const MAP_LIBRARIES: ('places')[] = [];

const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  { elementType: 'geometry', stylers: [{ color: '#f4f6f9' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e8eef7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
];

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
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim() ||
    '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'mygarage-google-maps',
    googleMapsApiKey: apiKey || 'missing',
    libraries: MAP_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [geocodedDest, setGeocodedDest] = useState<TripMapPoint | null>(null);
  const [routePath, setRoutePath] = useState<TripMapPoint[]>([]);
  const [smoothProvider, setSmoothProvider] = useState<TripMapPoint | null>(provider);
  const animRef = useRef<number | null>(null);
  const lastProviderRef = useRef<TripMapPoint | null>(provider);
  const lastRouteFetchRef = useRef<string>('');

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

  // Smooth provider marker between position updates
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

  const isSearching =
    mode === 'searching' ||
    (mode === 'auto' && Boolean(resolvedDestination) && !provider);

  useEffect(() => {
    if (!provider || !resolvedDestination || isSearching) {
      setRoutePath([]);
      onRouteMeta?.(null);
      return;
    }

    const key = `${provider.lat.toFixed(4)},${provider.lng.toFixed(4)}|${resolvedDestination.lat.toFixed(4)},${resolvedDestination.lng.toFixed(4)}`;
    // Skip tiny provider jiggles; re-route every ~40m class change via fixed precision
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

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof google === 'undefined') return;
    const bounds = new google.maps.LatLngBounds();
    let has = false;
    if (smoothProvider) {
      bounds.extend(smoothProvider);
      has = true;
    }
    if (resolvedDestination) {
      bounds.extend(resolvedDestination);
      has = true;
    }
    if (!has) return;
    if (smoothProvider && resolvedDestination) {
      map.fitBounds(bounds, 64);
    } else {
      map.panTo(center);
      map.setZoom(isSearching ? 16 : 15);
    }
  }, [smoothProvider, resolvedDestination, center, isSearching]);

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

  if (!apiKey) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-4 text-center text-sm text-muted-foreground',
          className,
        )}
        style={{ minHeight }}
      >
        <p className="font-medium text-foreground">Google Maps key missing</p>
        <p>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live trip map.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-sm text-muted-foreground',
          className,
        )}
        style={{ minHeight }}
      >
        Could not load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className={cn('w-full animate-pulse rounded-2xl bg-muted/40', className)} style={{ minHeight }} />;
  }

  const pathLatLng = routePath.map((p) => ({ lat: p.lat, lng: p.lng }));

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)} style={{ minHeight }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-16 bg-gradient-to-b from-background/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-20 bg-gradient-to-t from-background/90 to-transparent"
        aria-hidden
      />

      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', minHeight }}
        center={center}
        zoom={isSearching ? 16 : 14}
        onLoad={onLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          styles: LIGHT_STYLE,
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {pathLatLng.length > 1 && !isSearching ? (
          <>
            <PolylineF
              path={pathLatLng}
              options={{
                strokeColor: ROUTE_CASING_COLOR,
                strokeOpacity: 1,
                strokeWeight: 10,
                zIndex: 1,
              }}
            />
            <PolylineF
              path={pathLatLng}
              options={{
                strokeColor: ROUTE_CORE_COLOR,
                strokeOpacity: 1,
                strokeWeight: 5,
                zIndex: 2,
              }}
            />
          </>
        ) : null}

        {resolvedDestination ? (
          <MarkerF
            position={resolvedDestination}
            title={destinationLabel}
            zIndex={isSearching ? 1000 : 800}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSearching ? 14 : 11,
              fillColor: isSearching ? '#2563EB' : '#0F172A',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            }}
          />
        ) : null}

        {smoothProvider && !isSearching ? (
          <MarkerF
            position={smoothProvider}
            title={providerLabel}
            zIndex={900}
            icon={{
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#2563EB',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
              rotation: 0,
            }}
          />
        ) : null}
      </GoogleMap>

      {isSearching ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[3] flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
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
