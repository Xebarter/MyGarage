'use client';

import { useEffect } from 'react';

type MobileAppPaymentReturnProps = {
  status: 'success' | 'failure' | 'cancel';
  checkoutId?: string;
};

function buildDeepLink(status: MobileAppPaymentReturnProps['status'], checkoutId?: string): string {
  const params = new URLSearchParams();
  if (checkoutId) params.set('checkoutId', checkoutId);
  if (status === 'cancel') params.set('cancelled', '1');

  const path = status === 'success' ? 'checkout/complete' : 'checkout/failed';
  const query = params.toString();
  return `mygarage://${path}${query ? `?${query}` : ''}`;
}

/** Sends mobile checkout users back into the native app after Paytota redirects. */
export function MobileAppPaymentReturn({ status, checkoutId }: MobileAppPaymentReturnProps) {
  const deepLink = buildDeepLink(status, checkoutId);

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

export function shouldReturnToMobileApp(searchParams: URLSearchParams): boolean {
  return searchParams.get('mobile') === '1';
}
