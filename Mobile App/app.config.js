const path = require('path');
const fs = require('fs');

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] == null) {
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env files
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '..', '.env'));

const appJson = require('./app.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  '';

const publicApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || '';
const publicAppUrl = process.env.EXPO_PUBLIC_APP_URL?.trim() || '';
const publicSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const publicSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

if (!publicSupabaseUrl || !publicSupabaseAnonKey) {
  console.warn(
    '[MyGarage] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing at build time. ' +
      'Sign-in will be disabled in this build. For EAS builds run: eas env:push preview --path .env',
  );
}

if (!googleMapsApiKey) {
  console.warn(
    '[MyGarage] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing at build time. ' +
      'Android will use WebView maps; native MapView may crash without this key. For EAS: eas env:push preview --path .env',
  );
}

const basePlugins = appJson.expo.plugins ?? [];
const mapsPlugin = googleMapsApiKey
  ? [
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
          iosGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ]
  : [];

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...appJson.expo,
  plugins: [...basePlugins, ...mapsPlugin],
  android: {
    ...appJson.expo.android,
    config: {
      ...appJson.expo.android?.config,
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  ios: {
    ...appJson.expo.ios,
    config: {
      ...appJson.expo.ios?.config,
      googleMapsApiKey,
    },
  },
  extra: {
    ...appJson.expo.extra,
    EXPO_PUBLIC_API_URL: publicApiUrl,
    EXPO_PUBLIC_APP_URL: publicAppUrl,
    EXPO_PUBLIC_SUPABASE_URL: publicSupabaseUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: publicSupabaseAnonKey,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
    eas: {
      projectId: 'b45adaea-4bda-4791-926e-08921a937e2f',
    },
  },
};
