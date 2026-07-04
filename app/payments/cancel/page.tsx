'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MobileAppPaymentReturn, shouldReturnToMobileApp } from '@/components/payments/mobile-app-return';
import { CircleSlash } from 'lucide-react';

export default function PaymentCancelPage() {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    search.forEach((value, key) => {
      next[key] = value;
    });
    setParams(next);
  }, []);

  const returnToApp = shouldReturnToMobileApp(new URLSearchParams(params));

  if (returnToApp) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
          <CircleSlash className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold text-foreground">Payment cancelled</h1>
          <p className="text-sm text-muted-foreground">Returning you to the MyGarage app…</p>
          <MobileAppPaymentReturn status="cancel" checkoutId={params.checkoutId} />
        </div>
      </main>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <CircleSlash className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-3xl font-bold text-foreground">Payment cancelled</h1>
          <p className="text-muted-foreground">You left the payment page without completing checkout. Your cart is unchanged.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/cart"
              className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Return to cart
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted/40"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
