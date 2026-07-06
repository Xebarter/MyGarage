import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getGoogleMapsApiKey } from '@/lib/maps';

/** Android Expo Go cannot render react-native-maps tiles (SDK 53+). */
function isExpoGoAndroid(): boolean {
  return Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';
}

/** Standalone Android builds crash without a configured Google Maps API key. */
function isAndroidWithoutMapsKey(): boolean {
  return Platform.OS === 'android' && !getGoogleMapsApiKey();
}

export function shouldUseWebMapFallback(): boolean {
  return isExpoGoAndroid() || isAndroidWithoutMapsKey();
}

export function canUseNativeMapView(): boolean {
  return !shouldUseWebMapFallback();
}
