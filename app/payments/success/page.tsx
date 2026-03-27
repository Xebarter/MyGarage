'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    search.forEach((value, key) => {
      next[key] = value;
    });
    setParams(next);
  }, []);

  const checkoutId = params.checkoutId;
  const servicePaymentId = params.servicePaymentId;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-600" />
          <h1 className="mb-2 text-3xl font-bold text-foreground">Payment received</h1>
          <p className="text-muted-foreground">
            Thank you. If you were paying for an order, we are confirming it now. You will receive updates by email when
            fulfillment starts.
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
              href="/buyer/services"
              className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted/40"
            >
              My services
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
