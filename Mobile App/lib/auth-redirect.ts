import Constants from 'expo-constants';

import { config } from '@/lib/config';

function readEnv(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return process.env[key]?.trim() || extra?.[key];
}

const AUTH_MOBILE_CALLBACK_PATH = '/auth/mobile-callback';
const AUTH_DEEP_LINK_PATH = 'auth/callback';

/** HTTPS redirect registered in Supabase — web page returns users to the native app. */
export function getAuthRedirectUri(): string {
  const explicit = readEnv('EXPO_PUBLIC_AUTH_REDIRECT_URI')?.replace(/\/+$/, '');
  if (explicit) {
    return explicit.includes('/auth/') ? explicit : `${explicit}${AUTH_MOBILE_CALLBACK_PATH}`;
  }

  const publicUrl = readEnv('EXPO_PUBLIC_APP_URL')?.replace(/\/+$/, '');
  if (publicUrl) return `${publicUrl}${AUTH_MOBILE_CALLBACK_PATH}`;

  return `${config.apiUrl.replace(/\/+$/, '')}${AUTH_MOBILE_CALLBACK_PATH}`;
}

/** Prefix for openAuthSessionAsync and deep-link fallbacks. */
export function getAuthRedirectPrefix(): string {
  const redirect = getAuthRedirectUri();
  const lastSlash = redirect.lastIndexOf('/');
  return lastSlash > 0 ? redirect.slice(0, lastSlash) : redirect;
}

export function getAuthDeepLinkPrefix(): string {
  return `mygarage://${AUTH_DEEP_LINK_PATH}`;
}
