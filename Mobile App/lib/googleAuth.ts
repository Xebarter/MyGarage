import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getAuthDeepLinkPrefix,
  getAuthRedirectPrefix,
  getAuthRedirectUri,
} from '@/lib/auth-redirect';
import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function googleSignInErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/oauth|provider|google|redirect/i.test(message)) {
    return 'Google sign-in failed. Check Supabase redirect URLs include the mobile auth callback.';
  }
  return message || 'Google sign-in failed.';
}

function isAuthCallbackUrl(url: string): boolean {
  const redirectPrefix = getAuthRedirectPrefix();
  const deepLinkPrefix = getAuthDeepLinkPrefix();
  return url.startsWith(redirectPrefix) || url.startsWith(deepLinkPrefix);
}

export async function completeOAuthFromUrl(supabase: SupabaseClient, resultUrl: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(resultUrl);
  if (errorCode) {
    throw new Error(errorCode);
  }

  if (params.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
    if (exchangeError) throw exchangeError;
    return;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
    return;
  }

  throw new Error(googleSignInErrorMessage(new Error('missing_auth_code')));
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');

  const redirectTo = getAuthRedirectUri();
  const redirectPrefix = getAuthRedirectPrefix();
  const deepLinkPrefix = getAuthDeepLinkPrefix();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Could not start Google sign-in.');

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (url: string) => {
      if (settled || !isAuthCallbackUrl(url)) return;
      settled = true;
      subscription.remove();
      void WebBrowser.dismissBrowser();
      void completeOAuthFromUrl(supabase, url).then(resolve).catch(reject);
    };

    const subscription = Linking.addEventListener('url', (event) => {
      finish(event.url);
    });

    void WebBrowser.openAuthSessionAsync(data.url, redirectPrefix).then((result) => {
      if (settled) return;

      if (result.type === 'success' && result.url) {
        finish(result.url);
        return;
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        settled = true;
        subscription.remove();
        reject(new Error('Google sign-in was cancelled.'));
        return;
      }

      settled = true;
      subscription.remove();
      reject(new Error('Google sign-in failed.'));
    });

    // Fallback if the web bridge opens the custom scheme after the auth session closes.
    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl?.startsWith(deepLinkPrefix)) {
        finish(initialUrl);
      }
    });
  });
}

export { googleSignInErrorMessage };
