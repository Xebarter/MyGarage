import Constants from 'expo-constants';
import { Platform } from 'react-native';

function readEnv(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return process.env[key]?.trim() || extra?.[key];
}

/** Resolve the Next.js API base URL (products, buyer profile, etc.). */
function resolveApiUrl(): string {
  const fromEnv = readEnv('EXPO_PUBLIC_API_URL');

  if (__DEV__) {
    const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (metroHost) {
      if (metroHost === 'localhost' || metroHost === '127.0.0.1') {
        // iOS simulator / web — localhost reaches the dev machine.
        if (Platform.OS === 'android') {
          return 'http://10.0.2.2:3000';
        }
        return 'http://localhost:3000';
      }
      // Physical device / Expo Go — use the same LAN IP as the Metro bundler.
      return `http://${metroHost}:3000`;
    }
  }

  return fromEnv?.trim() || 'http://localhost:3000';
}

export const config = {
  apiUrl: resolveApiUrl(),
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL') ?? '',
  supabaseAnonKey: readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ?? '',
  googleMapsApiKey:
    readEnv('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY') ?? readEnv('GOOGLE_MAPS_API_KEY') ?? '',
  appName: 'MyGarage',
  tagline: 'Car parts & automotive services in Uganda',
};

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}
