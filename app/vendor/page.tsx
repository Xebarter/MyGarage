'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { RangeSelector } from '@/components/analytics/range-selector';

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueTrend?: Array<{ label: string; revenue: number }>;
  orderTrend?: Array<{ label: string; orders: number }>;
  topProducts: any[];
  ordersByStatus: any;
}

export default function VendorDashboardPage() {
  const [vendorId, setVendorId] = useState<string>('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<'3m' | '6m'>('6m');
  const supabase = createClient();

  const fetchAnalytics = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/vendor/analytics?vendorId=${vendorId}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      void fetchAnalytics(currentVendorId);
      return;
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }
      localStorage.setItem('currentVendorId', data.user.id);
      localStorage.setItem('currentVendorName', data.user.email?.split('@')[0] || 'Vendor');
      setVendorId(data.user.id);
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

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard...</div>;
  }

  if (!analytics) {
    return <div className="flex items-center justify-center p-8">Failed to load analytics</div>;
  }

  const statusData = [
    { name: 'Pending', value: analytics.ordersByStatus.pending },
    { name: 'Processing', value: analytics.ordersByStatus.processing },
    { name: 'Shipped', value: analytics.ordersByStatus.shipped },
    { name: 'Delivered', value: analytics.ordersByStatus.delivered },
    { name: 'Cancelled', value: analytics.ordersByStatus.cancelled },
  ];

  const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: `UGX ${analytics.totalRevenue.toFixed(0)}`,
      hint: 'Gross sales across all orders',
      icon: Wallet,
    },
    {
      label: 'Total Orders',
      value: analytics.totalOrders.toString(),
      hint: 'Orders currently recorded',
      icon: ShoppingCart,
    },
    {
      label: 'Active Products',
      value: analytics.totalProducts.toString(),
      hint: 'Listings available for purchase',
      icon: Package,
    },
    {
      label: 'Avg Order Value',
      value: `UGX ${analytics.averageOrderValue.toFixed(0)}`,
      hint: 'Average order checkout size',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Vendor Workspace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Performance Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Monitor business growth, order movement, and product performance in one place.
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
              Live analytics
            </Badge>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-2xl border-border/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">{item.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <span className="rounded-xl border border-border/70 bg-muted/50 p-2.5">
                    <Icon className="h-4 w-4 text-foreground" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Card className="rounded-2xl border-border/70 p-6 shadow-sm xl:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold tracking-tight">Revenue Trend</h3>
              <RangeSelector
                value={trendRange}
                onChange={setTrendRange}
                options={[
                  { value: '3m', label: 'Last 3 months' },
                  { value: '6m', label: 'Last 6 months' },
                ]}
                ariaLabel="Select vendor revenue trend range"
              />
            </div>
            <ResponsiveContainer width="100%" height={310}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={64} />
                <Tooltip formatter={(value: number) => [`UGX ${Number(value).toFixed(0)}`, 'Revenue']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="rounded-2xl border-border/70 p-6 shadow-sm xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold tracking-tight">Order Status</h3>
              <p className="text-xs text-muted-foreground">{analytics.totalOrders} total</p>
            </div>
            <ResponsiveContainer width="100%" height={310}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={95}
                  innerRadius={55}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">Orders Trend</h3>
            <RangeSelector
              value={trendRange}
              onChange={setTrendRange}
              options={[
                { value: '3m', label: 'Last 3 months' },
                { value: '6m', label: 'Last 6 months' },
              ]}
              ariaLabel="Select vendor orders trend range"
            />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ordersTrendData}>
              <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted-foreground) / 0.2)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={56} />
              <Tooltip formatter={(value: number) => [Number(value), 'Orders']} />
              <Legend />
              <Bar dataKey="orders" name="Orders" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">Top Products</h3>
            <p className="text-xs text-muted-foreground">Best performers by sales volume</p>
          </div>
          <div className="space-y-3">
            {analytics.topProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center">
                <p className="font-medium">No products yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add products to start tracking performance insights.</p>
              </div>
            ) : (
              analytics.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3 transition-colors hover:bg-muted/30">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{product.sales} sales</p>
                    <p className="text-sm text-muted-foreground">UGX {(product.price * product.sales).toFixed(0)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
    </div>
  );
}
