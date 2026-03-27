'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Order, Vendor } from '@/lib/db';

export default function VendorOrdersPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const [vendorRes, orderRes] = await Promise.all([
          fetch(`/api/vendors/${id}`),
          fetch(`/api/vendor/orders?vendorId=${id}`),
        ]);

        if (!vendorRes.ok || !orderRes.ok) {
          throw new Error('Failed to fetch vendor orders');
        }
        setVendor(await vendorRes.json());
        const ordersData = await orderRes.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (error) {
        console.error('Failed to fetch vendor orders:', error);
        setError('Could not load vendor orders.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const statusCount = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  if (loading) return <div className="p-2">Loading orders...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{vendor?.name ?? 'Vendor'} Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Orders containing this vendor&apos;s products.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
          <div key={status} className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{status}</p>
            <p className="mt-1 text-base font-medium text-foreground">{statusCount[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full table-fixed">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Order ID</th>
              <th className="w-[28%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  No orders found for this vendor.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="transition hover:bg-accent/30">
                  <td className="px-4 py-4 text-sm font-medium text-foreground">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-4 text-sm text-foreground">
                    <p className="truncate font-medium" title={order.customerName}>{order.customerName}</p>
                    <p className="truncate text-xs text-muted-foreground" title={order.customerEmail}>{order.customerEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">{order.items.length}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
