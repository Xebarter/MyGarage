import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import { config } from '@/lib/config';

export const KAMPALA_REGION = {
  latitude: 0.3476,
  longitude: 32.5825,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

export function getGoogleMapsApiKey(): string {
  return config.googleMapsApiKey;
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/** Google provider only in standalone/dev builds with an API key. Expo Go must use the default provider. */
export function getMapProvider() {
  if (isExpoGo()) {
    return PROVIDER_DEFAULT;
  }
  if (Platform.OS === 'android' && getGoogleMapsApiKey()) {
    return PROVIDER_GOOGLE;
  }
  return PROVIDER_DEFAULT;
}

export const MAP_EDGE_PADDING = {
  top: 96,
  right: 40,
  bottom: 280,
  left: 40,
};
