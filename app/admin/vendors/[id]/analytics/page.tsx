'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Vendor } from '@/lib/db';
import { ArrowLeft, DollarSign, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AnalyticsMetricCard,
  AnalyticsPageSkeleton,
  AnalyticsSectionCard,
} from '@/components/admin/admin-analytics-ui';

interface VendorAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

function formatUgx(n: number) {
  return `UGX ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function statusLabel(raw: string) {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function VendorAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id || !String(id).trim()) {
        setLoading(false);
        setError('Missing vendor id.');
        return;
      }

      try {
        setError(null);
        const res = await fetch(`/api/admin/vendors/${encodeURIComponent(String(id))}/analytics`, {
          cache: 'no-store',
        });

        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          vendor?: Vendor;
          analytics?: VendorAnalytics;
        };

        if (!res.ok) {
          throw new Error(body.error || `Request failed (${res.status})`);
        }

        if (!body.vendor || !body.analytics) {
          throw new Error('Invalid response from server');
        }

        setVendor(body.vendor);
        setAnalytics(body.analytics);
      } catch (e) {
        console.error('Failed to fetch vendor analytics:', e);
        setError(e instanceof Error ? e.message : 'Could not load vendor analytics.');
        setVendor(null);
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const statusTotal = useMemo(() => {
    if (!analytics) return 0;
    return Object.values(analytics.ordersByStatus).reduce((a, b) => a + b, 0);
  }, [analytics]);

  if (loading) {
    return <AnalyticsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <p className="text-lg font-semibold tracking-tight text-foreground">Couldn&apos;t load vendor analytics</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
        <Button variant="outline" className="rounded-full" asChild>
          <Link href={id ? `/admin/vendors/${id}` : '/admin/vendors'}>Back to vendor</Link>
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-6 py-14 text-center text-sm text-muted-foreground shadow-sm">
        No analytics available for this vendor.
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,oklch(0.6_0.14_162_/_0.08),transparent_60%)]"
        aria-hidden
      />
      <div className="overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/85 px-6 py-6 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_18px_50px_rgba(24,40,28,0.06)] ring-1 ring-black/[0.03] dark:ring-white/[0.05] md:px-8 md:py-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Vendor analytics</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{vendor?.name ?? 'Vendor'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Performance snapshot: revenue, orders, catalog size, and status mix for this seller.
            </p>
          </div>
          <Button variant="outline" size="sm" className="w-fit rounded-full border-border/80" asChild>
            <Link href={`/admin/vendors/${id}`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Overview
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          label="Total revenue"
          value={formatUgx(analytics.totalRevenue)}
          sub="Attributed product revenue"
          icon={DollarSign}
          accent="emerald"
        />
        <AnalyticsMetricCard
          label="Orders"
          value={analytics.totalOrders.toLocaleString()}
          sub="Recorded product orders"
          icon={ShoppingBag}
        />
        <AnalyticsMetricCard
          label="Products"
          value={analytics.totalProducts.toLocaleString()}
          sub="Listings on record"
          icon={Package}
          accent="amber"
        />
        <AnalyticsMetricCard
          label="Avg. order value"
          value={formatUgx(analytics.averageOrderValue)}
          sub="Mean revenue per order"
          icon={TrendingUp}
          accent="sky"
        />
      </div>

      <AnalyticsSectionCard
        title="Orders by status"
        description="Share of orders in each state — useful for fulfillment and support."
      >
        {statusTotal === 0 ? (
          <p className="text-sm text-muted-foreground">No order status data for this vendor.</p>
        ) : (
          <ul className="space-y-5">
            {Object.entries(analytics.ordersByStatus)
              .sort(([, a], [, b]) => b - a)
              .map(([status, value]) => {
                const pct = statusTotal > 0 ? Math.round((value / statusTotal) * 1000) / 10 : 0;
                return (
                  <li key={status} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-4 text-sm">
                      <span className="font-medium text-foreground">{statusLabel(status)}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{value}</span>
                        <span className="ml-2 text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 bg-muted" />
                  </li>
                );
              })}
          </ul>
        )}
      </AnalyticsSectionCard>
    </div>
  );
}
