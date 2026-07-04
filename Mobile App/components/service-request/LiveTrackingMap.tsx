import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { MapChrome } from '@/components/maps/MapChrome';
import { PickupPinMarker, ProviderVehicleMarker } from '@/components/maps/RideMapMarkers';
import { WebMapView } from '@/components/maps/WebMapView';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSmoothedGeoPosition } from '@/hooks/useSmoothedGeoPosition';
import { useResolvedMapDestination } from '@/hooks/useResolvedMapDestination';
import { shouldUseWebMapFallback } from '@/lib/mapRuntime';
import { getMapProvider, KAMPALA_REGION, MAP_EDGE_PADDING } from '@/lib/maps';
import {
  getRideMapStyle,
  ROUTE_CASING_COLOR,
  ROUTE_CORE_COLOR,
  ROUTE_SHADOW_COLOR,
} from '@/lib/mapStyles';
import {
  buildCurvedRouteCoordinates,
  formatDistanceLabel,
  isValidPoint,
  type GeoPoint,
} from '@/lib/service-request-phase';

type LiveTrackingMapProps = {
  destination: GeoPoint | null;
  providerTarget: GeoPoint | null;
  etaMinutes: number | null;
  distanceKm: number | null;
  statusLabel: string;
  showRoute: boolean;
  topInset?: number;
  locationLabel?: string;
  mapWidth?: number;
  mapHeight?: number;
};

function toLatLng(points: GeoPoint[]) {
  return points.map((point) => ({ latitude: point.lat, longitude: point.lng }));
}

export function LiveTrackingMap({
  destination,
  providerTarget,
  etaMinutes,
  distanceKm,
  statusLabel,
  showRoute,
  topInset = 0,
  locationLabel,
  mapWidth,
  mapHeight,
}: LiveTrackingMapProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const window = useWindowDimensions();
  const width = mapWidth ?? window.width;
  const height = mapHeight ?? window.height;
  const mapRef = useRef<MapView>(null);
  const providerDisplay = useSmoothedGeoPosition(providerTarget, { durationMs: 1500 });
  const { destination: mapDestination } = useResolvedMapDestination(destination, locationLabel);
  const activeDestination = mapDestination && isValidPoint(mapDestination) ? mapDestination : null;
  const useWebMap = shouldUseWebMapFallback();
  const routeColor = colors.primary || ROUTE_CORE_COLOR;

  const routeCoords = useMemo(() => {
    if (!showRoute || !activeDestination || !providerDisplay) return [];
    return buildCurvedRouteCoordinates(providerDisplay, activeDestination, 42);
  }, [activeDestination, providerDisplay, showRoute]);

  useEffect(() => {
    if (useWebMap || !activeDestination) return;
    const points = providerDisplay ? [activeDestination, providerDisplay] : [activeDestination];
    mapRef.current?.fitToCoordinates(toLatLng(points), {
      edgePadding: MAP_EDGE_PADDING,
      animated: true,
    });
  }, [activeDestination, providerDisplay?.lat, providerDisplay?.lng, useWebMap]);

  const initialRegion = activeDestination
    ? {
        latitude: activeDestination.lat,
        longitude: activeDestination.lng,
        latitudeDelta: 0.028,
        longitudeDelta: 0.028,
      }
    : KAMPALA_REGION;

  const webFitBounds = useMemo(() => {
    const points: GeoPoint[] = [];
    if (activeDestination) points.push(activeDestination);
    if (providerDisplay) points.push(providerDisplay);
    return points.map((point) => ({ lat: point.lat, lng: point.lng }));
  }, [activeDestination, providerDisplay]);

  const webPolylines = useMemo(() => {
    if (routeCoords.length < 2) return [];
    const points = routeCoords.map((point) => ({ lat: point.lat, lng: point.lng }));
    return [
      { points, color: ROUTE_CASING_COLOR, weight: 11, opacity: 0.95 },
      { points, color: ROUTE_SHADOW_COLOR, weight: 8, opacity: 0.35 },
      { points, color: routeColor, weight: 5, opacity: 1 },
    ];
  }, [routeColor, routeCoords]);

  const webMarkers = useMemo(() => {
    const markers = [];
    if (activeDestination) {
      markers.push({ lat: activeDestination.lat, lng: activeDestination.lng, color: routeColor, kind: 'pickup' as const });
    }
    if (providerDisplay) {
      markers.push({
        lat: providerDisplay.lat,
        lng: providerDisplay.lng,
        color: routeColor,
        kind: 'provider' as const,
      });
    }
    return markers;
  }, [activeDestination, providerDisplay, routeColor]);

  const routeLatLng = useMemo(() => toLatLng(routeCoords), [routeCoords]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {useWebMap ? (
        <WebMapView
          width={width}
          height={height}
          center={
            activeDestination
              ? { lat: activeDestination.lat, lng: activeDestination.lng }
              : { lat: KAMPALA_REGION.latitude, lng: KAMPALA_REGION.longitude }
          }
          zoom={15}
          markers={webMarkers}
          polylines={webPolylines}
          fitBounds={webFitBounds.length > 1 ? webFitBounds : undefined}
          scheme={scheme}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={[styles.map, { width, height }]}
          provider={getMapProvider()}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsPointsOfInterest={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          mapType="standard"
          loadingEnabled
          loadingBackgroundColor={scheme === 'dark' ? '#1c2333' : '#f3f4f6'}
          mapPadding={MAP_EDGE_PADDING}
          customMapStyle={getRideMapStyle(scheme)}
          userInterfaceStyle={scheme}>
          {routeLatLng.length > 1 ? (
            <>
              <Polyline
                coordinates={routeLatLng}
                strokeColor={ROUTE_CASING_COLOR}
                strokeWidth={11}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                coordinates={routeLatLng}
                strokeColor={ROUTE_SHADOW_COLOR}
                strokeWidth={8}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                coordinates={routeLatLng}
                strokeColor={routeColor}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            </>
          ) : null}

          {activeDestination ? (
            <Marker
              coordinate={{ latitude: activeDestination.lat, longitude: activeDestination.lng }}
              anchor={{ x: 0.5, y: 0.92 }}
              tracksViewChanges={false}>
              <PickupPinMarker accentColor={routeColor} />
            </Marker>
          ) : null}

          {providerDisplay ? (
            <Marker
              coordinate={{ latitude: providerDisplay.lat, longitude: providerDisplay.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}>
              <ProviderVehicleMarker color={routeColor} />
            </Marker>
          ) : null}
        </MapView>
      )}

      <MapChrome scheme={scheme} bottomFadeHeight={MAP_EDGE_PADDING.bottom} topFadeHeight={96} />

      <View
        style={[
          styles.etaPill,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            top: topInset + 14,
            shadowColor: scheme === 'dark' ? '#000000' : '#0F172A',
          },
        ]}>
        <View style={[styles.etaAccent, { backgroundColor: routeColor }]} />
        <View style={styles.etaCopy}>
          <Text style={[styles.etaTitle, { color: colors.text }]} numberOfLines={1}>
            {etaMinutes != null ? `Arriving in ${etaMinutes} min` : statusLabel}
          </Text>
          {distanceKm != null ? (
            <Text style={[styles.etaSub, { color: colors.textMuted }]}>
              {formatDistanceLabel(distanceKm)} away
            </Text>
          ) : (
            <Text style={[styles.etaSub, { color: colors.textMuted }]}>{statusLabel}</Text>
          )}
        </View>
        <View style={[styles.etaLiveDot, { backgroundColor: colors.success }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F3F4F6' },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  etaPill: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  etaAccent: {
    width: 4,
    height: 34,
    borderRadius: 999,
  },
  etaCopy: { flex: 1, gap: 2 },
  etaTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  etaSub: { fontSize: 12, fontWeight: '600' },
  etaLiveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
