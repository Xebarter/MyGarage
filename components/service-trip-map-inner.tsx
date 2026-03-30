'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchOsrmRoute } from '@/lib/maps/osrm-route';
import { cn } from '@/lib/utils';

function fixLeafletIcons() {
  const proto = L.Icon.Default.prototype as unknown as { _getIconUrl?: string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function FitView({ latLngs }: { latLngs: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (latLngs.length === 0) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 15);
      return;
    }
    const b = L.latLngBounds(latLngs);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 16 });
  }, [map, latLngs]);
  return null;
}

function makeMarkerIcon(color: string) {
  return L.divIcon({
    className: 'service-trip-marker',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export type TripMapPoint = { lat: number; lng: number };

export function ServiceTripMapInner({
  destination,
  provider,
  className,
  providerLabel = 'Provider',
  destinationLabel = 'Customer',
}: {
  destination: TripMapPoint | null;
  provider: TripMapPoint | null;
  className?: string;
  providerLabel?: string;
  destinationLabel?: string;
}) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const [iconsReady, setIconsReady] = useState(false);
  const [markerIcons, setMarkerIcons] = useState<{ provider: L.DivIcon; destination: L.DivIcon } | null>(null);

  useEffect(() => {
    fixLeafletIcons();
    setMarkerIcons({ provider: makeMarkerIcon('#2563eb'), destination: makeMarkerIcon('#16a34a') });
    setIconsReady(true);
  }, []);

  const providerLL = provider ? ([provider.lat, provider.lng] as [number, number]) : null;
  const destLL = destination ? ([destination.lat, destination.lng] as [number, number]) : null;

  useEffect(() => {
    if (!provider || !destination) {
      setRoute([]);
      return;
    }
    let cancelled = false;
    void fetchOsrmRoute(
      { lng: provider.lng, lat: provider.lat },
      { lng: destination.lng, lat: destination.lat },
    ).then((coords) => {
      if (cancelled || !coords?.length) {
        if (!cancelled) setRoute([]);
        return;
      }
      const latLngs = coords.map((c) => [c[1], c[0]] as [number, number]);
      if (!cancelled) setRoute(latLngs);
    });
    return () => {
      cancelled = true;
    };
  }, [provider?.lat, provider?.lng, destination?.lat, destination?.lng]);

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

  if (!destination && !provider) {
    return (
      <div
        className={cn(
          'flex min-h-[240px] items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-sm text-muted-foreground',
          className,
        )}
      >
        Map will appear when location is available.
      </div>
    );
  }

  if (!iconsReady) {
    return <div className={cn('min-h-[280px] w-full rounded-2xl bg-muted/30', className)} />;
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      className={cn('z-0 h-full min-h-[min(45vh,380px)] w-full rounded-2xl [&_.leaflet-control-attribution]:text-[10px]', className)}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitView latLngs={fitPoints.length ? fitPoints : [center]} />
      {route.length > 1 ? (
        <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.88 }} />
      ) : null}
      {providerLL && markerIcons ? (
        <Marker position={providerLL} icon={markerIcons.provider}>
          <Popup>{providerLabel}</Popup>
        </Marker>
      ) : null}
      {destLL && markerIcons ? (
        <Marker position={destLL} icon={markerIcons.destination}>
          <Popup>{destinationLabel}</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
