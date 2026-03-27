'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Clock3, Truck, CheckCircle2, Wallet } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
}

export default function BuyerDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerName, setBuyerName] = useState('Buyer');

  useEffect(() => {
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
    const name = localStorage.getItem('currentBuyerName') || 'Buyer';
    setBuyerEmail(email);
    setBuyerName(name);
    fetchOrders(email);
  }, []);

  const fetchOrders = async (email: string) => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        setOrders([]);
        return;
      }
      const data = await response.json();
      const allOrders: Order[] = Array.isArray(data) ? data : [];
      const filtered = email
        ? allOrders.filter((order) => order.customerEmail.toLowerCase() === email.toLowerCase())
        : [];
      setOrders(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to fetch buyer orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const pending = orders.filter((order) => order.status === 'pending' || order.status === 'processing').length;
    const inTransit = orders.filter((order) => order.status === 'shipped').length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;

    return {
      totalOrders: orders.length,
      totalSpent,
      pending,
      inTransit,
      delivered,
    };
  }, [orders]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading buyer dashboard...</div>;
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Buyer Workspace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome back, {buyerName}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Track your purchases, deliveries, and saved items from one dashboard.
              </p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
              {buyerEmail || 'No active buyer email'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Orders</p>
            <p className="mt-2 text-2xl font-bold">{stats.totalOrders}</p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Spent</p>
            <p className="mt-2 text-2xl font-bold">UGX {stats.totalSpent.toFixed(0)}</p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending</p>
            <p className="mt-2 text-2xl font-bold">{stats.pending}</p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In Transit</p>
            <p className="mt-2 text-2xl font-bold">{stats.inTransit}</p>
          </Card>
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivered</p>
            <p className="mt-2 text-2xl font-bold">{stats.delivered}</p>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">Recent Orders</h3>
            <p className="text-xs text-muted-foreground">Most recent first</p>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center">
              <p className="font-medium">No orders found for this buyer session.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Place an order from checkout to automatically populate your dashboard.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex flex-col gap-3 rounded-xl border border-border/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} - {order.items.length} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      {order.status === 'pending' || order.status === 'processing' ? <Clock3 className="h-3.5 w-3.5" /> : null}
                      {order.status === 'shipped' ? <Truck className="h-3.5 w-3.5" /> : null}
                      {order.status === 'delivered' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      {order.status === 'cancelled' ? <ShoppingBag className="h-3.5 w-3.5" /> : null}
                      {order.status}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      UGX {Number(order.total).toFixed(0)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
