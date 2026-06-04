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
  Sparkles,
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

/** Shorter currency for narrow stat tiles on small screens. */
function formatUgxCompact(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded >= 1_000_000) {
    const m = rounded / 1_000_000;
    return `UGX ${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (rounded >= 10_000) return `UGX ${Math.round(rounded / 1_000)}K`;
  return formatUgx(rounded);
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getBuyerInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed && trimmed !== 'Buyer') {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  const local = email.split('@')[0]?.trim() ?? '';
  return (local.slice(0, 2) || 'BY').toUpperCase();
}

const QUICK_ACTIONS = [
  { href: '/buyer/services', label: 'Book service', icon: Wrench, description: 'Roadside & repairs', accent: true },
  { href: '/buyer/orders', label: 'Orders', icon: ShoppingBag, description: 'Track purchases' },
  { href: '/buyer/wishlist', label: 'Wishlist', icon: Heart, description: 'Saved parts' },
  { href: '/buyer/addresses', label: 'Addresses', icon: MapPin, description: 'Delivery spots' },
] as const;

function DashboardSkeleton() {
  return (
    <div
      className="space-y-5 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 sm:space-y-6 sm:p-5 md:p-8"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="h-28 animate-pulse rounded-2xl bg-muted/50 sm:h-32" />
      <div className="-mx-3 flex gap-2.5 overflow-hidden px-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:px-0 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[5.5rem] min-w-[9.5rem] shrink-0 animate-pulse rounded-xl bg-muted/50 sm:min-w-0 sm:h-24" />
        ))}
      </div>
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 min-w-[8.75rem] shrink-0 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-muted/50" />
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
      active: pending + inTransit,
    };
  }, [orders]);

  const greetingName = useMemo(() => {
    const n = buyerName.trim();
    if (n && n !== 'Buyer') return n.split(/\s+/)[0] ?? n;
    const local = buyerEmail.split('@')[0]?.trim();
    return local || 'there';
  }, [buyerName, buyerEmail]);

  const initials = useMemo(() => getBuyerInitials(buyerName, buyerEmail), [buyerName, buyerEmail]);
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    { label: 'Orders', value: String(stats.totalOrders), mobileValue: String(stats.totalOrders), sub: 'All time', icon: ShoppingBag },
    {
      label: 'Spent',
      value: formatUgx(stats.totalSpent),
      mobileValue: formatUgxCompact(stats.totalSpent),
      sub: 'Lifetime',
      icon: Wallet,
    },
    { label: 'Active', value: String(stats.active), mobileValue: String(stats.active), sub: 'Pending + transit', icon: Truck },
    {
      label: 'Delivered',
      value: String(stats.delivered),
      mobileValue: String(stats.delivered),
      sub: 'Completed',
      icon: CheckCircle2,
    },
  ] as const;

  return (
    <div className="min-h-full bg-background px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 sm:bg-gradient-to-b sm:from-background sm:via-background sm:to-muted/25 sm:px-5 sm:pb-8 sm:pt-3 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-card to-card p-4 shadow-sm ring-1 ring-black/[0.03] dark:from-primary/20 dark:ring-white/[0.04] sm:p-6">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex items-start gap-3 sm:gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl sm:text-base"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="hidden text-xs font-semibold uppercase tracking-widest text-primary sm:block">Dashboard</p>
              <p className="text-xs font-medium text-muted-foreground sm:sr-only">{timeGreeting}</p>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground sm:mt-1 sm:text-2xl md:text-3xl">
                <span className="sm:hidden">{timeGreeting}, </span>
                <span className="hidden sm:inline">Welcome back, </span>
                {greetingName}
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Orders, deliveries, and services in one place.
              </p>
              {buyerEmail ? (
                <p className="mt-2 truncate text-[11px] text-muted-foreground/90 sm:hidden" title={buyerEmail}>
                  {buyerEmail}
                </p>
              ) : null}
            </div>
            {buyerEmail ? (
              <Badge
                variant="outline"
                className="hidden max-w-[14rem] shrink-0 truncate font-normal text-muted-foreground sm:inline-flex"
              >
                {buyerEmail}
              </Badge>
            ) : null}
          </div>
        </header>

        {stats.active > 0 ? (
          <Link
            href="/buyer/orders"
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-3 text-sm transition active:scale-[0.99] hover:bg-amber-500/12 sm:px-4"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-100">
                <Truck className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="font-semibold text-foreground">
                  {stats.active} order{stats.active !== 1 ? 's' : ''} in progress
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Tap to view status</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ) : null}

        <section aria-label="Overview">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="text-sm font-semibold text-foreground">Overview</h2>
            <span className="text-[11px] text-muted-foreground sm:hidden">Swipe</span>
          </div>
          <div
            className={cn(
              '-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-0.5',
              'snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              'sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-4',
            )}
          >
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.label}
                  className={cn(
                    'min-w-[9.75rem] shrink-0 snap-start rounded-xl border-border/70 p-3.5 shadow-sm',
                    'ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:min-w-0 sm:p-4',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                      {stat.label}
                    </p>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <p className="mt-2 text-base font-bold tabular-nums tracking-tight sm:text-xl">
                    <span className="sm:hidden">{stat.mobileValue}</span>
                    <span className="hidden sm:inline">{stat.value}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.sub}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section aria-label="Quick actions">
          <h2 className="mb-2 px-0.5 text-sm font-semibold text-foreground sm:mb-3">Quick actions</h2>
          <div
            className={cn(
              '-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-0.5',
              'snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              'sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-4',
            )}
          >
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              const isAccent = 'accent' in action && action.accent;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    'group flex min-h-[5.25rem] min-w-[8.75rem] shrink-0 snap-start flex-col rounded-xl border p-3.5 shadow-sm transition',
                    'ring-1 ring-black/[0.03] active:scale-[0.98] dark:ring-white/[0.04] sm:min-h-0 sm:min-w-0 sm:p-4',
                    isAccent
                      ? 'border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border-border/70 bg-card hover:border-primary/25 hover:bg-accent/30',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg transition',
                      isAccent
                        ? 'bg-primary-foreground/15 text-primary-foreground'
                        : 'bg-muted/80 text-foreground group-hover:bg-primary/10 group-hover:text-primary',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className={cn('mt-2 text-sm font-semibold', isAccent ? 'text-primary-foreground' : 'text-foreground')}>
                    {action.label}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 line-clamp-2 text-[11px] leading-snug sm:line-clamp-1 sm:text-xs',
                      isAccent ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {action.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">Recent orders</h2>
              <p className="text-xs text-muted-foreground">Latest activity</p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 min-w-[4.5rem] shrink-0 gap-1 px-3 text-xs sm:text-sm"
            >
              <Link href="/buyer/orders">
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="p-3 sm:p-5">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center sm:py-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                  <Package className="h-6 w-6 text-muted-foreground/70" aria-hidden />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">No orders yet</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Browse the shop and your purchases will appear here for easy tracking.
                </p>
                <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <Button asChild size="sm" className="h-10 min-w-[10rem] px-5">
                    <Link href="/">Browse shop</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="h-10 min-w-[10rem] gap-1.5 px-5">
                    <Link href="/buyer/services">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      Book a service
                    </Link>
                  </Button>
                </div>
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
                        className="flex min-h-[4.5rem] items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/50 px-3.5 py-3 transition active:scale-[0.99] hover:border-border hover:bg-card hover:shadow-sm sm:px-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn('h-6 border px-2 text-[11px] sm:text-xs', pres.badgeClass)}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" aria-hidden />
                              {pres.label}
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground" title={order.id}>
                              {shortId}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-foreground sm:line-clamp-1">
                            {preview
                              ? `${preview}${itemCount > 1 ? ` +${itemCount - 1} more` : ''}`
                              : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            {formatOrderWhen(order.createdAt)}
                            <span className="mx-1.5 text-muted-foreground/40">·</span>
                            {formatUgx(Number(order.total))}
                          </p>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                          <ArrowUpRight className="h-4 w-4" aria-hidden />
                        </span>
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
