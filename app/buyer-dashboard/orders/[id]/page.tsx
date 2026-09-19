'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, Package, Truck } from 'lucide-react';

import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageHeader,
  BuyerPageShell,
  BuyerPageSkeleton,
  formatOrderWhen,
  orderStatusPresentation,
  type OrderStatus,
} from '@/components/buyer/buyer-page-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatUgx } from '@/lib/format-ugx';
import { cn } from '@/lib/utils';

type TrackedOrder = {
  id: string;
  status: OrderStatus | string;
  items: Array<{ id: string; productName: string; quantity: number; price: number }>;
  total: number;
  shippingAddress: string;
  trackingNumber: string | null;
  carrier: string | null;
  paidAt: string | null;
  processingAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STEPS = [
  { key: 'paid', label: 'Paid', icon: CheckCircle2 },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'In transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
] as const;

function stepIndex(status: string): number {
  if (status === 'delivered') return 3;
  if (status === 'shipped') return 2;
  if (status === 'processing') return 1;
  if (status === 'pending' || status === 'pending_fulfillment') return 0;
  return -1;
}

function stamp(order: TrackedOrder, key: (typeof STEPS)[number]['key']): string | null {
  if (key === 'paid') return order.paidAt || order.createdAt;
  if (key === 'processing') return order.processingAt;
  if (key === 'shipped') return order.shippedAt;
  if (key === 'delivered') return order.deliveredAt;
  return null;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-UG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BuyerOrderTrackPage() {
  const params = useParams<{ id: string }>();
  const orderId = decodeURIComponent(params.id || '');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!response.ok) {
          if (!cancelled) setOrder(null);
          return;
        }
        const data = (await response.json()) as TrackedOrder;
        if (!cancelled) setOrder(data);
      } catch {
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const currentStep = useMemo(() => (order ? stepIndex(order.status) : -1), [order]);
  const cancelled = order?.status === 'cancelled' || order?.status === 'refunded';

  if (loading) {
    return (
      <BuyerPageShell>
        <BuyerPageSkeleton tiles={0} rows={3} />
      </BuyerPageShell>
    );
  }

  if (!order) {
    return (
      <BuyerPageShell>
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={Package}
            title="Order not found"
            description="This order may still be confirming after payment, or it belongs to another account."
          >
            <Button asChild>
              <Link href="/buyer/orders">Back to orders</Link>
            </Button>
          </BuyerEmptyState>
        </Card>
      </BuyerPageShell>
    );
  }

  const pres = orderStatusPresentation(order.status);

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Tracking"
        title={`Order ${order.id.length > 14 ? `…${order.id.slice(-10)}` : order.id}`}
        description="Follow fulfillment from payment through delivery."
        actions={
          <Button asChild variant="outline" className="h-10 rounded-full">
            <Link href="/buyer/orders">
              <ArrowLeft className="h-4 w-4" />
              All orders
            </Link>
          </Button>
        }
      />

      <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('h-7 border px-2.5', pres.badgeClass)}>
            {pres.label}
          </Badge>
          <p className="text-sm text-muted-foreground">Updated {formatOrderWhen(order.updatedAt)}</p>
        </div>

        {cancelled ? (
          <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            This order is {pres.label.toLowerCase()}. Contact support if you need help.
          </p>
        ) : (
          <ol className="mt-6 grid gap-3 sm:grid-cols-4">
            {STEPS.map((step, index) => {
              const done = currentStep >= index;
              const active = currentStep === index;
              const when = stamp(order, step.key);
              const Icon = step.icon;
              return (
                <li
                  key={step.key}
                  className={cn(
                    'rounded-2xl border px-4 py-4',
                    done ? 'border-primary/25 bg-primary/5' : 'border-border/70 bg-muted/20',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl',
                      done ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className={cn('mt-3 text-sm font-bold', active && 'text-primary')}>{step.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {when ? formatStamp(when) : done ? 'Complete' : 'Waiting'}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {order.trackingNumber ? (
          <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tracking</p>
            <p className="font-semibold text-foreground">
              {order.carrier ? `${order.carrier} · ` : ''}
              {order.trackingNumber}
            </p>
          </div>
        ) : null}
      </Card>

      <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
        <h2 className="text-base font-bold tracking-tight">Items</h2>
        <ul className="mt-3 divide-y divide-border/60">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
              </div>
              <span className="font-semibold tabular-nums">{formatUgx(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-border/60 pt-4 text-sm font-bold">
          <span>Total</span>
          <span>{formatUgx(Number(order.total))}</span>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/40 px-3.5 py-3 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery</p>
            <p>{order.shippingAddress || 'Not provided'}</p>
          </div>
        </div>
      </Card>
    </BuyerPageShell>
  );
}
