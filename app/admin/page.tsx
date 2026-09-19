'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Banknote,
  Package,
  RefreshCw,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AnalyticsMetricCard,
  AnalyticsPageSkeleton,
  AnalyticsSectionCard,
} from '@/components/admin/admin-analytics-ui';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { formatUgx } from '@/lib/format-ugx';
import type { Product } from '@/lib/db';
import { cn } from '@/lib/utils';

const CHART_EMERALD = '#0E9A6A';
const CHART_GOLD = '#C4A35A';

type TrendRange = '3m' | '6m';

type TopProduct = {
  id: string;
  name: string;
  sales: number;
};

type Analytics = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueTrend: Array<{ label: string; revenue: number }>;
  orderTrend: Array<{ label: string; orders: number }>;
  ordersByStatus: Record<string, number>;
  topProducts: TopProduct[];
};

const QUICK_LINKS = [
  { href: '/admin/orders', label: 'Orders', hint: 'Fulfillment queue', icon: ShoppingCart },
  { href: '/admin/products', label: 'Catalog', hint: 'Listings & stock', icon: Package },
  { href: '/admin/vendors', label: 'Vendors', hint: 'Approvals & providers', icon: Truck },
  { href: '/admin/analytics', label: 'Analytics', hint: 'Full operations view', icon: Banknote },
] as const;

function statusFill(status: string): string {
  const key = status.toLowerCase();
  if (key.includes('cancel') || key.includes('fail')) return '#9AA59D';
  if (key.includes('deliver') || key.includes('complete') || key.includes('paid')) return CHART_EMERALD;
  if (key.includes('ship') || key.includes('progress')) return '#3D9B78';
  if (key.includes('process')) return '#5B8DEF';
  if (key.includes('pend')) return CHART_GOLD;
  return '#7A8B82';
}

function periodChangePct(values: number[]): number | null {
  if (values.length < 2) return null;
  const last = values[values.length - 1] ?? 0;
  const prev = values[values.length - 2] ?? 0;
  if (prev === 0) return last === 0 ? 0 : 100;
  return ((last - prev) / Math.abs(prev)) * 100;
}

function formatAxisMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

const chartTooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(18, 36, 28, 0.08)',
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>('6m');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      setRefreshing(true);
      const response = await fetch('/api/analytics', { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = (await response.json()) as Record<string, unknown>;
      const topRaw = Array.isArray(data?.topProducts) ? data.topProducts : [];
      setAnalytics({
        totalRevenue: Number(data?.totalRevenue ?? 0),
        totalOrders: Number(data?.totalOrders ?? 0),
        totalCustomers: Number(data?.totalCustomers ?? 0),
        totalProducts: Number(data?.totalProducts ?? 0),
        averageOrderValue: Number(data?.averageOrderValue ?? 0),
        revenueTrend: Array.isArray(data?.revenueTrend) ? (data.revenueTrend as Analytics['revenueTrend']) : [],
        orderTrend: Array.isArray(data?.orderTrend) ? (data.orderTrend as Analytics['orderTrend']) : [],
        ordersByStatus:
          data?.ordersByStatus && typeof data.ordersByStatus === 'object'
            ? (data.ordersByStatus as Record<string, number>)
            : {},
        topProducts: topRaw
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const row = item as Record<string, unknown>;
            const id = typeof row.id === 'string' ? row.id : '';
            if (!id) return null;
            return {
              id,
              name: String(row.name ?? 'Untitled'),
              sales: Number(row.sales ?? 0),
              ...row,
            } as TopProduct;
          })
          .filter((item): item is TopProduct => item != null),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch analytics:', err);
      setError('Could not load the operations snapshot.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const sliceWindow = trendRange === '3m' ? 3 : 6;

  const revenueData = useMemo(() => {
    if (!analytics) return [];
    const base =
      analytics.revenueTrend.length > 0
        ? analytics.revenueTrend.map((point) => ({ name: point.label, revenue: point.revenue }))
        : analytics.totalRevenue
          ? [{ name: 'Current', revenue: analytics.totalRevenue }]
          : [];
    return base.slice(-sliceWindow);
  }, [analytics, sliceWindow]);

  const ordersTrendData = useMemo(() => {
    if (!analytics) return [];
    const base =
      analytics.orderTrend.length > 0
        ? analytics.orderTrend.map((point) => ({ name: point.label, orders: point.orders }))
        : analytics.totalOrders
          ? [{ name: 'Current', orders: analytics.totalOrders }]
          : [];
    return base.slice(-sliceWindow);
  }, [analytics, sliceWindow]);

  const orderStatusData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.ordersByStatus)
      .map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        value: Number(count) || 0,
        fill: statusFill(status),
      }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [analytics]);

  const revenueChange = useMemo(
    () => periodChangePct(revenueData.map((row) => row.revenue)),
    [revenueData],
  );
  const ordersChange = useMemo(
    () => periodChangePct(ordersTrendData.map((row) => row.orders)),
    [ordersTrendData],
  );

  const rangeLabel = trendRange === '3m' ? '3 months' : '6 months';

  if (loading && !analytics) {
    return <AnalyticsPageSkeleton />;
  }

  if (!analytics) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Operations</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Could not load the command center</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'Try again in a moment.'}</p>
        <Button className="mt-5" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-[#FFF6EA] to-card px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/25 blur-2xl" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Operations</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground md:text-[1.85rem]">
              Command center
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Live snapshot of revenue, orders, and catalog health. Open a lane below when something needs attention.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-border/80 bg-background/80 p-0.5 shadow-sm">
              {(['3m', '6m'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTrendRange(value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    trendRange === value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {value === '3m' ? '3 months' : '6 months'}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="h-9"
              onClick={() => void load()}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Button asChild size="sm" className="h-9">
              <Link href="/admin/analytics">
                Full analytics
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AnalyticsMetricCard
          label="Revenue"
          value={formatUgx(analytics.totalRevenue)}
          sub={`AOV ${formatUgx(analytics.averageOrderValue)}`}
          icon={Banknote}
          accent="primary"
          trend={revenueChange == null ? undefined : { pct: revenueChange, label: 'vs prior month' }}
        />
        <AnalyticsMetricCard
          label="Orders"
          value={analytics.totalOrders.toLocaleString('en-UG')}
          icon={ShoppingCart}
          accent="emerald"
          trend={ordersChange == null ? undefined : { pct: ordersChange, label: 'vs prior month' }}
        />
        <AnalyticsMetricCard
          label="Avg. order"
          value={formatUgx(analytics.averageOrderValue)}
          icon={Banknote}
          accent="amber"
        />
        <AnalyticsMetricCard
          label="Customers"
          value={analytics.totalCustomers.toLocaleString('en-UG')}
          icon={Users}
          accent="teal"
        />
        <AnalyticsMetricCard
          label="Products"
          value={analytics.totalProducts.toLocaleString('en-UG')}
          icon={Package}
          accent="sky"
          className="col-span-2 xl:col-span-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 shadow-sm ring-1 ring-black/[0.03] transition hover:border-primary/30 hover:shadow-md"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{item.label}</span>
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{item.hint}</span>
            </span>
            <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" aria-hidden />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AnalyticsSectionCard
          title="Revenue"
          description={`Last ${rangeLabel} · amounts in UGX`}
        >
          {revenueData.length === 0 ? (
            <EmptyChart message="No revenue history yet." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAxisMoney}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [formatUgx(Number(value) || 0), 'Revenue']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_EMERALD}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: CHART_EMERALD, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard title="Orders" description={`Last ${rangeLabel} · completed volume`}>
          {ordersTrendData.length === 0 ? (
            <EmptyChart message="No order history yet." />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [Number(value).toLocaleString('en-UG'), 'Orders']}
                  />
                  <Bar dataKey="orders" fill={CHART_GOLD} radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalyticsSectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AnalyticsSectionCard title="Order mix" description="Where live orders sit in the pipeline">
          {orderStatusData.length === 0 ? (
            <EmptyChart message="No orders to classify yet." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {orderStatusData.map((row) => (
                        <Cell key={row.name} fill={row.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value, name) => [Number(value).toLocaleString('en-UG'), String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {orderStatusData.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="tabular-nums font-semibold">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AnalyticsSectionCard>

        <AnalyticsSectionCard title="Top products" description="Highest recorded sales in this snapshot">
          {analytics.topProducts.length === 0 ? (
            <EmptyChart message="No product sales to rank yet." />
          ) : (
            <ol className="space-y-1">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sales.toLocaleString('en-UG')} sales</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatProductPriceLabel(product as Product)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 border-t border-border/60 pt-3">
            <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Open catalog
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </AnalyticsSectionCard>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
