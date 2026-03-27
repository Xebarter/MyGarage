'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { Order, Product, Vendor } from '@/lib/db';
import { ArrowRight, Package, ShoppingBag, Star, Truck } from 'lucide-react';

interface VendorAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
}

export default function VendorOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const [vendorRes, productRes, orderRes, analyticsRes] = await Promise.all([
          fetch(`/api/vendors/${id}`),
          fetch(`/api/vendor/products?vendorId=${id}`),
          fetch(`/api/vendor/orders?vendorId=${id}`),
          fetch(`/api/vendor/analytics?vendorId=${id}`),
        ]);

        if (!vendorRes.ok || !productRes.ok || !orderRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch vendor workspace');
        }
        setVendor(await vendorRes.json());
        const productsData = await productRes.json();
        const ordersData = await orderRes.json();
        setProducts(Array.isArray(productsData) ? productsData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setAnalytics(await analyticsRes.json());
      } catch (error) {
        console.error('Failed to fetch vendor workspace:', error);
        setError('Could not load vendor workspace data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="p-2">Loading vendor workspace...</div>;
  if (!vendor) return <div className="p-2">Vendor not found.</div>;

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vendor.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{vendor.address}</p>
            <p className="mt-1 text-sm text-muted-foreground">{vendor.email} | {vendor.phone}</p>
          </div>
          <span className="inline-flex h-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Star className="h-4 w-4" />
            {vendor.rating.toFixed(1)}
          </span>
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Products</p>
          <div className="mt-1 flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{analytics?.totalProducts ?? products.length}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orders</p>
          <div className="mt-1 flex items-center gap-1">
            <ShoppingBag className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{analytics?.totalOrders ?? orders.length}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue</p>
          <p className="mt-1 text-base font-medium text-foreground">UGX {(analytics?.totalRevenue ?? 0).toFixed(0)}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg order value</p>
          <p className="mt-1 text-base font-medium text-foreground">UGX {(analytics?.averageOrderValue ?? 0).toFixed(0)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Products</h2>
            <Link href={`/admin/vendors/${id}/products`} className="text-sm text-primary hover:text-primary/80">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {products.slice(0, 5).map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-lg border border-border/80 p-3">
                <div>
                  <p className="font-medium text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                </div>
                <span className="text-sm font-medium text-foreground">{formatProductPriceLabel(product)}</span>
              </div>
            ))}
            {products.length === 0 && <p className="text-sm text-muted-foreground">No products found for this vendor.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              href={`/admin/vendors/${id}/products`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-foreground transition hover:bg-accent/40"
            >
              Manage products
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href={`/admin/vendors/${id}/orders`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-foreground transition hover:bg-accent/40"
            >
              Review orders
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href={`/admin/vendors/${id}/analytics`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-foreground transition hover:bg-accent/40"
            >
              View performance analytics
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href={`/admin/vendors/${id}/settings`}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-foreground transition hover:bg-accent/40"
            >
              Update vendor profile
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/admin/vendors"
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm text-foreground transition hover:bg-accent/40"
            >
              Back to all vendors
              <Truck className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
