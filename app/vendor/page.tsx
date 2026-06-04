'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  ShoppingCart,
  Package,
  TrendingUp,
  Megaphone,
  Users,
  ArrowRight,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { RangeSelector } from '@/components/analytics/range-selector';
import { cn } from '@/lib/utils';

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueTrend?: Array<{ label: string; revenue: number }>;
  orderTrend?: Array<{ label: string; orders: number }>;
  topProducts: Array<{ id: string; name: string; category: string; sales: number; price: number }>;
  ordersByStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
}

const STATUS_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];

const QUICK_ACTIONS = [
  { href: '/vendor/products', label: 'Products', icon: Package, description: 'Manage listings' },
  { href: '/vendor/orders', label: 'Orders', icon: ShoppingCart, description: 'Fulfillment queue' },
  { href: '/vendor/funds', label: 'Funds', icon: Wallet, description: 'Payouts & balance' },
  { href: '/vendor/promotions', label: 'Promotions', icon: Megaphone, description: 'Campaigns' },
] as const;

function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString()}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-5 md:p-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-24 animate-pulse rounded-xl bg-muted/50 sm:h-28" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50 sm:h-24" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <div className="h-56 animate-pulse rounded-xl bg-muted/50 lg:col-span-3 lg:h-72" />
        <div className="h-56 animate-pulse rounded-xl bg-muted/50 lg:col-span-2 lg:h-72" />
      </div>
    </div>
  );
}

export default function VendorDashboardPage() {
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('Vendor');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [trendRange, setTrendRange] = useState<'3m' | '6m'>('6m');
  const supabase = createClient();

  const fetchAnalytics = async (id: string) => {
    setLoadError(false);
    try {
      const response = await fetch(`/api/vendor/analytics?vendorId=${id}`);
      const data = await response.json();
      if (!response.ok) {
        setAnalytics(null);
        setLoadError(true);
        return;
      }
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const name = localStorage.getItem('currentVendorName') || 'Vendor';
    setVendorName(name);

    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      void fetchAnalytics(currentVendorId);
      return;
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setLoading(false);
        setLoadError(true);
        return;
      }
      const displayName = data.user.email?.split('@')[0] || 'Vendor';
      localStorage.setItem('currentVendorId', data.user.id);
      localStorage.setItem('currentVendorName', displayName);
      setVendorId(data.user.id);
      setVendorName(displayName);
      void fetchAnalytics(data.user.id);
    });
  }, []);

  const sliceWindow = trendRange === '3m' ? 3 : 6;

  const revenueDataBase = useMemo(() => {
    if (!analytics) return [] as { month: string; revenue: number }[];
    if (analytics.revenueTrend && analytics.revenueTrend.length > 0) {
      return analytics.revenueTrend.map((point) => ({ month: point.label, revenue: point.revenue }));
    }
    return [{ month: 'Current', revenue: analytics.totalRevenue }];
  }, [analytics]);

  const ordersTrendDataBase = useMemo(() => {
    if (!analytics) return [] as { month: string; orders: number }[];
    if (analytics.orderTrend && analytics.orderTrend.length > 0) {
      return analytics.orderTrend.map((point) => ({ month: point.label, orders: point.orders }));
    }
    return [{ month: 'Current', orders: analytics.totalOrders }];
  }, [analytics]);

  const revenueData = useMemo(
    () => (revenueDataBase.length > 0 ? revenueDataBase.slice(-sliceWindow) : []),
    [revenueDataBase, sliceWindow],
  );

  const ordersTrendData = useMemo(
    () => (ordersTrendDataBase.length > 0 ? ordersTrendDataBase.slice(-sliceWindow) : []),
    [ordersTrendDataBase, sliceWindow],
  );

  const greetingName = useMemo(() => {
    const n = vendorName.trim();
    if (n && n !== 'Vendor') return n.split(/\s+/)[0] ?? n;
    return 'there';
  }, [vendorName]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!analytics || loadError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/60" aria-hidden />
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load analytics</p>
        <p className="max-w-sm text-xs text-muted-foreground sm:text-sm">Check your connection and try again.</p>
        {vendorId ? (
          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => void fetchAnalytics(vendorId)}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  const statusData = [
    { name: 'Pending', value: analytics.ordersByStatus?.pending ?? 0 },
    { name: 'Processing', value: analytics.ordersByStatus?.processing ?? 0 },
    { name: 'Shipped', value: analytics.ordersByStatus?.shipped ?? 0 },
    { name: 'Delivered', value: analytics.ordersByStatus?.delivered ?? 0 },
    { name: 'Cancelled', value: analytics.ordersByStatus?.cancelled ?? 0 },
  ].filter((row) => row.value > 0);

  const kpiCards = [
    { label: 'Revenue', value: formatUgx(analytics.totalRevenue), sub: 'Gross sales', icon: Wallet },
    { label: 'Orders', value: String(analytics.totalOrders), sub: 'All time', icon: ShoppingCart },
    { label: 'Products', value: String(analytics.totalProducts), sub: 'Active listings', icon: Package },
    { label: 'Avg order', value: formatUgx(analytics.averageOrderValue), sub: 'Per checkout', icon: TrendingUp },
  ] as const;

  const chartHeight = 'h-[220px] sm:h-[280px] md:h-[300px]';

  return (
    <div className="min-h-full bg-background px-3 pb-6 pt-2 sm:bg-gradient-to-b sm:from-background sm:via-background sm:to-muted/20 sm:px-5 sm:pb-8 sm:pt-3 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vendor</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
                Hi, {greetingName}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Revenue, orders, and product performance at a glance.
              </p>
            </div>
            <Badge variant="outline" className="w-fit gap-1.5 font-normal text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Live data
            </Badge>
          </div>
        </header>

        <section aria-label="Key metrics">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {kpiCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.label}
                  className="rounded-xl border-border/70 p-3 shadow-sm ring-1 ring-black/[0.03] transition hover:border-primary/20 dark:ring-white/[0.04] sm:p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {item.label}
                    </p>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <p className="mt-2 text-base font-bold tabular-nums tracking-tight sm:text-xl">{item.value}</p>
                  <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{item.sub}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section aria-label="Quick actions">
          <h2 className="mb-2 px-0.5 text-sm font-semibold text-foreground sm:mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col rounded-xl border border-border/70 bg-card p-3 shadow-sm ring-1 ring-black/[0.03] transition hover:border-primary/25 hover:bg-accent/30 dark:ring-white/[0.04] sm:p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80 text-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="mt-2 text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{action.description}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-2 hidden justify-end sm:flex">
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground">
              <Link href="/vendor/customers">
                Customers
                <Users className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
          <Card className="rounded-xl border-border/70 p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl sm:p-5 lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold tracking-tight sm:text-base">Revenue</h2>
                <p className="text-xs text-muted-foreground">Trend by period</p>
              </div>
              <RangeSelector
                value={trendRange}
                onChange={setTrendRange}
                options={[
                  { value: '3m', label: '3 mo' },
                  { value: '6m', label: '6 mo' },
                ]}
                ariaLabel="Revenue chart range"
              />
            </div>
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted-foreground) / 0.15)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatUgx(Number(value)), 'Revenue']} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-xl border-border/70 p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl sm:p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold tracking-tight sm:text-base">Orders</h2>
                <p className="text-xs text-muted-foreground">By status</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{analytics.totalOrders} total</span>
            </div>
            {statusData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground sm:h-[280px]">
                No orders yet
              </div>
            ) : (
              <>
                <div className={cn(chartHeight, 'sm:h-[200px] lg:h-[220px]')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius="80%"
                        innerRadius="52%"
                        dataKey="value"
                      >
                        {statusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-1">
                  {statusData.map((row, index) => (
                    <li key={row.name} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                          aria-hidden
                        />
                        {row.name}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <Card className="rounded-xl border-border/70 p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">Order volume</h2>
              <p className="text-xs text-muted-foreground">Monthly trend</p>
            </div>
            <RangeSelector
              value={trendRange}
              onChange={setTrendRange}
              options={[
                { value: '3m', label: '3 mo' },
                { value: '6m', label: '6 mo' },
              ]}
              ariaLabel="Orders chart range"
            />
          </div>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersTrendData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted-foreground) / 0.15)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(value: number) => [Number(value), 'Orders']} />
                <Bar dataKey="orders" name="Orders" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">Top products</h2>
              <p className="text-xs text-muted-foreground">By sales volume</p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">
              <Link href="/vendor/products">
                Manage
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="p-3 sm:p-5">
            {analytics.topProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center sm:py-12">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No product data yet</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Add listings to see performance here.</p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/vendor/products">Add products</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {analytics.topProducts.map((product, index) => (
                  <li key={product.id}>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-3 sm:px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">{product.sales} sold</p>
                        <p className="text-xs text-muted-foreground">{formatUgx(product.price * product.sales)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
