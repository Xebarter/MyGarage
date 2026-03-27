'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Vendor } from '@/lib/db';
import { DollarSign, Package, ShoppingBag } from 'lucide-react';

interface VendorAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

export default function VendorAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const [vendorRes, analyticsRes] = await Promise.all([
          fetch(`/api/vendors/${id}`),
          fetch(`/api/vendor/analytics?vendorId=${id}`),
        ]);

        if (!vendorRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch vendor analytics');
        }
        setVendor(await vendorRes.json());
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to fetch vendor analytics:', error);
        setError('Could not load vendor analytics.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="p-2">Loading analytics...</div>;
  if (!analytics) return <div className="p-2">No analytics available.</div>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{vendor?.name ?? 'Vendor'} Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Performance summary for this vendor.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue</p>
          <div className="mt-1 flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">UGX {analytics.totalRevenue.toFixed(0)}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orders</p>
          <div className="mt-1 flex items-center gap-1">
            <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{analytics.totalOrders}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Products</p>
          <div className="mt-1 flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{analytics.totalProducts}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average order value</p>
          <p className="mt-1 text-base font-medium text-foreground">UGX {analytics.averageOrderValue.toFixed(0)}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Orders by Status</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(analytics.ordersByStatus).map(([status, value]) => (
            <div key={status} className="rounded-lg border border-border/80 bg-background px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{status}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
