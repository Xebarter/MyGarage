'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import {
  BUYER_SERVICE_COMPLETE_PENDING_PATH,
  clearPendingBuyerServiceRequest,
  readPendingBuyerServiceRequest,
} from '@/lib/buyer-service-pending';
import { Loader2 } from 'lucide-react';

export default function CompletePendingServiceRequestPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const pending = readPendingBuyerServiceRequest();
      if (!pending) {
        router.replace('/buyer/services');
        return;
      }

      const customerId = (typeof window !== 'undefined' && localStorage.getItem('currentBuyerId')?.trim()) || '';
      if (!customerId) {
        router.replace(
          `/auth?role=buyer&next=${encodeURIComponent(BUYER_SERVICE_COMPLETE_PENDING_PATH)}`,
        );
        return;
      }

      try {
        const response = await fetch('/api/buyer/service-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            category: pending.category,
            service: pending.service,
            location: pending.location,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error || 'Could not submit your request.');
          return;
        }

        const raw = (await response.json()) as { id?: string };
        const id = raw.id ? String(raw.id) : '';
        if (!id) {
          setError('Request created but missing id. Please check My Service Requests.');
          return;
        }

        clearPendingBuyerServiceRequest();
        router.replace(`/buyer/services/track/${encodeURIComponent(id)}`);
      } catch {
        setError('Something went wrong. Please try again from Services.');
      }
    };

    void run();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md space-y-4 p-6 text-center shadow-sm">
        {!error ? (
          <div className="flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : null}
        <p className="text-sm text-foreground">{error ?? 'Finishing your request…'}</p>
        {error ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/buyer/services"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Back to services
            </Link>
            <Link
              href={`/auth?role=buyer&next=${encodeURIComponent(BUYER_SERVICE_COMPLETE_PENDING_PATH)}`}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
            >
              Sign in again
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">This only takes a moment.</p>
        )}
      </Card>
    </div>
  );
}
