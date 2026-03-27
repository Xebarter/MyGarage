'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react';
import { RangeSelector } from '@/components/analytics/range-selector';
import { formatProductPriceLabel } from '@/lib/product-variants';
import type { Product } from '@/lib/db';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue?: number;
  revenueTrend?: Array<{ label: string; revenue: number }>;
  orderTrend?: Array<{ label: string; orders: number }>;
  ordersByStatus: Record<string, number>;
  topProducts: any[];
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<'3m' | '6m'>('6m');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setError(null);
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics({
        totalRevenue: Number(data?.totalRevenue ?? 0),
        totalOrders: Number(data?.totalOrders ?? 0),
        totalCustomers: Number(data?.totalCustomers ?? 0),
        totalProducts: Number(data?.totalProducts ?? 0),
        averageOrderValue: Number(data?.averageOrderValue ?? 0),
        revenueTrend: Array.isArray(data?.revenueTrend) ? data.revenueTrend : [],
        orderTrend: Array.isArray(data?.orderTrend) ? data.orderTrend : [],
        ordersByStatus:
          data?.ordersByStatus && typeof data.ordersByStatus === 'object'
            ? data.ordersByStatus
            : {},
        topProducts: Array.isArray(data?.topProducts) ? data.topProducts : [],
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }

  const sliceWindow = trendRange === '3m' ? 3 : 6;
  const revenueData = useMemo(() => {
    if (!analytics) return [{ name: 'Current', revenue: 0 }];
    const base =
      analytics.revenueTrend && analytics.revenueTrend.length > 0
        ? analytics.revenueTrend.map((point) => ({ name: point.label, revenue: point.revenue }))
        : [{ name: 'Current', revenue: analytics.totalRevenue }];
    return base.slice(-sliceWindow);
  }, [analytics, sliceWindow]);

  const ordersTrendData = useMemo(() => {
    if (!analytics) return [{ name: 'Current', orders: 0 }];
    const base =
      analytics.orderTrend && analytics.orderTrend.length > 0
        ? analytics.orderTrend.map((point) => ({ name: point.label, orders: point.orders }))
        : [{ name: 'Current', orders: analytics.totalOrders }];
    return base.slice(-sliceWindow);
  }, [analytics, sliceWindow]);

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-8">Failed to load analytics</div>;
  }

  const orderStatusData = Object.entries(analytics.ordersByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard</h1>
      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-foreground mt-2">UGX {analytics.totalRevenue.toFixed(0)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-primary/70" />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold text-foreground mt-2">{analytics.totalOrders}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-primary/70" />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Customers</p>
              <p className="text-3xl font-bold text-foreground mt-2">{analytics.totalCustomers}</p>
            </div>
            <Users className="w-12 h-12 text-primary/70" />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Products</p>
              <p className="text-3xl font-bold text-foreground mt-2">{analytics.totalProducts}</p>
            </div>
            <Package className="w-12 h-12 text-primary/70" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Revenue Trend</h2>
            <RangeSelector
              value={trendRange}
              onChange={setTrendRange}
              options={[
                { value: '3m', label: 'Last 3 months' },
                { value: '6m', label: 'Last 6 months' },
              ]}
              ariaLabel="Select admin revenue trend range"
            />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Trend Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Orders Trend</h2>
            <RangeSelector
              value={trendRange}
              onChange={setTrendRange}
              options={[
                { value: '3m', label: 'Last 3 months' },
                { value: '6m', label: 'Last 6 months' },
              ]}
              ariaLabel="Select admin orders trend range"
            />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ordersTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {orderStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Top Products</h2>
          <div className="space-y-4">
            {analytics.topProducts.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between pb-4 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {formatProductPriceLabel(product as Product)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
