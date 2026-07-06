import Constants from 'expo-constants';
import { Platform } from 'react-native';

function readEnv(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const fromExtra = extra?.[key]?.trim();
  const fromProcess = process.env[key]?.trim();
  return fromProcess || fromExtra || undefined;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function isLocalUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:') return false;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '10.0.2.2' ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname)
    );
  } catch {
    return false;
  }
}

function rewriteLocalhostForAndroid(url: string): string {
  if (Platform.OS !== 'android') return url;
  return url.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2');
}

/** Resolve the Next.js API base URL (products, buyer profile, etc.). */
function resolveApiUrl(): string {
  const fromEnv = readEnv('EXPO_PUBLIC_API_URL');
  const appUrl = readEnv('EXPO_PUBLIC_APP_URL');

  if (__DEV__) {
    if (fromEnv) {
      return rewriteLocalhostForAndroid(stripTrailingSlash(fromEnv));
    }

    const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (metroHost) {
      if (metroHost === 'localhost' || metroHost === '127.0.0.1') {
        if (Platform.OS === 'android') {
          return 'http://10.0.2.2:3000';
        }
        return 'http://localhost:3000';
      }
      return `http://${metroHost}:3000`;
    }

    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }

  // Production / release builds: HTTPS only — Android blocks cleartext localhost.
  if (fromEnv && !isLocalUrl(fromEnv)) {
    return stripTrailingSlash(fromEnv);
  }
  if (appUrl) {
    return stripTrailingSlash(appUrl);
  }

  return stripTrailingSlash(appUrl || fromEnv || 'https://mygarage.ug');
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
