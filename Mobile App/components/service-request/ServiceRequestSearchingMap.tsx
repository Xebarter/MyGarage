import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { MapChrome } from '@/components/maps/MapChrome';
import { PickupPinMarker } from '@/components/maps/RideMapMarkers';
import { useRadarPulse } from '@/components/maps/useRadarPulse';
import { WebMapView } from '@/components/maps/WebMapView';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { shouldUseWebMapFallback } from '@/lib/mapRuntime';
import { getMapProvider, KAMPALA_REGION } from '@/lib/maps';
import { getRideMapStyle } from '@/lib/mapStyles';
import { isValidPoint, type GeoPoint } from '@/lib/service-request-phase';

type ServiceRequestSearchingMapProps = {
  destination: GeoPoint | null;
  accentColor?: string;
  loading?: boolean;
  mapPaddingBottom?: number;
};

export function ServiceRequestSearchingMap({
  destination,
  accentColor = '#2563EB',
  loading = false,
  mapPaddingBottom = 0,
}: ServiceRequestSearchingMapProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { width, height } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const radarRings = useRadarPulse(Boolean(destination && isValidPoint(destination)));
  const hasDestination = destination && isValidPoint(destination);
  const [mapReady, setMapReady] = useState(false);
  const useWebMap = shouldUseWebMapFallback();

  const mapCenter = hasDestination
    ? { lat: destination.lat, lng: destination.lng }
    : { lat: KAMPALA_REGION.latitude, lng: KAMPALA_REGION.longitude };

  const initialRegion = hasDestination
    ? {
        latitude: destination.lat,
        longitude: destination.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : KAMPALA_REGION;

  useEffect(() => {
    if (useWebMap || !mapReady || !hasDestination) return;
    mapRef.current?.animateToRegion(
      {
        latitude: destination.lat,
        longitude: destination.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      650,
    );
  }, [destination?.lat, destination?.lng, hasDestination, mapReady, useWebMap]);

  const webCircles = useMemo(() => {
    if (!hasDestination) return [];
    return radarRings.map((ring) => ({
      lat: destination.lat,
      lng: destination.lng,
      radiusM: ring.radius,
      strokeColor: accentColor,
      fillColor: `rgba(37, 99, 235, ${ring.fillOpacity})`,
      strokeOpacity: ring.strokeOpacity,
    }));
  }, [accentColor, destination, hasDestination, radarRings]);

  const bottomFade = mapPaddingBottom > 0 ? mapPaddingBottom + 24 : 120;

  return (
    <View style={[styles.container, { width, height }]}>
      {useWebMap ? (
        <WebMapView
          width={width}
          height={height}
          center={mapCenter}
          zoom={hasDestination ? 16 : 12}
          markers={
            hasDestination
              ? [{ lat: destination.lat, lng: destination.lng, color: accentColor, kind: 'pickup' }]
              : []
          }
          circles={webCircles}
          scheme={scheme}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={{ width, height }}
          provider={getMapProvider()}
          initialRegion={initialRegion}
          onMapReady={() => setMapReady(true)}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          showsPointsOfInterest={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          scrollEnabled
          zoomEnabled
          mapType="standard"
          loadingEnabled
          loadingBackgroundColor={scheme === 'dark' ? '#1c2333' : '#f3f4f6'}
          loadingIndicatorColor={accentColor}
          customMapStyle={getRideMapStyle(scheme)}
          mapPadding={{
            top: 88,
            right: 28,
            bottom: mapPaddingBottom,
            left: 28,
          }}
          userInterfaceStyle={scheme}>
          {hasDestination ? (
            <>
              {radarRings.map((ring, index) => (
                <Circle
                  key={`radar-${index}`}
                  center={{ latitude: destination.lat, longitude: destination.lng }}
                  radius={ring.radius}
                  strokeColor={`rgba(37, 99, 235, ${ring.strokeOpacity})`}
                  strokeWidth={2}
                  fillColor={`rgba(37, 99, 235, ${ring.fillOpacity})`}
                />
              ))}
              <Marker
                coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                anchor={{ x: 0.5, y: 0.92 }}
                tracksViewChanges={false}>
                <PickupPinMarker accentColor={accentColor} />
              </Marker>
            </>
          ) : null}
        </MapView>
      )}

      <MapChrome scheme={scheme} bottomFadeHeight={bottomFade} topFadeHeight={80} />

      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={[styles.loadingPill, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={accentColor} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
});
