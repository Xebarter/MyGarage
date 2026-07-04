'use client';

import { useMemo } from 'react';

import {
  MobileAppPaymentReturn,
} from '@/components/payments/mobile-app-return';

type MobileReturnStatus = 'success' | 'failure' | 'cancel';

export default function MobilePaymentReturnPage() {
  const { status, checkoutId, cancelled } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { status: 'failure' as const, checkoutId: '', cancelled: false };
    }

    const search = new URLSearchParams(window.location.search);
    const rawStatus = search.get('status')?.trim().toLowerCase();
    const nextStatus: MobileReturnStatus =
      rawStatus === 'success' || rawStatus === 'cancel' || rawStatus === 'failure' ? rawStatus : 'failure';
    const nextCheckoutId = search.get('checkoutId')?.trim() ?? '';
    const nextCancelled = search.get('cancelled') === '1' || nextStatus === 'cancel';

    return {
      status: nextStatus,
      checkoutId: nextCheckoutId,
      cancelled: nextCancelled,
    };
  }, []);

  const title =
    status === 'success'
      ? 'Payment received'
      : status === 'cancel' || cancelled
        ? 'Payment cancelled'
        : 'Payment not completed';

  const message =
    status === 'success'
      ? 'Returning you to the MyGarage app…'
      : 'Returning you to the MyGarage app…';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {checkoutId ? (
          <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground">
            Reference: {checkoutId}
          </p>
        ) : null}
        <MobileAppPaymentReturn status={status} checkoutId={checkoutId || undefined} />
      </div>
    </main>
  );
}
