import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { LoadingView } from '@/components/LoadingView';
import { readPendingServiceRequest } from '@/lib/service-request-storage';
import { completeOAuthFromUrl } from '@/lib/googleAuth';
import { getAuthDeepLinkPrefix } from '@/lib/auth-redirect';
import { getSupabase } from '@/lib/supabase';

/** Handles mygarage://auth/callback when the app is opened from the OAuth bridge page. */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      WebBrowser.maybeCompleteAuthSession();
      const supabase = getSupabase();
      if (!supabase) {
        router.replace('/(auth)/login');
        return;
      }

      try {
        const initialUrl = await Linking.getInitialURL();
        const prefix = getAuthDeepLinkPrefix();
        if (!initialUrl?.startsWith(prefix)) {
          router.replace('/(auth)/login');
          return;
        }

        await completeOAuthFromUrl(supabase, initialUrl);

        const pending = await readPendingServiceRequest();
        if (pending) {
          router.replace('/service/complete-pending');
          return;
        }

        router.replace('/(tabs)/profile');
      } catch {
        router.replace('/(auth)/login');
      }
    })();
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LoadingView label="Finishing sign-in" />
    </>
  );
}
