'use client';

import { useEffect } from 'react';

type MobileAppAuthReturnProps = {
  /** Custom scheme deep link, e.g. `mygarage://auth/callback` or `ug.mygarage.services://login-callback`. */
  deepLinkBase: string;
  appLabel?: string;
};

function buildAuthDeepLink(base: string, search: string, hash: string): string {
  const normalized = base.replace(/\/+$/, '');
  if (hash && hash.length > 1) {
    return `${normalized}${hash.startsWith('#') ? hash : `#${hash}`}`;
  }
  const query = search.startsWith('?') ? search : search ? `?${search}` : '';
  return `${normalized}${query}`;
}

/** Sends mobile OAuth users back into a native app after Supabase redirects to this HTTPS page. */
export function MobileAppAuthReturn({
  deepLinkBase,
  appLabel = 'MyGarage app',
}: MobileAppAuthReturnProps) {
  const deepLink =
    typeof window === 'undefined'
      ? deepLinkBase
      : buildAuthDeepLink(deepLinkBase, window.location.search, window.location.hash);

  useEffect(() => {
    window.location.replace(deepLink);
  }, [deepLink]);

  return (
    <a
      href={deepLink}
      className="mt-6 inline-flex rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      Open {appLabel}
    </a>
  );
}
