'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Heart,
  MapPin,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
  Wrench,
} from 'lucide-react';

import { MobileProfileHub } from '@/components/buyer/mobile-profile-hub';
import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageShell,
  BuyerPageSkeleton,
  BuyerStatTile,
  formatOrderWhen,
  formatUgxCompact,
  orderStatusPresentation,
  type OrderStatus,
} from '@/components/buyer/buyer-page-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatUgx } from '@/lib/format-ugx';
import { openConciergeChat } from '@/lib/concierge/open';
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
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt: string;
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
  { href: '/buyer/services', label: 'Book a service', icon: Wrench, description: 'Roadside help & repairs', accent: true },
  { href: '/buyer/orders', label: 'Track orders', icon: ShoppingBag, description: 'Status & receipts' },
  { href: '/buyer/wishlist', label: 'Wishlist', icon: Heart, description: 'Saved parts' },
  { href: '/buyer/addresses', label: 'Addresses', icon: MapPin, description: 'Delivery spots' },
] as const;

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
    void fetchOrders(email);
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

  return (
    <>
      <MobileProfileHub />
      <div className="hidden md:block">
        {loading ? (
          <BuyerPageShell>
            <BuyerPageSkeleton />
          </BuyerPageShell>
        ) : (
          <BuyerPageShell>
            <section className="relative overflow-hidden rounded-[28px] bg-[#0B1220] px-6 py-7 text-slate-50 shadow-[0_18px_40px_rgba(11,18,32,0.18)]">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-blue-500" />
              <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" aria-hidden />
              <div className="relative flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-blue-500/40 bg-white/6 text-xl font-extrabold text-blue-300">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-400">{timeGreeting}</p>
                  <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight">Welcome back, {greetingName}</h1>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-400">
                    Orders, deliveries, and services — managed from one account.
                  </p>
                  {buyerEmail ? (
                    <p className="mt-3 inline-flex rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-slate-300">
                      {buyerEmail}
                    </p>
                  ) : null}
                </div>
                <Button asChild className="hidden shrink-0 bg-white text-[#0B1220] hover:bg-white/90 lg:inline-flex">
                  <Link href="/buyer/services">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Book service
                  </Link>
                </Button>
              </div>
            </section>

            {stats.active > 0 ? (
              <Link
                href="/buyer/orders"
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-50 px-4 py-3.5 transition hover:bg-amber-100/80"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800">
                    <Truck className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#0B1220]">
                      {stats.active} order{stats.active === 1 ? '' : 's'} in progress
                    </span>
                    <span className="text-xs text-amber-900/70">Track status and delivery details</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-800/70" aria-hidden />
              </Link>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BuyerStatTile label="Orders" value={String(stats.totalOrders)} hint="All time" icon={ShoppingBag} />
              <BuyerStatTile
                label="Spent"
                value={formatUgxCompact(stats.totalSpent)}
                hint={formatUgx(stats.totalSpent)}
                icon={Wallet}
              />
              <BuyerStatTile label="Active" value={String(stats.active)} hint="Pending + transit" icon={Truck} />
              <BuyerStatTile label="Delivered" value={String(stats.delivered)} hint="Completed" icon={CheckCircle2} />
            </section>

            <section>
              <div className="mb-3">
                <h2 className="text-base font-bold tracking-tight">Quick actions</h2>
                <p className="text-xs text-muted-foreground">Jump into the most common tasks</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={cn(
                        'group flex min-h-[7.5rem] flex-col rounded-2xl border p-4 shadow-[0_8px_24px_rgba(11,18,32,0.04)] transition hover:-translate-y-0.5',
                        action.accent
                          ? 'border-primary/20 bg-primary text-primary-foreground hover:bg-primary/92'
                          : 'border-border/70 bg-card ring-1 ring-black/[0.03] hover:border-primary/25',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl',
                          action.accent ? 'bg-white/15' : 'bg-primary/10 text-primary',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="mt-3 text-sm font-bold">{action.label}</span>
                      <span className={cn('mt-0.5 text-xs', action.accent ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {action.description}
                      </span>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => openConciergeChat()}
                  className="group flex min-h-[7.5rem] flex-col rounded-2xl border border-[#236B5C]/20 bg-[#236B5C] p-4 text-left text-[#F7FBF9] shadow-[0_8px_24px_rgba(22,72,62,0.22)] transition hover:-translate-y-0.5 hover:bg-[#16483E]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="mt-3 text-sm font-bold">Ask Concierge</span>
                  <span className="mt-0.5 text-xs text-[#F7FBF9]/80">Answers, parts quotes, booking</span>
                </button>
              </div>
            </section>

            <Card className={BUYER_SURFACE}>
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold tracking-tight">Recent orders</h2>
                  <p className="text-xs text-muted-foreground">Latest purchases and deliveries</p>
                </div>
                <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
                  <Link href="/buyer/orders">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
              <div className="p-4 sm:p-5">
                {orders.length === 0 ? (
                  <BuyerEmptyState
                    icon={Package}
                    title="No orders yet"
                    description="Browse the shop and your purchases will appear here for easy tracking."
                  >
                    <Button asChild>
                      <Link href="/">Browse shop</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/buyer/services">Book a service</Link>
                    </Button>
                  </BuyerEmptyState>
                ) : (
                  <ul className="space-y-2.5">
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
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5 transition hover:border-border hover:bg-card hover:shadow-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={cn('h-6 border px-2 text-[11px]', pres.badgeClass)}>
                                  <StatusIcon className="mr-1 h-3 w-3" aria-hidden />
                                  {pres.label}
                                </Badge>
                                <span className="font-mono text-[11px] text-muted-foreground">{shortId}</span>
                              </div>
                              <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                                {preview
                                  ? `${preview}${itemCount > 1 ? ` +${itemCount - 1} more` : ''}`
                                  : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                              </p>
                              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                                {formatOrderWhen(order.createdAt)}
                                <span className="mx-1.5 text-muted-foreground/40">·</span>
                                {formatUgx(Number(order.total))}
                              </p>
                            </div>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
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
          </BuyerPageShell>
        )}
      </div>
    </>
  );
}
