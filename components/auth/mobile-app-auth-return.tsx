'use client';

import { useEffect } from 'react';

function buildAuthDeepLink(search: string, hash: string): string {
  if (hash && hash.length > 1) {
    return `mygarage://auth/callback${hash.startsWith('#') ? hash : `#${hash}`}`;
  }
  const query = search.startsWith('?') ? search : search ? `?${search}` : '';
  return `mygarage://auth/callback${query}`;
}

/** Sends mobile OAuth users back into the native app after Supabase redirects. */
export function MobileAppAuthReturn() {
  const deepLink =
    typeof window === 'undefined'
      ? 'mygarage://auth/callback'
      : buildAuthDeepLink(window.location.search, window.location.hash);

  useEffect(() => {
    window.location.replace(deepLink);
  }, [deepLink]);

  return (
    <a
      href={deepLink}
      className="mt-6 inline-flex rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      Open MyGarage app
    </a>
  );
}
