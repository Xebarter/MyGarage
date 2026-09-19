'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, RefreshCw, PackageCheck, Clock3, Truck, Ban, Wallet } from 'lucide-react';
import { formatUgx } from '@/lib/format-ugx';
import {
  allowedVendorTransitions,
  isPaidLike,
  parseProductOrderStatus,
  productOrderStatusLabel,
  type ProductOrderStatus,
} from '@/lib/product-order-status';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  vendorId: string;
}

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  createdAt: string;
  updatedAt: string;
}

function statusColor(status: string) {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
      return 'bg-accent/20 text-accent-foreground';
    case 'processing':
      return 'bg-primary/10 text-primary';
    case 'shipped':
      return 'bg-muted text-muted-foreground';
    case 'delivered':
      return 'bg-primary/10 text-primary';
    case 'cancelled':
    case 'refunded':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function VendorOrdersPage() {
  const [vendorId, setVendorId] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'highest' | 'lowest'>('latest');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      void fetchOrders(currentVendorId);
    }
  }, []);

  const fetchOrders = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/vendor/orders?vendorId=${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error('Unable to fetch orders at the moment.');
      }
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Could not load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getVendorItems = (order: Order) => order.items.filter((item) => item.vendorId === vendorId);

  const getVendorTotal = (order: Order) =>
    getVendorItems(order).reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getVendorUnits = (order: Order) =>
    getVendorItems(order).reduce((sum, item) => sum + item.quantity, 0);

  const patchStatus = async (
    order: Order,
    status: ProductOrderStatus,
    extras?: { trackingNumber?: string; carrier?: string },
  ) => {
    setUpdatingId(order.id);
    setError(null);
    try {
      const response = await fetch(`/api/vendor/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          status,
          trackingNumber: extras?.trackingNumber,
          carrier: extras?.carrier,
        }),
      });
      const data = (await response.json().catch(() => null)) as Order | { error?: string } | null;
      if (!response.ok) {
        const message =
          data && typeof data === 'object' && 'error' in data && data.error
            ? String(data.error)
            : 'Could not update this order.';
        throw new Error(message);
      }
      const updated = data as Order;
      setOrders((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      setShipOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this order.');
    } finally {
      setUpdatingId(null);
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    const visible = orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' ? isPaidLike(order.status) : order.status === statusFilter);
      const vendorItems = getVendorItems(order);
      const productBlob = vendorItems.map((item) => item.productName?.toLowerCase() ?? '').join(' ');

      const matchesSearch =
        normalizedQuery.length === 0 ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customerName.toLowerCase().includes(normalizedQuery) ||
        order.customerEmail.toLowerCase().includes(normalizedQuery) ||
        productBlob.includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });

    visible.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'highest') {
        return getVendorTotal(b) - getVendorTotal(a);
      }
      return getVendorTotal(a) - getVendorTotal(b);
    });

    return visible;
  }, [orders, statusFilter, normalizedQuery, sortBy, vendorId]);

  const orderStats = useMemo(() => {
    const pending = orders.filter((order) => isPaidLike(order.status)).length;
    const processing = orders.filter((order) => order.status === 'processing').length;
    const shipped = orders.filter((order) => order.status === 'shipped').length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const cancelled = orders.filter((order) => order.status === 'cancelled' || order.status === 'refunded').length;
    const revenue = orders.reduce((sum, order) => sum + getVendorTotal(order), 0);
    const units = orders.reduce((sum, order) => sum + getVendorUnits(order), 0);

    return {
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      revenue,
      units,
      total: orders.length,
    };
  }, [orders, vendorId]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            Review paid shop orders and advance fulfillment: Paid → Processing → Shipped → Delivered.
          </p>
        </div>

        <Button variant="outline" onClick={() => fetchOrders(vendorId)} className="gap-2 md:w-auto">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold leading-none">{orderStats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">{orderStats.units} units sold</p>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Your Revenue</p>
          <p className="text-2xl font-bold leading-none">{formatUgx(orderStats.revenue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">From all visible order lines</p>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Fulfillment Overview</p>
          <p className="text-2xl font-bold leading-none">
            {orderStats.pending + orderStats.processing + orderStats.shipped}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active: {orderStats.pending + orderStats.processing + orderStats.shipped} • Completed:{' '}
            {orderStats.delivered} • Cancelled: {orderStats.cancelled}
          </p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, customer, email, or product..."
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest' | 'highest' | 'lowest')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="latest">Sort: Latest first</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="highest">Sort: Highest value</option>
            <option value="lowest">Sort: Lowest value</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            Paid: {orderStats.pending}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <PackageCheck className="h-3.5 w-3.5" />
            Processing: {orderStats.processing}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Truck className="h-3.5 w-3.5" />
            Shipped: {orderStats.shipped}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Wallet className="h-3.5 w-3.5" />
            Delivered: {orderStats.delivered}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Ban className="h-3.5 w-3.5" />
            Cancelled: {orderStats.cancelled}
          </Badge>
        </div>
      </Card>

      <div className="space-y-4">
        {error ? (
          <Card className="p-4">
            <p className="mb-3 font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => fetchOrders(vendorId)}>
              Try again
            </Button>
          </Card>
        ) : null}
        {filteredOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-medium">No matching orders</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try changing your search or filters, or check back later for new orders.
            </p>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const vendorItems = getVendorItems(order);
            const vendorTotal = getVendorTotal(order);
            const vendorUnits = getVendorUnits(order);
            const current = parseProductOrderStatus(order.status) ?? 'pending_fulfillment';
            const allowed = allowedVendorTransitions(current);
            const busy = updatingId === order.id;
            const mixedVendors = new Set(order.items.map((item) => item.vendorId).filter(Boolean)).size > 1;

            return (
              <Card key={order.id} className="p-6">
                <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">Order #{order.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(order.updatedAt).toLocaleString()}
                    </p>
                    {mixedVendors ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Shared order stage — other suppliers also have items on this checkout.
                      </p>
                    ) : null}
                  </div>
                  <Badge className={statusColor(order.status)}>{productOrderStatusLabel(order.status)}</Badge>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm">
                      <span className="font-medium">Customer:</span> {order.customerName}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {order.customerEmail}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Shipping Address:</span> {order.shippingAddress || 'Not provided'}
                    </p>
                    {order.trackingNumber ? (
                      <p className="text-sm">
                        <span className="font-medium">Tracking:</span>{' '}
                        {order.carrier ? `${order.carrier} · ` : ''}
                        {order.trackingNumber}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                    <p className="text-muted-foreground">Your Order Metrics</p>
                    <p className="mt-1">
                      <span className="font-medium">Items:</span> {vendorItems.length}
                    </p>
                    <p>
                      <span className="font-medium">Units:</span> {vendorUnits}
                    </p>
                    <p>
                      <span className="font-medium">Value:</span> {formatUgx(vendorTotal)}
                    </p>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-medium">
                    Your line items
                  </div>
                  <div className="space-y-2">
                    {vendorItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-b-0"
                      >
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} × {formatUgx(Number(item.price))}
                          </p>
                        </div>
                        <span className="font-semibold">{formatUgx(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !allowed.includes('processing')}
                      onClick={() => void patchStatus(order, 'processing')}
                    >
                      Mark processing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !allowed.includes('shipped')}
                      onClick={() => {
                        setTrackingNumber(order.trackingNumber ?? '');
                        setCarrier(order.carrier ?? '');
                        setShipOrder(order);
                      }}
                    >
                      Mark shipped
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !allowed.includes('delivered')}
                      onClick={() => void patchStatus(order, 'delivered')}
                    >
                      Mark delivered
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy || !allowed.includes('cancelled')}
                      onClick={() => {
                        if (window.confirm('Cancel this whole order for the buyer?')) {
                          void patchStatus(order, 'cancelled');
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Vendor payout estimate</p>
                    <p className="text-lg font-bold">{formatUgx(vendorTotal)}</p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={Boolean(shipOrder)} onOpenChange={(open) => { if (!open) setShipOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as shipped</DialogTitle>
            <DialogDescription>
              Tracking is optional. This updates the shared order status the buyer sees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="trackingNumber">Tracking number</Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carrier">Carrier</Label>
              <Input
                id="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipOrder(null)}>
              Back
            </Button>
            <Button
              disabled={!shipOrder || updatingId === shipOrder.id}
              onClick={() => {
                if (!shipOrder) return;
                void patchStatus(shipOrder, 'shipped', { trackingNumber, carrier });
              }}
            >
              Mark shipped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
