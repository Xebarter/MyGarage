'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PREMIUM_MAP_STYLE } from '@/lib/maps/premium-map-style';
import {
  PICKUP_PIN_COLOR,
  PROVIDER_PIN_COLOR,
  ROUTE_CASING_COLOR,
  ROUTE_CORE_COLOR,
  type MapPoint,
} from '@/lib/maps/ride-map-utils';
import { parseMapPoint } from '@/lib/maps/coords';
import { hasGoogleMapsBrowserKey, importGoogleMapsLib, useGoogleMapsJs } from '@/lib/maps/use-google-maps-js';
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
const SEARCH_ACCENT = '#0E9A6A';

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

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function destinationIconSvg(searching: boolean): string {
  const color = searching ? SEARCH_ACCENT : PICKUP_PIN_COLOR;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" fill="none">
    <circle cx="18" cy="18" r="14" fill="${color}" stroke="#fff" stroke-width="3"/>
    <circle cx="18" cy="18" r="5" fill="#fff"/>
    <path d="M18 32v10" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="18" cy="44" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>
  </svg>`;
}

function vehicleIconSvg(heading: number): string {
  const color = PROVIDER_PIN_COLOR;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none">
    <g transform="rotate(${heading} 22 22)">
      <circle cx="22" cy="22" r="18" fill="${color}" stroke="#fff" stroke-width="3"/>
      <path d="M22 11l8 20-8-5-8 5 8-20z" fill="#fff"/>
    </g>
  </svg>`;
}

export default function ServiceTripMapInner({
  destination: destinationProp,
  provider: providerProp,
  className,
  providerLabel = 'Provider',
  destinationLabel = 'Customer',
  destinationAddress,
  mode = 'auto',
  minHeight = 'min(48vh,420px)',
  onRouteMeta,
}: ServiceTripMapInnerProps) {
  const destination = parseMapPoint(destinationProp?.lat, destinationProp?.lng);
  const provider = parseMapPoint(providerProp?.lat, providerProp?.lng);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const providerMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeCasingRef = useRef<google.maps.Polyline | null>(null);
  const routeCoreRef = useRef<google.maps.Polyline | null>(null);
  const searchCirclesRef = useRef<google.maps.Circle[]>([]);
  const dragListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const fittedKeyRef = useRef('');
  const wasSearchingRef = useRef(false);
  const lastProviderRef = useRef<TripMapPoint | null>(provider);
  const lastRouteFetchRef = useRef('');
  const lastSmoothRef = useRef<TripMapPoint | null>(null);
  const animRef = useRef<number | null>(null);

  const { isLoaded, loadError } = useGoogleMapsJs();
  const mapsKeyReady = hasGoogleMapsBrowserKey();

  const [geocodedDest, setGeocodedDest] = useState<TripMapPoint | null>(null);
  const [routePath, setRoutePath] = useState<TripMapPoint[]>([]);
  const [smoothProvider, setSmoothProvider] = useState<TripMapPoint | null>(provider);
  const [heading, setHeading] = useState(0);
  const [userDragged, setUserDragged] = useState(false);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const resolvedDestination = destination ?? geocodedDest;
  const isSearching =
    mode === 'searching' ||
    (mode === 'auto' && Boolean(resolvedDestination) && !provider);
  const hasPoints = Boolean(resolvedDestination || provider);

  const center = useMemo((): TripMapPoint => {
    if (smoothProvider && !isSearching) return smoothProvider;
    if (resolvedDestination) return resolvedDestination;
    if (smoothProvider) return smoothProvider;
    return KAMPALA;
  }, [smoothProvider, resolvedDestination, isSearching]);

  useEffect(() => {
    if (destination || !destinationAddress?.trim() || destinationAddress.trim().length < 3) {
      setGeocodedDest(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/geocode?q=${encodeURIComponent(destinationAddress.trim())}`)
      .then((res) => res.json())
      .then((json: { lat?: number | null; lng?: number | null }) => {
        if (cancelled) return;
        const point = parseMapPoint(json.lat, json.lng);
        if (!point) return;
        setGeocodedDest(point);
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

  useEffect(() => {
    if (!isLoaded || !hasPoints) return;
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      try {
        const gmaps = await importGoogleMapsLib();
        if (cancelled || !containerRef.current) return;

        const map = new gmaps.Map(containerRef.current, {
          center,
          zoom: isSearching ? 16 : 14,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: gmaps.ControlPosition.RIGHT_BOTTOM },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          keyboardShortcuts: false,
          gestureHandling: 'greedy',
          styles: PREMIUM_MAP_STYLE,
          backgroundColor: '#FFF6EA',
          mapTypeId: 'roadmap',
        });
        if (cancelled) return;
        dragListenerRef.current = map.addListener('dragstart', () => setUserDragged(true));
        mapRef.current = map;
        const triggerResize = () => gmaps.event.trigger(map, 'resize');
        requestAnimationFrame(triggerResize);
        window.setTimeout(triggerResize, 80);
        window.setTimeout(triggerResize, 400);
        resizeObserver = new ResizeObserver(triggerResize);
        resizeObserver.observe(containerRef.current);
        setMapReady(true);
      } catch (error) {
        if (!cancelled) {
          console.error('Google Maps JS failed to initialize', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      dragListenerRef.current?.remove();
      dragListenerRef.current = null;
      searchCirclesRef.current.forEach((c) => c.setMap(null));
      searchCirclesRef.current = [];
      routeCasingRef.current?.setMap(null);
      routeCoreRef.current?.setMap(null);
      destMarkerRef.current?.setMap(null);
      providerMarkerRef.current?.setMap(null);
      routeCasingRef.current = null;
      routeCoreRef.current = null;
      destMarkerRef.current = null;
      providerMarkerRef.current = null;
      mapRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
      setMapReady(false);
    };
    // Create once per load + point availability. Camera updates live in the overlay effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, hasPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    searchCirclesRef.current.forEach((c) => c.setMap(null));
    searchCirclesRef.current = [];
    routeCasingRef.current?.setMap(null);
    routeCoreRef.current?.setMap(null);
    routeCasingRef.current = null;
    routeCoreRef.current = null;

    if (isSearching && resolvedDestination) {
      searchCirclesRef.current = [
        new google.maps.Circle({
          map,
          center: resolvedDestination,
          radius: 220,
          strokeColor: SEARCH_ACCENT,
          strokeOpacity: 0.22,
          strokeWeight: 1,
          fillColor: SEARCH_ACCENT,
          fillOpacity: 0.07,
          clickable: false,
        }),
        new google.maps.Circle({
          map,
          center: resolvedDestination,
          radius: 90,
          strokeColor: SEARCH_ACCENT,
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillColor: SEARCH_ACCENT,
          fillOpacity: 0.1,
          clickable: false,
        }),
      ];
    }

    if (routePath.length > 1 && !isSearching) {
      routeCasingRef.current = new google.maps.Polyline({
        map,
        path: routePath,
        strokeColor: ROUTE_CASING_COLOR,
        strokeOpacity: 1,
        strokeWeight: 10,
        clickable: false,
        geodesic: true,
      });
      routeCoreRef.current = new google.maps.Polyline({
        map,
        path: routePath,
        strokeColor: ROUTE_CORE_COLOR,
        strokeOpacity: 1,
        strokeWeight: 5,
        clickable: false,
        geodesic: true,
      });
    }

    if (resolvedDestination) {
      const icon: google.maps.Icon = {
        url: svgDataUrl(destinationIconSvg(isSearching)),
        scaledSize: new google.maps.Size(36, 48),
        anchor: new google.maps.Point(18, 44),
      };
      if (destMarkerRef.current) {
        destMarkerRef.current.setPosition(resolvedDestination);
        destMarkerRef.current.setIcon(icon);
        destMarkerRef.current.setTitle(destinationLabel);
      } else {
        destMarkerRef.current = new google.maps.Marker({
          map,
          position: resolvedDestination,
          icon,
          title: destinationLabel,
          zIndex: isSearching ? 1000 : 800,
          clickable: false,
          optimized: false,
        });
      }
    } else {
      destMarkerRef.current?.setMap(null);
      destMarkerRef.current = null;
    }

    if (smoothProvider && !isSearching) {
      const icon: google.maps.Icon = {
        url: svgDataUrl(vehicleIconSvg(heading)),
        scaledSize: new google.maps.Size(44, 44),
        anchor: new google.maps.Point(22, 22),
      };
      if (providerMarkerRef.current) {
        providerMarkerRef.current.setPosition(smoothProvider);
        providerMarkerRef.current.setIcon(icon);
      } else {
        providerMarkerRef.current = new google.maps.Marker({
          map,
          position: smoothProvider,
          icon,
          title: providerLabel,
          zIndex: 900,
          clickable: false,
          optimized: false,
        });
      }
    } else {
      providerMarkerRef.current?.setMap(null);
      providerMarkerRef.current = null;
    }

    if (userDragged) return;
    if (isSearching !== wasSearchingRef.current) {
      fittedKeyRef.current = '';
      wasSearchingRef.current = isSearching;
    }
    const fitKey = [
      String(recenterNonce),
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
  }, [
    mapReady,
    resolvedDestination,
    smoothProvider,
    heading,
    isSearching,
    routePath,
    userDragged,
    recenterNonce,
    destinationLabel,
    providerLabel,
  ]);

  const recenter = useCallback(() => {
    setUserDragged(false);
    setRecenterNonce((n) => n + 1);
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

  if (!mapsKeyReady || loadError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-border/60 bg-muted/30 px-6 text-center text-sm text-muted-foreground',
          className,
        )}
        style={{ minHeight }}
      >
        Google Maps could not load. Check that Maps JavaScript API is enabled for this key.
      </div>
    );
  }

  return (
    <div
      className={cn('relative min-h-[280px] overflow-hidden rounded-2xl', className)}
      style={{ minHeight, height: minHeight }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-16 bg-gradient-to-b from-background/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-20 bg-gradient-to-t from-background/90 to-transparent"
        aria-hidden
      />
      <div ref={containerRef} className="mg-google-map h-full w-full bg-[#FFF6EA]" />

      {!isLoaded ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-[#FFF6EA] text-sm text-muted-foreground">
          Loading map…
        </div>
      ) : null}

      {isSearching ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[3] flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Scanning for providers
        </div>
      ) : null}

      {userDragged ? (
        <button
          type="button"
          onClick={recenter}
          className="absolute bottom-16 right-3 z-[3] rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm hover:bg-background"
        >
          Recenter
        </button>
      ) : null}
    </div>
  );
}
