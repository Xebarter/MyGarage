'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { XCircle } from 'lucide-react';

export default function PaymentFailurePage() {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    search.forEach((value, key) => {
      next[key] = value;
    });
    setParams(next);
  }, []);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
          <h1 className="mb-2 text-3xl font-bold text-foreground">Payment did not complete</h1>
          <p className="text-muted-foreground">
            No money was taken, or the payment was declined. You can try again from checkout or contact support if the
            problem continues.
          </p>
          {params.checkoutId ? (
            <p className="mt-4 text-xs text-muted-foreground">Reference: {params.checkoutId}</p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/checkout"
              className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try checkout again
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
