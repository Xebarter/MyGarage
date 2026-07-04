'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { fetchOsrmRoute } from '@/lib/maps/osrm-route';
import {
  buildCurvedRouteCoordinates,
  getRideTileUrl,
  pickupMarkerHtml,
  providerMarkerHtml,
  radarMarkerHtml,
  RIDE_MAP_LEAFLET_CSS,
  ROUTE_CASING_COLOR,
  ROUTE_CORE_COLOR,
  ROUTE_SHADOW_COLOR,
  toLatLngTuple,
  type MapPoint,
} from '@/lib/maps/ride-map-utils';
import { cn } from '@/lib/utils';

function fixLeafletIcons() {
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  });
}

function FitView({ latLngs, zoomSingle = 16 }: { latLngs: [number, number][]; zoomSingle?: number }) {
  const map = useMap();
  useEffect(() => {
    if (latLngs.length === 0) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], zoomSingle, { animate: true });
      return;
    }
    const b = L.latLngBounds(latLngs);
    map.fitBounds(b, { padding: [56, 56], maxZoom: 16, animate: true });
  }, [map, latLngs, zoomSingle]);
  return null;
}

function makeDivIcon(html: string, size: [number, number], anchor: [number, number]) {
  return L.divIcon({
    className: 'ride-map-marker-icon',
    html,
    iconSize: size,
    iconAnchor: anchor,
  });
}

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
};

export function ServiceTripMapInner({
  destination,
  provider,
  className,
  providerLabel = 'Provider',
  destinationLabel = 'Customer',
  destinationAddress,
  mode = 'auto',
  minHeight = 'min(48vh,420px)',
}: ServiceTripMapInnerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [osrmRoute, setOsrmRoute] = useState<[number, number][]>([]);
  const [geocodedDest, setGeocodedDest] = useState<TripMapPoint | null>(null);
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    setIconsReady(true);
  }, []);

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

  const providerLL = provider ? toLatLngTuple(provider) : null;
  const destLL = resolvedDestination ? toLatLngTuple(resolvedDestination) : null;

  const isSearching =
    mode === 'searching' || (mode === 'auto' && Boolean(destLL) && !providerLL);

  useEffect(() => {
    if (!provider || !resolvedDestination || isSearching) {
      setOsrmRoute([]);
      return;
    }
    let cancelled = false;
    void fetchOsrmRoute(
      { lng: provider.lng, lat: provider.lat },
      { lng: resolvedDestination.lng, lat: resolvedDestination.lat },
    ).then((coords) => {
      if (cancelled) return;
      if (coords?.length) {
        setOsrmRoute(coords.map((c) => [c[1], c[0]] as [number, number]));
        return;
      }
      const curved = buildCurvedRouteCoordinates(provider, resolvedDestination, 42);
      setOsrmRoute(curved.map(toLatLngTuple));
    });
    return () => {
      cancelled = true;
    };
  }, [provider?.lat, provider?.lng, resolvedDestination?.lat, resolvedDestination?.lng, isSearching]);

  const center = useMemo((): [number, number] => {
    if (providerLL) return providerLL;
    if (destLL) return destLL;
    return [0.3476, 32.5825];
  }, [providerLL, destLL]);

  const fitPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (providerLL) pts.push(providerLL);
    if (destLL) pts.push(destLL);
    return pts;
  }, [providerLL, destLL]);

  const markerIcons = useMemo(() => {
    const accent = ROUTE_CORE_COLOR;
    return {
      pickup: makeDivIcon(pickupMarkerHtml(accent), [48, 64], [24, 60]),
      provider: makeDivIcon(providerMarkerHtml(accent), [54, 54], [27, 27]),
      radar: makeDivIcon(radarMarkerHtml(accent), [120, 120], [60, 72]),
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

  if (!iconsReady) {
    return <div className={cn('w-full rounded-2xl bg-muted/30', className)} style={{ minHeight }} />;
  }

  const tileUrl = getRideTileUrl(isDark);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)} style={{ minHeight }}>
      <style dangerouslySetInnerHTML={{ __html: RIDE_MAP_LEAFLET_CSS }} />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-16 bg-gradient-to-b from-background/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] h-20 bg-gradient-to-t from-background/90 to-transparent"
        aria-hidden
      />

      <MapContainer
        center={center}
        zoom={isSearching ? 16 : 14}
        className={cn(
          'z-0 h-full w-full',
          '[&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-control-attribution]:opacity-60',
          '[&_.leaflet-control-zoom]:hidden',
        )}
        style={{ minHeight, height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap' url={tileUrl} />
        <FitView latLngs={fitPoints.length ? fitPoints : [center]} zoomSingle={isSearching ? 16 : 15} />

        {osrmRoute.length > 1 && !isSearching ? (
          <>
            <Polyline
              positions={osrmRoute}
              pathOptions={{ color: ROUTE_CASING_COLOR, weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={osrmRoute}
              pathOptions={{ color: ROUTE_SHADOW_COLOR, weight: 8, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={osrmRoute}
              pathOptions={{ color: ROUTE_CORE_COLOR, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        ) : null}

        {destLL ? (
          <Marker
            position={destLL}
            icon={isSearching ? markerIcons.radar : markerIcons.pickup}
            zIndexOffset={isSearching ? 1000 : 800}
          >
            {!isSearching ? <Popup className="text-sm font-medium">{destinationLabel}</Popup> : null}
          </Marker>
        ) : null}

        {providerLL && !isSearching ? (
          <Marker position={providerLL} icon={markerIcons.provider} zIndexOffset={900}>
            <Popup className="text-sm font-medium">{providerLabel}</Popup>
          </Marker>
        ) : null}
      </MapContainer>

      {isSearching ? (
        <div className="pointer-events-none absolute left-4 top-4 z-[600] flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm">
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
