'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim().toLowerCase();
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
      const mine = email ? allOrders.filter((order) => order.customerEmail.toLowerCase() === email) : [];
      setOrders(mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load buyer orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const lineItems = order.items.map((item) => item.productName.toLowerCase()).join(' ');
      const matchesSearch = q.length === 0
        || order.id.toLowerCase().includes(q)
        || lineItems.includes(q)
        || order.shippingAddress.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">Track every order and see detailed line items.</p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID, product, or address..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-medium">No matching orders</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or filter, or place a new order.
            </p>
          </Card>
        ) : (
          filtered.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="mb-4 flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Placed {new Date(order.createdAt).toLocaleString()} - Updated {new Date(order.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{order.status}</Badge>
                  <Badge variant="secondary">UGX {Number(order.total).toFixed(0)}</Badge>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-b-0">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold">UGX {(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                Shipping address: <span className="font-medium text-foreground">{order.shippingAddress}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
