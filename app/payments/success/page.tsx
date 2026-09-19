'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CheckCircle2, Loader2 } from 'lucide-react';

type TrackedOrder = { id: string };

export default function PaymentSuccessPage() {
  const [params, setParams] = useState<Record<string, string> | null>(null);
  const [subscriptionActivated, setSubscriptionActivated] = useState(false);
  const [productOrder, setProductOrder] = useState<TrackedOrder | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    search.forEach((value, key) => {
      next[key] = value;
    });
    setParams(next);
  }, []);

  const checkoutId = params?.checkoutId;
  const servicePaymentId = params?.servicePaymentId;
  const isSubscription = params?.kind === 'subscription';
  const isProductCheckout = Boolean(checkoutId) && !isSubscription && !servicePaymentId;

  useEffect(() => {
    if (!checkoutId || !isSubscription || subscriptionActivated) return;
    void fetch('/api/buyer/subscriptions/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId }),
    })
      .then(() => setSubscriptionActivated(true))
      .catch(() => undefined);
  }, [checkoutId, isSubscription, subscriptionActivated]);

  useEffect(() => {
    if (!isProductCheckout || !checkoutId) return;
    let cancelled = false;
    setLookingUp(true);

    const lookup = async () => {
      const response = await fetch(`/api/orders?checkoutId=${encodeURIComponent(checkoutId)}`);
      if (!response.ok) return null;
      return (await response.json()) as TrackedOrder;
    };

    void (async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const order = await lookup();
          if (cancelled) return;
          if (order?.id) {
            setProductOrder(order);
            setLookingUp(false);
            return;
          }
        } catch {
          /* webhook may still be materializing */
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      if (!cancelled) setLookingUp(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutId, isProductCheckout]);

  const secondaryHref = isSubscription
    ? '/buyer/profile?tab=subscriptions'
    : productOrder
      ? `/buyer/orders/${productOrder.id}`
      : isProductCheckout
        ? '/buyer/orders'
        : '/buyer/services';
  const secondaryLabel = isSubscription
    ? 'View membership'
    : isProductCheckout
      ? 'Track order'
      : 'My services';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-600" />
          <h1 className="mb-2 text-3xl font-bold text-foreground">Payment received</h1>
          <p className="text-muted-foreground">
            {!params
              ? 'Confirming your payment…'
              : isSubscription
                ? 'Your membership is being activated. You can manage it from your profile.'
                : isProductCheckout
                  ? lookingUp
                    ? 'Payment is confirmed. We are preparing your order for tracking…'
                    : productOrder
                      ? 'Your order is confirmed. You can track fulfillment from your account.'
                      : 'Payment is confirmed. Your order will appear in My Orders in a moment.'
                  : 'Thank you. If you were paying for a service, you can follow it from your account.'}
          </p>
          {(checkoutId || servicePaymentId) && (
            <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground">
              {checkoutId ? <span className="block">Checkout: {checkoutId}</span> : null}
              {servicePaymentId ? <span className="block">Service payment: {servicePaymentId}</span> : null}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to home
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted/40"
            >
              {lookingUp || !params ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {params ? secondaryLabel : 'Continue'}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
