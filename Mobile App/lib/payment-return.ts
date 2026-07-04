import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { config } from '@/lib/config';

export type PaymentReturnResult =
  | { kind: 'success'; checkoutId: string }
  | { kind: 'failed'; checkoutId: string; cancelled: boolean };

export type PaymentSessionResult =
  | PaymentReturnResult
  | { kind: 'dismissed'; checkoutId: string }
  | null;

/** Prefix matched by openAuthSessionAsync — must cover every Paytota redirect path. */
export function getPaymentReturnUrlPrefix(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().replace(/\/+$/, '');
  return `${config.apiUrl.replace(/\/+$/, '')}/payments`;
}

export function resolvePaymentReturn(
  resultUrl: string,
  fallbackCheckoutId: string,
): PaymentReturnResult | null {
  const { path, queryParams } = Linking.parse(resultUrl);
  const returnedCheckoutId =
    typeof queryParams?.checkoutId === 'string' ? queryParams.checkoutId : fallbackCheckoutId;
  const status = typeof queryParams?.status === 'string' ? queryParams.status.toLowerCase() : null;
  const cancelled = queryParams?.cancelled === '1' || status === 'cancel';
  const normalizedPath = path?.replace(/^\/+/, '') ?? '';

  if (normalizedPath === 'payments/mobile-return') {
    if (status === 'success') {
      return { kind: 'success', checkoutId: returnedCheckoutId };
    }
    return { kind: 'failed', checkoutId: returnedCheckoutId, cancelled };
  }

  if (normalizedPath === 'payments/success') {
    return { kind: 'success', checkoutId: returnedCheckoutId };
  }

  if (normalizedPath === 'payments/failure') {
    return { kind: 'failed', checkoutId: returnedCheckoutId, cancelled: false };
  }

  if (normalizedPath === 'payments/cancel') {
    return { kind: 'failed', checkoutId: returnedCheckoutId, cancelled: true };
  }

  if (normalizedPath === 'checkout/complete') {
    return { kind: 'success', checkoutId: returnedCheckoutId };
  }

  if (normalizedPath === 'checkout/failed') {
    return { kind: 'failed', checkoutId: returnedCheckoutId, cancelled };
  }

  return null;
}

export async function openPaytotaPaymentSession(
  checkoutUrl: string,
  checkoutId: string,
  returnUrlPrefix?: string,
): Promise<PaymentSessionResult> {
  const prefix = getPaymentReturnUrlPrefix(returnUrlPrefix);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: PaymentSessionResult) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      void WebBrowser.dismissBrowser();
      resolve(result);
    };

    const subscription = Linking.addEventListener('url', (event) => {
      const next = resolvePaymentReturn(event.url, checkoutId);
      if (next) finish(next);
    });

    void WebBrowser.openAuthSessionAsync(checkoutUrl, prefix).then((result) => {
      if (settled) return;

      if (result.type === 'success' && result.url) {
        const fromUrl = resolvePaymentReturn(result.url, checkoutId);
        if (fromUrl) {
          finish(fromUrl);
          return;
        }
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        finish({ kind: 'dismissed', checkoutId });
        return;
      }

      finish(null);
    });
  });
}

export function buildCheckoutFailedParams(
  checkoutId: string,
  cancelled = false,
): { checkoutId: string; cancelled?: string } {
  return {
    checkoutId,
    ...(cancelled ? { cancelled: '1' } : {}),
  };
}
