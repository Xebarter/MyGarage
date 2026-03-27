'use client';

import { useEffect, useMemo, useState } from 'react';
import { Order } from '@/lib/db';
import { Eye, Search, Package, Truck, CheckCircle2, Clock3, XCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-accent/20 text-accent-foreground',
  processing: 'bg-primary/10 text-primary',
  shipped: 'bg-muted text-muted-foreground',
  delivered: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setError(null);
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Could not load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        }
      } else {
        alert('Failed to update order status.');
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Failed to update order status.');
    }
  }

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customerName.toLowerCase().includes(normalizedQuery) ||
        order.customerEmail.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [orders, query, statusFilter]);

  const metrics = useMemo(() => {
    const revenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const pending = filteredOrders.filter((order) => order.status === 'pending').length;
    const inProgress = filteredOrders.filter((order) => ['processing', 'shipped'].includes(order.status)).length;
    const delivered = filteredOrders.filter((order) => order.status === 'delivered').length;
    const cancelled = filteredOrders.filter((order) => order.status === 'cancelled').length;

    return {
      count: filteredOrders.length,
      revenue,
      pending,
      inProgress,
      delivered,
      cancelled,
    };
  }, [filteredOrders]);

  if (loading) {
    return <div className="p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/70 p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track order lifecycle, monitor revenue, and manage fulfillment from a single view.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2 xl:col-span-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue (filtered)</p>
          <p className="mt-1 text-base font-medium text-foreground">UGX {metrics.revenue.toFixed(0)}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orders</p>
          <div className="mt-1 flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{metrics.count}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</p>
          <div className="mt-1 flex items-center gap-1">
            <Clock3 className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{metrics.pending}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">In Progress</p>
          <div className="mt-1 flex items-center gap-1">
            <Truck className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{metrics.inProgress}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completed / Cancelled</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              {metrics.delivered}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
              <XCircle className="h-3 w-3 text-muted-foreground" />
              {metrics.cancelled}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {error && (
          <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-8">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="lg:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:col-span-8">
          <table className="w-full table-fixed">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Order ID</th>
                <th className="w-[32%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</th>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</th>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <p className="text-base font-medium text-foreground">No orders found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting the status filter or search query.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-accent/40">
                    <td className="truncate px-4 py-4 text-sm font-medium text-foreground">#{order.id.slice(0, 8)}</td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      <p className="truncate font-medium text-foreground" title={order.customerName}>{order.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground" title={order.customerEmail}>{order.customerEmail}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-foreground">UGX {order.total.toFixed(0)}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-primary transition hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="h-fit rounded-xl border border-border bg-card p-6 shadow-sm xl:sticky xl:top-8 xl:col-span-4">
          {!selectedOrder ? (
            <div className="py-12 text-center">
              <p className="text-base font-medium text-foreground">Select an order</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose an order from the table to view details and update status.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Order Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">#{selectedOrder.id.slice(0, 8)}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                <p className="text-sm font-medium text-foreground">{selectedOrder.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Items</p>
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.productName} x{item.quantity}</span>
                      <span className="whitespace-nowrap font-medium text-foreground">UGX {(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">UGX {selectedOrder.subtotal.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium text-foreground">UGX {selectedOrder.tax.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">UGX {selectedOrder.total.toFixed(0)}</span>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Update status</p>
                {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateOrderStatus(selectedOrder.id, status)}
                    disabled={selectedOrder.status === status}
                    className={`w-full rounded-lg py-2 text-sm transition ${
                      selectedOrder.status === status
                        ? 'cursor-not-allowed bg-muted text-muted-foreground'
                        : 'bg-accent/20 text-accent-foreground hover:bg-accent/30'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
