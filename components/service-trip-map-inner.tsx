'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CircleF, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import {
  PROVIDER_PIN_COLOR,
  ROUTE_CASING_COLOR,
  ROUTE_CORE_COLOR,
  type MapPoint,
} from '@/lib/maps/ride-map-utils';
import { PREMIUM_MAP_STYLE } from '@/lib/maps/premium-map-style';
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

const KAMPALA: TripMapPoint = { lat: 0.3476, lng: 32.5825 };

const MAP_CONTAINER_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  background: '#f3f5f8',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: PREMIUM_MAP_STYLE,
  backgroundColor: '#f3f5f8',
};

function getBrowserMapsApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() ||
    ''
  );
}

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

function svgIcon(svg: string, width: number, height: number, anchorX: number, anchorY: number): google.maps.Icon {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(anchorX, anchorY),
  };
}

function destinationIcon(searching: boolean): google.maps.Icon {
  const color = searching ? '#1E4ED8' : '#0F172A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" fill="none">
    <circle cx="18" cy="18" r="14" fill="${color}" stroke="#fff" stroke-width="3"/>
    <circle cx="18" cy="18" r="5" fill="#fff"/>
    <path d="M18 32v10" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="18" cy="44" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>
  </svg>`;
  return svgIcon(svg, 36, 48, 18, 44);
}

function vehicleIcon(heading: number): google.maps.Icon {
  const color = PROVIDER_PIN_COLOR;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">
    <g transform="rotate(${heading} 22 22)">
      <circle cx="22" cy="22" r="18" fill="${color}" stroke="#fff" stroke-width="3"/>
      <path d="M22 11l8 20-8-5-8 5 8-20z" fill="#fff"/>
    </g>
  </svg>`;
  return svgIcon(svg, 44, 44, 22, 22);
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
  const apiKey = getBrowserMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'mygarage-service-trip-map',
    googleMapsApiKey: apiKey,
  });

  const [geocodedDest, setGeocodedDest] = useState<TripMapPoint | null>(null);
  const [routePath, setRoutePath] = useState<TripMapPoint[]>([]);
  const [smoothProvider, setSmoothProvider] = useState<TripMapPoint | null>(provider);
  const [heading, setHeading] = useState(0);
  const [userDragged, setUserDragged] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const fittedKeyRef = useRef('');
  const wasSearchingRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const lastProviderRef = useRef<TripMapPoint | null>(provider);
  const lastRouteFetchRef = useRef('');
  const lastSmoothRef = useRef<TripMapPoint | null>(null);
  const dragListenerRef = useRef<google.maps.MapsEventListener | null>(null);

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
    if (smoothProvider && !isSearching) return smoothProvider;
    if (resolvedDestination) return resolvedDestination;
    if (smoothProvider) return smoothProvider;
    return KAMPALA;
  }, [smoothProvider, resolvedDestination, isSearching]);

  const destMarkerIcon = useMemo(
    () => (isLoaded ? destinationIcon(isSearching) : undefined),
    [isLoaded, isSearching],
  );
  const providerMarkerIcon = useMemo(
    () => (isLoaded ? vehicleIcon(heading) : undefined),
    [isLoaded, heading],
  );

  const pathLatLng = useMemo(
    () => routePath.map((p) => ({ lat: p.lat, lng: p.lng })),
    [routePath],
  );

  const fitCamera = useCallback(() => {
    const map = mapRef.current;
    if (!map || userDragged) return;

    if (isSearching !== wasSearchingRef.current) {
      fittedKeyRef.current = '';
      wasSearchingRef.current = isSearching;
    }

    const fitKey = [
      smoothProvider && !isSearching ? `${smoothProvider.lat.toFixed(3)},${smoothProvider.lng.toFixed(3)}` : '',
      resolvedDestination ? `${resolvedDestination.lat.toFixed(3)},${resolvedDestination.lng.toFixed(3)}` : '',
      isSearching ? 'search' : 'track',
    ].join('|');
    if (fittedKeyRef.current === fitKey) return;
    fittedKeyRef.current = fitKey;

    if (smoothProvider && resolvedDestination && !isSearching) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(smoothProvider);
      bounds.extend(resolvedDestination);
      map.fitBounds(bounds, { top: 72, right: 48, bottom: 72, left: 48 });
      return;
    }

    const focus = smoothProvider && !isSearching ? smoothProvider : resolvedDestination;
    if (focus) {
      map.panTo(focus);
      map.setZoom(isSearching ? 16 : 15);
    }
  }, [smoothProvider, resolvedDestination, isSearching, userDragged]);

  useEffect(() => {
    if (!isLoaded) return;
    fitCamera();
  }, [isLoaded, fitCamera]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      map.setOptions({
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
      });
      dragListenerRef.current?.remove();
      dragListenerRef.current = map.addListener('dragstart', () => setUserDragged(true));
      fitCamera();
    },
    [fitCamera],
  );

  useEffect(() => {
    return () => {
      dragListenerRef.current?.remove();
      dragListenerRef.current = null;
      mapRef.current = null;
    };
  }, []);

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
          'flex items-center justify-center rounded-2xl border border-border/60 bg-muted/30 px-4 text-center text-sm text-muted-foreground',
          className,
        )}
        style={{ minHeight }}
      >
        Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-border/60 bg-muted/30 px-4 text-center text-sm text-muted-foreground',
          className,
        )}
        style={{ minHeight }}
      >
        Google Maps failed to load. Check the API key and Maps JavaScript API.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className={cn('animate-pulse rounded-2xl bg-muted/40', className)}
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)} style={{ minHeight, height: minHeight }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-16 bg-gradient-to-b from-background/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 bg-gradient-to-t from-background/90 to-transparent"
        aria-hidden
      />

      <GoogleMap
        mapContainerStyle={{ ...MAP_CONTAINER_STYLE, minHeight }}
        center={center}
        zoom={isSearching ? 16 : 14}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
      >
        {isSearching && resolvedDestination ? (
          <>
            <CircleF
              center={resolvedDestination}
              radius={220}
              options={{
                fillColor: '#1E4ED8',
                fillOpacity: 0.07,
                strokeColor: '#1E4ED8',
                strokeOpacity: 0.22,
                strokeWeight: 1,
                clickable: false,
              }}
            />
            <CircleF
              center={resolvedDestination}
              radius={90}
              options={{
                fillColor: '#1E4ED8',
                fillOpacity: 0.1,
                strokeColor: '#1E4ED8',
                strokeOpacity: 0.35,
                strokeWeight: 1,
                clickable: false,
              }}
            />
          </>
        ) : null}

        {pathLatLng.length > 1 && !isSearching ? (
          <>
            <PolylineF
              path={pathLatLng}
              options={{
                strokeColor: ROUTE_CASING_COLOR,
                strokeOpacity: 1,
                strokeWeight: 10,
                clickable: false,
                zIndex: 1,
              }}
            />
            <PolylineF
              path={pathLatLng}
              options={{
                strokeColor: ROUTE_CORE_COLOR,
                strokeOpacity: 1,
                strokeWeight: 5,
                clickable: false,
                zIndex: 2,
              }}
            />
          </>
        ) : null}

        {resolvedDestination && destMarkerIcon ? (
          <MarkerF
            position={resolvedDestination}
            icon={destMarkerIcon}
            title={destinationLabel}
            zIndex={isSearching ? 1000 : 800}
          />
        ) : null}

        {smoothProvider && !isSearching && providerMarkerIcon ? (
          <MarkerF
            position={smoothProvider}
            icon={providerMarkerIcon}
            title={providerLabel}
            zIndex={900}
          />
        ) : null}
      </GoogleMap>

      {isSearching ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[2] flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
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
