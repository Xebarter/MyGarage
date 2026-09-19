'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Package, Search, ShoppingBag } from 'lucide-react';

import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerFilterChip,
  BuyerPageHeader,
  BuyerPageShell,
  BuyerPageSkeleton,
  formatOrderWhen,
  orderStatusPresentation,
  type OrderStatus,
} from '@/components/buyer/buyer-page-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { isPaidLike } from '@/lib/product-order-status';
import { formatUgx } from '@/lib/format-ugx';
import { cn } from '@/lib/utils';

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
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'all' | OrderStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const customerId = (localStorage.getItem('currentBuyerId') || '').trim();
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim().toLowerCase();
    void fetchOrders(customerId, email);
  }, []);

  const fetchOrders = async (customerId: string, email: string) => {
    try {
      const params = new URLSearchParams();
      if (customerId) params.set('customerId', customerId);
      else if (email) params.set('email', email);
      if (![...params.keys()].length) {
        setOrders([]);
        return;
      }
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        setOrders([]);
        return;
      }
      const data = await response.json();
      const allOrders: Order[] = Array.isArray(data) ? data : [];
      setOrders(allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load buyer orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const order of orders) {
      const key = isPaidLike(order.status) ? 'pending' : order.status;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' ? isPaidLike(order.status) : order.status === statusFilter);
      const lineItems = order.items.map((item) => item.productName.toLowerCase()).join(' ');
      const matchesSearch =
        q.length === 0 ||
        order.id.toLowerCase().includes(q) ||
        lineItems.includes(q) ||
        order.shippingAddress.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  if (loading) {
    return (
      <BuyerPageShell>
        <BuyerPageSkeleton tiles={0} rows={4} />
      </BuyerPageShell>
    );
  }

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Purchases"
        title="Orders"
        description="Track every purchase, line item, and delivery address in one place."
        actions={
          <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </Badge>
        }
      />

      <Card className={cn(BUYER_SURFACE, 'p-4 sm:p-5')}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, product, or address…"
            className="h-11 rounded-xl pl-9"
            aria-label="Search orders"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((filter) => (
            <BuyerFilterChip
              key={filter.value}
              active={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              count={counts[filter.value] ?? 0}
            >
              {filter.label}
            </BuyerFilterChip>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={orders.length === 0 ? ShoppingBag : Package}
            title={orders.length === 0 ? 'No orders yet' : 'No matching orders'}
            description={
              orders.length === 0
                ? 'When you check out from the shop, your receipts and tracking details will live here.'
                : 'Try a different search or status filter.'
            }
          >
            {orders.length === 0 ? (
              <Button asChild>
                <Link href="/">Browse shop</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </BuyerEmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const pres = orderStatusPresentation(order.status);
            const StatusIcon = pres.icon;
            const shortId = order.id.length > 12 ? order.id.slice(-10) : order.id;
            return (
              <Card key={order.id} className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
                <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/buyer/orders/${order.id}`} className="font-bold tracking-tight text-foreground hover:underline">
                        Order #{shortId}
                      </Link>
                      <Badge variant="outline" className={cn('h-6 border px-2 text-[11px]', pres.badgeClass)}>
                        <StatusIcon className="h-3 w-3" aria-hidden />
                        {pres.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Placed {formatOrderWhen(order.createdAt)}
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      Updated {new Date(order.updatedAt).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold tabular-nums tracking-tight">{formatUgx(Number(order.total))}</p>
                </div>

                <ul className="divide-y divide-border/60">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-4 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatUgx(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2 rounded-xl bg-muted/40 px-3.5 py-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shipping</p>
                      <p className="text-pretty text-foreground">{order.shippingAddress || 'Not provided'}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0 rounded-full">
                    <Link href={`/buyer/orders/${order.id}`}>Track order</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </BuyerPageShell>
  );
}
