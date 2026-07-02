import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSmoothedGeoPosition } from '@/hooks/useSmoothedGeoPosition';
import {
  buildRouteCoordinates,
  formatDistanceLabel,
  isValidPoint,
  type GeoPoint,
} from '@/lib/service-request-phase';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
];

type LiveTrackingMapProps = {
  destination: GeoPoint | null;
  providerTarget: GeoPoint | null;
  etaMinutes: number | null;
  distanceKm: number | null;
  statusLabel: string;
  showRoute: boolean;
  topInset?: number;
};

export function LiveTrackingMap({
  destination,
  providerTarget,
  etaMinutes,
  distanceKm,
  statusLabel,
  showRoute,
  topInset = 0,
}: LiveTrackingMapProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const mapRef = useRef<MapView>(null);
  const providerDisplay = useSmoothedGeoPosition(providerTarget, { durationMs: 1500 });

  const routeCoords = useMemo(() => {
    if (!showRoute || !destination || !providerDisplay) return [];
    return buildRouteCoordinates(providerDisplay, destination, 28);
  }, [destination, providerDisplay, showRoute]);

  useEffect(() => {
    if (!destination) return;
    const points = providerDisplay ? [destination, providerDisplay] : [destination];
    mapRef.current?.fitToCoordinates(
      points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
      { edgePadding: { top: 110, right: 42, bottom: 320, left: 42 }, animated: true },
    );
  }, [destination, providerDisplay?.lat, providerDisplay?.lng]);

  if (!destination || !isValidPoint(destination)) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.card }]}>
        <Ionicons name="map-outline" size={42} color={colors.textMuted} />
        <Text style={[styles.fallbackText, { color: colors.textMuted }]}>Map updates will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: destination.lat,
          longitude: destination.lng,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        customMapStyle={scheme === 'dark' && Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle={scheme}>
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} anchor={{ x: 0.5, y: 1 }}>
          <View style={[styles.userMarker, { borderColor: colors.card }]}>
            <Ionicons name="person" size={14} color="#FFFFFF" />
          </View>
        </Marker>

        {providerDisplay ? (
          <Marker coordinate={{ latitude: providerDisplay.lat, longitude: providerDisplay.lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.providerMarkerOuter, { borderColor: colors.primary + '55' }]}>
              <View style={[styles.providerMarker, { backgroundColor: colors.primary }]}>
                <Ionicons name="car-sport" size={16} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        ) : null}

        {routeCoords.length > 1 ? (
          <>
            <Polyline
              coordinates={routeCoords.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
              strokeColor={colors.primary + '33'}
              strokeWidth={7}
            />
            <Polyline
              coordinates={routeCoords.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          </>
        ) : null}
      </MapView>

      <View style={[styles.etaPill, { backgroundColor: colors.card, borderColor: colors.border, top: topInset + 12 }]}>
        <View style={[styles.etaDot, { backgroundColor: colors.success }]} />
        <View style={styles.etaCopy}>
          <Text style={[styles.etaTitle, { color: colors.text }]} numberOfLines={1}>
            {etaMinutes != null ? `Arriving in ${etaMinutes} min` : statusLabel}
          </Text>
          {distanceKm != null ? (
            <Text style={[styles.etaSub, { color: colors.textMuted }]}>
              {formatDistanceLabel(distanceKm)} remaining
            </Text>
          ) : (
            <Text style={[styles.etaSub, { color: colors.textMuted }]}>{statusLabel}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { ...StyleSheet.absoluteFill },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
  },
  userMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  providerMarkerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  providerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaPill: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  etaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  etaCopy: { flex: 1, gap: 2 },
  etaTitle: { fontSize: 15, fontWeight: '800' },
  etaSub: { fontSize: 12, fontWeight: '600' },
});
