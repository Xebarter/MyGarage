import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { PickupPinMarker } from '@/components/maps/RideMapMarkers';
import { WebMapView } from '@/components/maps/WebMapView';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { shouldUseWebMapFallback } from '@/lib/mapRuntime';
import { getMapProvider } from '@/lib/maps';
import { getRideMapStyle } from '@/lib/mapStyles';
import type { LocationStatus } from '@/hooks/useServiceLocation';

type ServiceLocationMapProps = {
  coords: { lat: number; lng: number } | null;
  placeLabel: string;
  accentColor: string;
  locationStatus: LocationStatus;
  locationMessage: string;
  locationAccuracyLabel: string;
  onRefresh: () => void;
};

const MAP_HEIGHT = 240;

export function ServiceLocationMap({
  coords,
  placeLabel,
  accentColor,
  locationStatus,
  locationMessage,
  locationAccuracyLabel,
  onRefresh,
}: ServiceLocationMapProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { width: screenWidth } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!coords || locationStatus !== 'ready') return;
    mapRef.current?.animateToRegion(
      {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      450,
    );
  }, [coords, locationStatus]);

  const statusLabel =
    locationStatus === 'detecting'
      ? 'Locating…'
      : locationStatus === 'ready'
        ? 'Pin ready'
        : locationStatus === 'error'
          ? 'Needs attention'
          : 'Waiting for GPS';

  const showMap = coords && locationStatus === 'ready';
  const useWebMap = shouldUseWebMapFallback();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: accentColor + '33',
        },
      ]}>
      <View style={styles.mapShell}>
        {showMap ? (
          useWebMap ? (
            <WebMapView
              width={screenWidth - 2}
              height={MAP_HEIGHT}
              center={{ lat: coords.lat, lng: coords.lng }}
              zoom={16}
              markers={[{ lat: coords.lat, lng: coords.lng, color: accentColor, kind: 'pickup' }]}
              scheme={scheme}
            />
          ) : (
            <MapView
            ref={mapRef}
            style={styles.map}
            provider={getMapProvider()}
            initialRegion={{
              latitude: coords.lat,
              longitude: coords.lng,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            }}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsPointsOfInterest={false}
            customMapStyle={Platform.OS === 'android' ? getRideMapStyle(scheme) : undefined}
            userInterfaceStyle={scheme}>
            <Marker
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              anchor={{ x: 0.5, y: 0.92 }}
              tracksViewChanges={false}>
              <PickupPinMarker accentColor={accentColor} />
            </Marker>
          </MapView>
          )
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.background }]}>
            {locationStatus === 'detecting' ? (
              <>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  Finding your position…
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="map-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                  {locationMessage}
                </Text>
              </>
            )}
          </View>
        )}

        <View style={styles.mapTopRow}>
          <View
            style={[
              styles.statusPill,
              locationStatus === 'ready'
                ? styles.statusReady
                : locationStatus === 'detecting'
                  ? styles.statusDetecting
                  : locationStatus === 'error'
                    ? styles.statusError
                    : styles.statusIdle,
            ]}>
            {locationStatus === 'detecting' ? (
              <ActivityIndicator size={10} color="#0369A1" />
            ) : (
              <Ionicons
                name={locationStatus === 'ready' ? 'location' : 'alert-circle'}
                size={12}
                color={
                  locationStatus === 'ready'
                    ? '#047857'
                    : locationStatus === 'error'
                      ? '#DC2626'
                      : '#64748B'
                }
              />
            )}
            <Text
              style={[
                styles.statusText,
                locationStatus === 'ready' && styles.statusTextReady,
                locationStatus === 'error' && styles.statusTextError,
              ]}>
              {statusLabel}
            </Text>
          </View>

          <Pressable
            onPress={onRefresh}
            disabled={locationStatus === 'detecting'}
            style={({ pressed }) => [
              styles.recenterBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: locationStatus === 'detecting' ? 0.55 : pressed ? 0.85 : 1,
              },
            ]}>
            {locationStatus === 'detecting' ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Ionicons name="locate" size={18} color={accentColor} />
            )}
          </Pressable>
        </View>

        <View style={[styles.addressOverlay, { backgroundColor: colors.card + 'F2' }]}>
          <Text style={[styles.addressLabel, { color: colors.textMuted }]}>Meeting point</Text>
          <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
            {locationStatus === 'ready' && placeLabel ? placeLabel : locationMessage}
          </Text>
          {locationStatus === 'ready' && locationAccuracyLabel ? (
            <Text style={[styles.accuracy, { color: colors.textMuted }]}>{locationAccuracyLabel}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  mapShell: {
    height: MAP_HEIGHT,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  mapTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  statusIdle: {
    backgroundColor: '#F8FAFC',
  },
  statusDetecting: {
    backgroundColor: '#E0F2FE',
  },
  statusReady: {
    backgroundColor: '#DCFCE7',
  },
  statusError: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#64748B',
  },
  statusTextReady: {
    color: '#047857',
  },
  statusTextError: {
    color: '#DC2626',
  },
  recenterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  addressOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  accuracy: {
    fontSize: 11,
    fontWeight: '500',
  },
});
