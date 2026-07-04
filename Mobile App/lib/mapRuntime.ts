import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Android Expo Go cannot render react-native-maps tiles (SDK 53+). Use WebView maps instead. */
export function shouldUseWebMapFallback(): boolean {
  return Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';
}
