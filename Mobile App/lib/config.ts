import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ManifestLike = {
  debuggerHost?: string;
  hostUri?: string;
  extra?: {
    expoGo?: { debuggerHost?: string };
    expoClient?: { hostUri?: string };
  };
};

function readEnv(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  for (const value of [process.env[key], extra?.[key]]) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Metro / Expo Go host (e.g. 10.31.241.119) — evaluated at request time, not module load. */
function getMetroDevHost(): string | undefined {
  const manifest = Constants.manifest as ManifestLike | null;
  const manifest2 = Constants.manifest2 as { extra?: ManifestLike['extra'] } | null;

  const rawCandidates = [
    Constants.expoConfig?.hostUri,
    manifest2?.extra?.expoClient?.hostUri,
    manifest2?.extra?.expoGo?.debuggerHost,
    manifest?.debuggerHost,
    manifest?.hostUri,
    Constants.linkingUri,
  ];

  for (const raw of rawCandidates) {
    if (!raw) continue;
    try {
      const host = raw.includes('://') ? new URL(raw).hostname : raw.split(':')[0]?.trim();
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    } catch {
      const host = raw.split(':')[0]?.trim();
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  }

  return undefined;
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
    // Prefer the Metro bundler host — same IP the phone uses for Expo (port 3000 for Next.js).
    const metroHost = getMetroDevHost();
    if (metroHost) {
      return `http://${metroHost}:3000`;
    }

    if (fromEnv) {
      return rewriteLocalhostForAndroid(stripTrailingSlash(fromEnv));
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

let devApiUrlLogged = false;

export function getApiUrl(): string {
  const url = resolveApiUrl();
  if (__DEV__ && !devApiUrlLogged) {
    devApiUrlLogged = true;
    console.info(`[MyGarage] API base URL: ${url}`);
  }
  return url;
}

export const config = {
  get apiUrl() {
    return getApiUrl();
  },
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
