'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, PackageCheck, Clock3, Truck, Ban, Wallet } from 'lucide-react';

interface Order {
  id: string;
  customerId: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
}

export default function VendorOrdersPage() {
  const [vendorId, setVendorId] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'highest' | 'lowest'>('latest');

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      fetchOrders(currentVendorId);
    }
  }, []);

  const fetchOrders = async (vendorId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/vendor/orders?vendorId=${vendorId}`);
      if (!response.ok) {
        throw new Error('Unable to fetch orders at the moment.');
      }
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Could not load orders. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-accent/20 text-accent-foreground';
      case 'processing':
        return 'bg-primary/10 text-primary';
      case 'shipped':
        return 'bg-muted text-muted-foreground';
      case 'delivered':
        return 'bg-primary/10 text-primary';
      case 'cancelled':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getVendorItems = (order: Order) => {
    return order.items.filter((item: any) => item.vendorId === vendorId);
  };

  const getVendorTotal = (order: Order) => {
    return getVendorItems(order).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  };

  const getVendorUnits = (order: Order) => {
    return getVendorItems(order).reduce((sum: number, item: any) => sum + item.quantity, 0);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    const visible = orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const vendorItems = getVendorItems(order);
      const productBlob = vendorItems.map((item: any) => item.productName?.toLowerCase() ?? '').join(' ');

      const matchesSearch = normalizedQuery.length === 0
        || order.id.toLowerCase().includes(normalizedQuery)
        || order.customerName.toLowerCase().includes(normalizedQuery)
        || order.customerEmail.toLowerCase().includes(normalizedQuery)
        || productBlob.includes(normalizedQuery);

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
    const pending = orders.filter((order) => order.status === 'pending').length;
    const processing = orders.filter((order) => order.status === 'processing').length;
    const shipped = orders.filter((order) => order.status === 'shipped').length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const cancelled = orders.filter((order) => order.status === 'cancelled').length;
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
            Review customer orders, monitor fulfillment, and track your sales performance.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchOrders(vendorId)}
          className="gap-2 md:w-auto"
        >
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
          <p className="text-2xl font-bold leading-none">UGX {orderStats.revenue.toFixed(0)}</p>
          <p className="mt-1 text-xs text-muted-foreground">From all visible order lines</p>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Fulfillment Overview</p>
          <p className="text-2xl font-bold leading-none">{orderStats.pending + orderStats.processing + orderStats.shipped}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active: {orderStats.pending + orderStats.processing + orderStats.shipped} • Completed: {orderStats.delivered} • Cancelled: {orderStats.cancelled}
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
            <option value="pending">Pending</option>
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
            Pending: {orderStats.pending}
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
          <Card className="p-8 text-center">
            <p className="mb-3 font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => fetchOrders(vendorId)}>Try again</Button>
          </Card>
        ) : filteredOrders.length === 0 ? (
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

            return (
              <Card key={order.id} className="p-6">
                <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">Order #{order.id}</h3>
                    <p className="text-sm text-muted-foreground">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Updated {new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm"><span className="font-medium">Customer:</span> {order.customerName}</p>
                    <p className="text-sm"><span className="font-medium">Email:</span> {order.customerEmail}</p>
                    <p className="text-sm"><span className="font-medium">Shipping Address:</span> {order.shippingAddress}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                    <p className="text-muted-foreground">Your Order Metrics</p>
                    <p className="mt-1"><span className="font-medium">Items:</span> {vendorItems.length}</p>
                    <p><span className="font-medium">Units:</span> {vendorUnits}</p>
                    <p><span className="font-medium">Value:</span> UGX {vendorTotal.toFixed(0)}</p>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-medium">
                    Vendor Line Items
                  </div>
                  <div className="space-y-2">
                    {vendorItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3 text-sm border-b border-border last:border-b-0">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} x UGX {Number(item.price).toFixed(0)}
                          </p>
                        </div>
                        <span className="font-semibold">UGX {(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end border-t border-border pt-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Vendor payout estimate</p>
                    <p className="text-lg font-bold">UGX {vendorTotal.toFixed(0)}</p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
