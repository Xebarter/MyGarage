"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Google sign-in via Supabase OAuth (redirect flow).
 * Configure Google under Supabase → Authentication → Providers.
 */
export async function redirectToGoogleSignIn(callbackPath: string): Promise<void> {
  const supabase = createClient();
  const origin = window.location.origin;
  const redirectTo = `${origin}${callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    window.location.assign(data.url);
  }
}
