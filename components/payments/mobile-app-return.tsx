'use client';

import { useEffect, useMemo, useState } from 'react';

type MobileAppPaymentReturnProps = {
  status: 'success' | 'failure' | 'cancel';
  checkoutId?: string;
  kind?: string;
  servicePaymentId?: string;
  requestId?: string;
};

function buildDeepLink({
  status,
  checkoutId,
  kind,
  servicePaymentId,
  requestId,
}: MobileAppPaymentReturnProps): string {
  const params = new URLSearchParams();
  if (checkoutId) params.set('checkoutId', checkoutId);
  if (kind) params.set('kind', kind);
  if (servicePaymentId) params.set('servicePaymentId', servicePaymentId);
  if (requestId) params.set('requestId', requestId);
  if (status === 'cancel') params.set('cancelled', '1');

  const path = status === 'success' ? 'checkout/complete' : 'checkout/failed';
  const query = params.toString();
  return `mygarage://${path}${query ? `?${query}` : ''}`;
}

function isNativeMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Sends native-app checkout users back into MyGarage after Paytota redirects. */
export function MobileAppPaymentReturn(props: MobileAppPaymentReturnProps) {
  const deepLink = useMemo(() => buildDeepLink(props), [
    props.status,
    props.checkoutId,
    props.kind,
    props.servicePaymentId,
    props.requestId,
  ]);
  const [native, setNative] = useState(false);

  useEffect(() => {
    const payload = {
      source: 'mygarage-payment',
      status: props.status,
      checkoutId: props.checkoutId ?? '',
      kind: props.kind ?? '',
      requestId: props.requestId ?? '',
      cancelled: props.status === 'cancel',
    };
    try {
      window.opener?.postMessage(payload, '*');
    } catch {
      /* opener may be cross-origin or missing */
    }
  }, [props.status, props.checkoutId, props.kind, props.requestId]);

  useEffect(() => {
    const onPhone = isNativeMobileBrowser();
    setNative(onPhone);
    if (!onPhone) return;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.display = 'none';
    iframe.src = deepLink;
    document.body.appendChild(iframe);

    const timer = window.setTimeout(() => {
      iframe.remove();
    }, 900);

    return () => {
      window.clearTimeout(timer);
      iframe.remove();
    };
  }, [deepLink]);

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-muted-foreground">
        Close this tab and return to MyGarage to continue.
      </p>
      {native ? (
        <a
          href={deepLink}
          className="inline-flex rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open MyGarage app
        </a>
      ) : null}
    </div>
  );
}

export function shouldReturnToMobileApp(searchParams: URLSearchParams): boolean {
  return searchParams.get('mobile') === '1';
}
