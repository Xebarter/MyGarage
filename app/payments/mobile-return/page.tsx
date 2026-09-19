'use client';

import { useEffect, useState } from 'react';

import { MobileAppPaymentReturn } from '@/components/payments/mobile-app-return';

type MobileReturnStatus = 'success' | 'failure' | 'cancel';

type ParsedReturn = {
  status: MobileReturnStatus;
  checkoutId: string;
  cancelled: boolean;
  kind: string;
  servicePaymentId: string;
  requestId: string;
};

function parseReturnFromLocation(): ParsedReturn {
  const search = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const rawStatus = search.get('status')?.trim().toLowerCase();
  const nextStatus: MobileReturnStatus =
    rawStatus === 'success' || rawStatus === 'cancel' || rawStatus === 'failure' ? rawStatus : 'failure';
  return {
    status: nextStatus,
    checkoutId: search.get('checkoutId')?.trim() ?? '',
    cancelled: search.get('cancelled') === '1' || nextStatus === 'cancel',
    kind: search.get('kind')?.trim() ?? '',
    servicePaymentId: search.get('servicePaymentId')?.trim() ?? '',
    requestId: search.get('requestId')?.trim() ?? '',
  };
}

export default function MobilePaymentReturnPage() {
  const [parsed, setParsed] = useState<ParsedReturn | null>(null);

  useEffect(() => {
    setParsed(parseReturnFromLocation());
  }, []);

  useEffect(() => {
    if (!parsed || parsed.status !== 'success' || parsed.kind !== 'subscription' || !parsed.checkoutId) {
      return;
    }
    void fetch('/api/buyer/subscriptions/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId: parsed.checkoutId }),
    }).catch(() => undefined);
  }, [parsed]);

  const status = parsed?.status ?? 'failure';
  const cancelled = parsed?.cancelled ?? false;
  const checkoutId = parsed?.checkoutId ?? '';
  const kind = parsed?.kind ?? '';
  const servicePaymentId = parsed?.servicePaymentId ?? '';
  const requestId = parsed?.requestId ?? '';

  const title = !parsed
    ? 'Returning to MyGarage'
    : status === 'success'
      ? 'Payment received'
      : status === 'cancel' || cancelled
        ? 'Payment cancelled'
        : 'Payment not completed';

  const detail = !parsed
    ? 'Finishing up…'
    : status === 'success'
      ? 'You can close this tab and go back to MyGarage.'
      : status === 'cancel' || cancelled
        ? 'No charge was made. Close this tab and try again in MyGarage.'
        : 'The payment did not go through. Close this tab and try again in MyGarage.';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {checkoutId ? (
          <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground">
            Reference: {checkoutId}
          </p>
        ) : null}
        {parsed ? (
          <MobileAppPaymentReturn
            status={status}
            checkoutId={checkoutId || undefined}
            kind={kind || undefined}
            servicePaymentId={servicePaymentId || undefined}
            requestId={requestId || undefined}
          />
        ) : null}
      </div>
    </main>
  );
}
