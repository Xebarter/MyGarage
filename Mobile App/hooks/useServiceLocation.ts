import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatGeocodedAddresses } from '@/lib/formatAddress';

export type LocationStatus = 'idle' | 'detecting' | 'ready' | 'error';

async function resolvePlaceLabel(latitude: number, longitude: number): Promise<string> {
  try {
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    const formatted = formatGeocodedAddresses(addresses);
    if (formatted) return formatted;
  } catch {
    // fall through to coordinate fallback
  }
  return `Pinned location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
}

export function useServiceLocation(autoDetect = true) {
  const [useDetectedLocation, setUseDetectedLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationMessage, setLocationMessage] = useState('Detecting your current location...');
  const [locationAccuracyLabel, setLocationAccuracyLabel] = useState('');
  const [placeLabel, setPlaceLabel] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [biasOrigin, setBiasOrigin] = useState<{ lat: number; lng: number } | null>(null);

  const refreshBiasOrigin = useCallback(async (requestPermission = false) => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) return;

      let granted = (await Location.getForegroundPermissionsAsync()).status === 'granted';
      if (!granted && requestPermission) {
        granted = (await Location.requestForegroundPermissionsAsync()).status === 'granted';
      }
      if (!granted) return;

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        const { latitude, longitude } = lastKnown.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setBiasOrigin({ lat: latitude, lng: longitude });
          return;
        }
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = position.coords;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setBiasOrigin({ lat: latitude, lng: longitude });
      }
    } catch {
      // Suggestions fall back to Kampala-centered bias.
    }
  }, []);

  useEffect(() => {
    void refreshBiasOrigin(false);
  }, [refreshBiasOrigin]);

  const updateManualLocation = useCallback((value: string) => {
    setManualLocation(value);
    setManualCoords(null);
  }, []);

  const selectManualAddress = useCallback((label: string, lat: number, lng: number) => {
    setManualLocation(label);
    setManualCoords({ lat, lng });
  }, []);

  const detectCurrentLocation = useCallback(async () => {
    setLocationStatus('detecting');
    setLocationMessage('Detecting your current location...');
    setLocationAccuracyLabel('');
    setPlaceLabel('');

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationStatus('error');
        setCoords(null);
        setLocationMessage('Location services are off. Turn them on or enter your address manually.');
        setUseDetectedLocation(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('error');
        setCoords(null);
        setLocationMessage('Location access denied. Enable it in settings or enter your address manually.');
        setUseDetectedLocation(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() =>
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      );

      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('location_unavailable');
      }

      setCoords({ lat: latitude, lng: longitude });
      setLocationAccuracyLabel(
        accuracy != null && Number.isFinite(accuracy)
          ? `Approx. accuracy: ${Math.round(accuracy)}m`
          : '',
      );

      const label = await resolvePlaceLabel(latitude, longitude);
      setPlaceLabel(label);
      setLocationMessage('Your location is pinned on the map.');
      setLocationStatus('ready');
    } catch {
      setLocationStatus('error');
      setPlaceLabel('');
      setCoords(null);
      setLocationMessage('Could not detect location. Retry or enter your address manually.');
    }
  }, []);

  useEffect(() => {
    if (autoDetect && useDetectedLocation && locationStatus === 'idle') {
      void detectCurrentLocation();
    }
  }, [autoDetect, detectCurrentLocation, locationStatus, useDetectedLocation]);

  const activeCoords = useMemo(
    () => (useDetectedLocation ? coords : manualCoords),
    [coords, manualCoords, useDetectedLocation],
  );

  const resolvedLocation = useMemo(
    () => (useDetectedLocation ? placeLabel.trim() : manualLocation.trim()),
    [useDetectedLocation, manualLocation, placeLabel],
  );

  const canSubmitLocation = useMemo(() => {
    if (useDetectedLocation) {
      return locationStatus === 'ready' && coords != null && placeLabel.trim().length > 0;
    }
    return manualLocation.trim().length >= 3;
  }, [coords, locationStatus, manualLocation, placeLabel, useDetectedLocation]);

  return {
    useDetectedLocation,
    setUseDetectedLocation,
    locationStatus,
    locationMessage,
    locationAccuracyLabel,
    placeLabel,
    manualLocation,
    setManualLocation: updateManualLocation,
    selectManualAddress,
    detectCurrentLocation,
    refreshBiasOrigin,
    resolvedLocation,
    coords: activeCoords,
    biasOrigin,
    canSubmitLocation,
  };
}
