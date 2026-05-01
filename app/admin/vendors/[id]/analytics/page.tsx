'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Vendor } from '@/lib/db';
import { ArrowLeft, BarChart3, DollarSign, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

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
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm md:p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-4">
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-destructive">Couldn&apos;t load analytics</CardTitle>
            <CardDescription className="text-destructive/90">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-destructive/40" asChild>
              <Link href={id ? `/admin/vendors/${id}` : '/admin/vendors'}>Back to vendor</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No analytics available for this vendor.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-primary/[0.06] via-card to-card p-6 shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06] md:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary sm:flex">
              <BarChart3 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Vendor analytics</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {vendor?.name ?? 'Vendor'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Performance snapshot for this seller: revenue, orders, catalog size, and order status mix for the
                connected reporting window.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 border-border/80 shadow-sm" asChild>
                  <Link href={`/admin/vendors/${id}`}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Overview
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md dark:ring-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total revenue</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {formatUgx(analytics.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">All-time or window per API</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md dark:ring-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{analytics.totalOrders}</p>
            <p className="mt-1 text-xs text-muted-foreground">Recorded product orders</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md dark:ring-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Package className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {analytics.totalProducts}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Listings on record</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md dark:ring-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. order value</CardTitle>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {formatUgx(analytics.averageOrderValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mean revenue per order</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <CardHeader className="border-b border-border/50 bg-muted/25">
          <CardTitle className="text-base">Orders by status</CardTitle>
          <CardDescription>Share of orders in each state — useful for fulfillment and support.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </div>
  );
}
