import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { fetchGeocodeLocation } from '@/lib/api';
import { isValidPoint, type GeoPoint } from '@/lib/service-request-phase';

const PLACEHOLDER_LOCATION_PATTERN =
  /^(locating|loading|finding|searching|getting your|please wait)/i;

function isResolvableLocationLabel(label: string | undefined): label is string {
  const trimmed = label?.trim();
  if (!trimmed || trimmed.length < 3) return false;
  return !PLACEHOLDER_LOCATION_PATTERN.test(trimmed);
}

export function useResolvedMapDestination(
  initial: GeoPoint | null | undefined,
  locationLabel?: string,
) {
  const [destination, setDestination] = useState<GeoPoint | null>(
    initial && isValidPoint(initial) ? initial : null,
  );
  const [loading, setLoading] = useState(!(initial && isValidPoint(initial)));

  useEffect(() => {
    if (initial && isValidPoint(initial)) {
      setDestination(initial);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      if (isResolvableLocationLabel(locationLabel)) {
        try {
          const geocoded = await fetchGeocodeLocation(locationLabel);
          if (!cancelled && geocoded && isValidPoint(geocoded)) {
            setDestination(geocoded);
            setLoading(false);
            return;
          }
        } catch {
          // try device location next
        }
      }

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (servicesEnabled) {
          const permission = await Location.getForegroundPermissionsAsync();
          if (permission.status === 'granted') {
            const lastKnown = await Location.getLastKnownPositionAsync();
            const position =
              lastKnown ??
              (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
            const { latitude, longitude } = position.coords;
            if (!cancelled && Number.isFinite(latitude) && Number.isFinite(longitude)) {
              setDestination({ lat: latitude, lng: longitude });
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // no device location
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [initial?.lat, initial?.lng, locationLabel]);

  return { destination, loading };
}
