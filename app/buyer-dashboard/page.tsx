'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ShoppingBag,
  Clock3,
  Truck,
  CheckCircle2,
  Wallet,
  Wrench,
  Heart,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Package,
} from 'lucide-react';
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

type OrderStatus = Order['status'];

function orderStatusPresentation(status: OrderStatus): {
  label: string;
  icon: typeof Clock3;
  badgeClass: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        icon: Clock3,
        badgeClass: 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
      };
    case 'processing':
      return {
        label: 'Processing',
        icon: Clock3,
        badgeClass: 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100',
      };
    case 'shipped':
      return {
        label: 'In transit',
        icon: Truck,
        badgeClass: 'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        icon: CheckCircle2,
        badgeClass: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: Package,
        badgeClass: 'border-border bg-muted text-muted-foreground',
      };
    default:
      return {
        label: status,
        icon: ShoppingBag,
        badgeClass: 'border-border bg-muted text-muted-foreground',
      };
  }
}

function formatOrderWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatUgx(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString()}`;
}

const QUICK_ACTIONS = [
  { href: '/buyer/services', label: 'Book service', icon: Wrench, description: 'Request roadside help' },
  { href: '/buyer/orders', label: 'Orders', icon: ShoppingBag, description: 'Track purchases' },
  { href: '/buyer/wishlist', label: 'Wishlist', icon: Heart, description: 'Saved parts' },
  { href: '/buyer/addresses', label: 'Addresses', icon: MapPin, description: 'Delivery spots' },
] as const;

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-5 md:p-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-24 animate-pulse rounded-xl bg-muted/50 sm:h-28" />
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/50 sm:h-24" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted/50" />
    </div>
  );
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

  const greetingName = useMemo(() => {
    const n = buyerName.trim();
    if (n && n !== 'Buyer') return n.split(/\s+/)[0] ?? n;
    const local = buyerEmail.split('@')[0]?.trim();
    return local || 'there';
  }, [buyerName, buyerEmail]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    { label: 'Orders', value: String(stats.totalOrders), sub: 'All time', icon: ShoppingBag },
    { label: 'Spent', value: formatUgx(stats.totalSpent), sub: 'Lifetime', icon: Wallet },
    { label: 'Active', value: String(stats.pending + stats.inTransit), sub: 'Pending + transit', icon: Truck },
    { label: 'Delivered', value: String(stats.delivered), sub: 'Completed', icon: CheckCircle2 },
  ] as const;

  return (
    <div className="min-h-full bg-background px-3 pb-6 pt-2 sm:bg-gradient-to-b sm:from-background sm:via-background sm:to-muted/20 sm:px-5 sm:pb-8 sm:pt-3 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Dashboard</p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
                Welcome back, {greetingName}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Orders, deliveries, and services in one place.
              </p>
            </div>
            {buyerEmail ? (
              <Badge variant="outline" className="w-fit max-w-full truncate font-normal text-muted-foreground">
                {buyerEmail}
              </Badge>
            ) : null}
          </div>
        </header>

        <section aria-label="Overview">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  className="rounded-xl border-border/70 p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {stat.label}
                    </p>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums tracking-tight sm:text-xl">{stat.value}</p>
                  <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{stat.sub}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section aria-label="Quick actions">
          <h2 className="mb-2 px-0.5 text-sm font-semibold text-foreground sm:mb-3">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col rounded-xl border border-border/70 bg-card p-3 shadow-sm ring-1 ring-black/[0.03] transition hover:border-primary/25 hover:bg-accent/30 dark:ring-white/[0.04] sm:p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80 text-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="mt-2 text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="mt-0.5 hidden text-xs text-muted-foreground sm:line-clamp-1 sm:block">
                    {action.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:rounded-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">Recent orders</h2>
              <p className="text-xs text-muted-foreground">Latest activity</p>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">
              <Link href="/buyer/orders">
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="p-3 sm:p-5">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center sm:py-12">
                <Package className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No orders yet</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Checkout from the shop and your orders will show up here.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/">Browse shop</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2 sm:space-y-3">
                {orders.slice(0, 5).map((order) => {
                  const pres = orderStatusPresentation(order.status);
                  const StatusIcon = pres.icon;
                  const shortId = order.id.length > 10 ? `…${order.id.slice(-8)}` : order.id;
                  const itemCount = order.items.length;
                  const preview = order.items[0]?.productName;

                  return (
                    <li key={order.id}>
                      <Link
                        href="/buyer/orders"
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-3 transition hover:border-border hover:bg-card hover:shadow-sm sm:items-center sm:px-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className={cn('h-5 border px-1.5 text-[10px] sm:text-xs', pres.badgeClass)}>
                              <StatusIcon className="mr-1 h-3 w-3" aria-hidden />
                              {pres.label}
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground" title={order.id}>
                              {shortId}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
                            {preview
                              ? `${preview}${itemCount > 1 ? ` +${itemCount - 1} more` : ''}`
                              : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatOrderWhen(order.createdAt)}
                            <span className="mx-1 text-muted-foreground/50">·</span>
                            {formatUgx(Number(order.total))}
                          </p>
                        </div>
                        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground sm:mt-0" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
