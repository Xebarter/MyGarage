'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Filter,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import type { Customer, Order, BuyerServiceRequest, BuyerAddress, BuyerWishlistItem, BuyerSupportTicket, BuyerProviderRating, PaymentRecord } from '@/lib/db';

type ClientSegment = 'product' | 'service' | 'mixed' | 'inactive';

type ClientSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  serviceRequestsTotal: number;
  serviceRequestsOpen: number;
  lastServiceRequestAt: string | null;
  segment: ClientSegment;
  lastActivityAt: string | null;
};

type ClientDetail = {
  customer: Customer;
  orders: Order[];
  serviceRequests: BuyerServiceRequest[];
  addresses: BuyerAddress[];
  wishlist: BuyerWishlistItem[];
  supportTickets: BuyerSupportTicket[];
  ratings: BuyerProviderRating[];
  payments: PaymentRecord[];
};

function formatMoneyUGX(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `UGX ${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function segmentLabel(segment: ClientSegment): string {
  if (segment === 'mixed') return 'Product + Service';
  if (segment === 'product') return 'Product';
  if (segment === 'service') return 'Service';
  return 'Inactive';
}

function segmentBadgeClass(segment: ClientSegment): string {
  if (segment === 'mixed')
    return 'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100';
  if (segment === 'product')
    return 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100';
  if (segment === 'service')
    return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
  return 'border-border bg-muted/80 text-muted-foreground';
}

function clientSummaryToPreviewCustomer(s: ClientSummary): Customer {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    address: s.address,
    totalOrders: s.totalOrders,
    totalSpent: s.totalSpent,
    createdAt: new Date(s.createdAt),
  };
}

function ClientMobileCard({
  client,
  onOpen,
}: {
  client: ClientSummary;
  onOpen: (id: string) => void;
}) {
  const open = () => onOpen(client.id);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      className="flex cursor-pointer flex-col gap-2 border-b border-border/70 px-4 py-3.5 transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium leading-snug text-foreground">{client.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{client.email || '—'}</p>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', segmentBadgeClass(client.segment))}>
          {segmentLabel(client.segment)}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orders</p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">{client.totalOrders}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Spend</p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">{formatMoneyUGX(client.totalSpent)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Services</p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">
            {client.serviceRequestsTotal}
            {client.serviceRequestsOpen > 0 ? (
              <span className="ml-1 font-normal text-muted-foreground">({client.serviceRequestsOpen} open)</span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Activity</p>
          <p className="mt-0.5 text-foreground">{formatDate(client.lastActivityAt || client.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{client.phone || 'No phone on file'}</span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </div>
    </div>
  );
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'spent' | 'orders' | 'service'>('recent');
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'service' | 'mixed' | 'inactive'>('all');

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({ name: '', email: '', phone: '', address: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  async function fetchClients(next?: { q?: string; segment?: string; sort?: string }) {
    try {
      setError(null);
      setFetching(true);
      const params = new URLSearchParams();
      if (next?.q) params.set('q', next.q);
      if (next?.segment && next.segment !== 'all') params.set('segment', next.segment);
      if (next?.sort) params.set('sort', next.sort);
      const response = await fetch(`/api/admin/clients?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = typeof data?.error === 'string' && data.error.trim() ? data.error : 'Failed to load clients';
        throw new Error(msg);
      }
      setClients(Array.isArray(data?.clients) ? data.clients : []);
    } catch (e) {
      console.error('Failed to fetch clients:', e);
      const msg = e instanceof Error ? e.message : 'Could not load clients.';
      setError(msg);
      setClients([]);
      toast.error(msg);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }

  async function openClient(clientId: string) {
    setActiveClientId(clientId);
    setDetailOpen(true);
    setDetailError(null);

    const summary = clients.find((c) => c.id === clientId);
    if (summary) {
      setDetail({
        customer: clientSummaryToPreviewCustomer(summary),
        orders: [],
        serviceRequests: [],
        addresses: [],
        wishlist: [],
        supportTickets: [],
        ratings: [],
        payments: [],
      });
    } else {
      setDetail(null);
    }

    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`);
      const data = (await response.json().catch(() => ({}))) as ClientDetail & { error?: string };
      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' && data.error.trim() ? data.error : 'Failed to load client.');
      }
      setDetail(data);
    } catch (e) {
      console.error('Failed to load client detail:', e);
      setDetailError(e instanceof Error ? e.message : 'Failed to load client.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveClientProfile() {
    if (!detail?.customer?.id) return;
    if (savingProfile) return;
    setSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaved(false);
    try {
      const response = await fetch(`/api/customers/${encodeURIComponent(detail.customer.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileDraft.name,
          email: profileDraft.email,
          phone: profileDraft.phone,
          address: profileDraft.address,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save client profile.');
      }
      const updatedCustomer = (await response.json()) as Customer;
      setDetail((current) => (current ? { ...current, customer: updatedCustomer } : current));
      setProfileSaved(true);
      void fetchClients({ q: query, segment: activeTab, sort });
      window.setTimeout(() => setProfileSaved(false), 1800);
    } catch (e) {
      console.error('Failed to save profile:', e);
      setProfileSaveError(e instanceof Error ? e.message : 'Failed to save client profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  useEffect(() => {
    void fetchClients({ q: query, segment: activeTab, sort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!detail?.customer) return;
    setProfileDraft({
      name: detail.customer.name ?? '',
      email: detail.customer.email ?? '',
      phone: detail.customer.phone ?? '',
      address: detail.customer.address ?? '',
    });
    setProfileSaveError(null);
    setProfileSaved(false);
  }, [detail?.customer?.id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchClients({ q: query, segment: activeTab, sort });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeTab, sort]);

  const metrics = useMemo(() => {
    const total = clients.length;
    const product = clients.filter((c) => c.segment === 'product').length;
    const service = clients.filter((c) => c.segment === 'service').length;
    const mixed = clients.filter((c) => c.segment === 'mixed').length;
    const inactive = clients.filter((c) => c.segment === 'inactive').length;
    const spent = clients.reduce((sum, c) => sum + Number(c.totalSpent ?? 0), 0);
    const openJobs = clients.reduce((sum, c) => sum + Number(c.serviceRequestsOpen ?? 0), 0);
    return { total, product, service, mixed, inactive, spent, openJobs };
  }, [clients]);

  const listRowSummary = useMemo(
    () => (activeClientId ? clients.find((c) => c.id === activeClientId) ?? null : null),
    [activeClientId, clients],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 pb-10 pt-2 sm:space-y-6 sm:px-8 sm:pb-16 sm:pt-4">
        <div className="rounded-2xl border border-border/80 bg-linear-to-br from-primary/6 via-card to-card p-6 shadow-md ring-1 ring-black/4 dark:ring-white/6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="mt-3 h-4 w-[min(520px,100%)]" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-32 rounded-xl" />

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/6">
          <div className="p-4">
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="space-y-3 p-4 pt-0">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = query.trim().length > 0 || activeTab !== 'all' || sort !== 'recent';

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 pb-12 pt-2 md:space-y-6 md:px-8 md:pb-16 md:pt-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-primary/[0.07] via-card to-card px-5 py-6 shadow-md ring-1 ring-black/4 dark:ring-white/6 md:px-8 md:py-7">
        <div
          className="pointer-events-none absolute -right-4 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary sm:flex">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                CRM
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Clients</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Product buyers and service clients in one directory — search, segment by behavior, then open the drawer
                for full history and profile edits.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Users className="h-3 w-3 opacity-70" aria-hidden />
                  {metrics.total} total
                </Badge>
                <Badge variant="secondary" className="gap-1 font-normal">
                  <ShoppingBag className="h-3 w-3 opacity-70" aria-hidden />
                  {metrics.product + metrics.mixed} product
                </Badge>
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Wrench className="h-3 w-3 opacity-70" aria-hidden />
                  {metrics.service + metrics.mixed} service
                </Badge>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-border/80 bg-background/80 lg:mt-1"
            disabled={fetching}
            onClick={() => void fetchClients({ q: query, segment: activeTab, sort })}
          >
            <RefreshCw className={cn('h-4 w-4', fetching && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm sm:col-span-2 dark:bg-emerald-500/10 xl:col-span-2">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
            <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Product revenue (loaded)</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {formatMoneyUGX(metrics.spent)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Sum of totalSpent in current result set</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Open jobs</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{metrics.openJobs}</p>
          <p className="mt-1 text-xs text-muted-foreground">Service requests in flight</p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Product only</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{metrics.product}</p>
        </div>
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Wrench className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Service only</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{metrics.service}</p>
        </div>
        <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/6 p-4 shadow-sm dark:bg-fuchsia-500/10">
          <div className="flex items-center gap-2 text-fuchsia-800 dark:text-fuchsia-300">
            <Filter className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Mixed / inactive</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
            {metrics.mixed} <span className="text-muted-foreground">·</span> {metrics.inactive}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Cross-channel · no activity</p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight">Search &amp; sort</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Debounced server query. Sort applies within the selected segment tab below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-6">
              <Label htmlFor="clients-search" className="text-xs font-medium text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="clients-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Name, email, phone, address, id…"
                  aria-label="Search clients"
                  className="h-10 border-border/80 bg-background/80 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 lg:col-span-4">
              <Label className="text-xs font-medium text-muted-foreground">Sort</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="h-10 border-border/80 bg-background/80" aria-label="Sort clients">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent activity</SelectItem>
                  <SelectItem value="spent">Highest spend</SelectItem>
                  <SelectItem value="orders">Most product orders</SelectItem>
                  <SelectItem value="service">Most service requests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full border-border/80"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setQuery('');
                  setSort('recent');
                  setActiveTab('all');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing <span className="font-medium text-foreground">{clients.length}</span> client
              {clients.length === 1 ? '' : 's'}
              {activeTab !== 'all' ? (
                <span> · {segmentLabel(activeTab as ClientSegment)}</span>
              ) : null}
              {fetching ? (
                <span className="ml-1 inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Updating
                </span>
              ) : null}
            </p>
            <p className="hidden sm:block">Row or Enter opens the profile drawer.</p>
            <p className="sm:hidden">Tap a card for the drawer.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="no-print -mx-1 overflow-x-auto pb-2 [scrollbar-width:thin]">
          <TabsList className="inline-flex h-auto min-h-11 w-max max-w-none flex-nowrap justify-start gap-1 rounded-xl border border-border/60 bg-muted/45 p-1.5 shadow-inner md:flex-wrap md:justify-start">
            <TabsTrigger
              value="all"
              className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="product"
              className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Product
            </TabsTrigger>
            <TabsTrigger
              value="service"
              className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Service
            </TabsTrigger>
            <TabsTrigger
              value="mixed"
              className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Mixed
            </TabsTrigger>
            <TabsTrigger
              value="inactive"
              className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
            >
              Inactive
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-4 focus-visible:outline-none">
          <section
            className={cn(
              'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 transition-opacity dark:ring-white/6',
              fetching && 'opacity-75',
            )}
            aria-busy={fetching}
            aria-live="polite"
          >
            <div className="md:hidden">
              {clients.length === 0 ? (
                <div className="p-4">
                  <Empty className="border-border/60 bg-background">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users className="h-5 w-5" />
                      </EmptyMedia>
                      <EmptyTitle>No clients found</EmptyTitle>
                      <EmptyDescription>Try another search or clear filters.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setSort('recent');
                          setActiveTab('all');
                        }}
                        className="touch-manipulation"
                      >
                        Reset view
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {clients.map((client) => (
                    <ClientMobileCard key={client.id} client={client} onOpen={(id) => void openClient(id)} />
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[180px] pl-4 font-medium text-muted-foreground">Client</TableHead>
                    <TableHead className="hidden min-w-[160px] font-medium text-muted-foreground lg:table-cell">
                      Contact
                    </TableHead>
                    <TableHead className="w-[120px] font-medium text-muted-foreground">Segment</TableHead>
                    <TableHead className="hidden w-[100px] font-medium text-muted-foreground sm:table-cell">
                      Product
                    </TableHead>
                    <TableHead className="hidden w-[120px] font-medium text-muted-foreground sm:table-cell">
                      Service
                    </TableHead>
                    <TableHead className="w-[110px] font-medium text-muted-foreground">Activity</TableHead>
                    <TableHead className="w-10 pr-4 text-right font-medium text-muted-foreground"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-6">
                        <Empty className="border-border/60 bg-background">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Users className="h-5 w-5" />
                            </EmptyMedia>
                            <EmptyTitle>No clients found</EmptyTitle>
                            <EmptyDescription>Try a different search term or clear filters.</EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                            <Button
                              type="button"
                              onClick={() => {
                                setQuery('');
                                setSort('recent');
                                setActiveTab('all');
                              }}
                            >
                              Reset view
                            </Button>
                          </EmptyContent>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => {
                      const go = () => void openClient(client.id);
                      const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          go();
                        }
                      };
                      const isActive = detailOpen && activeClientId === client.id;
                      return (
                        <TableRow
                          key={client.id}
                          tabIndex={0}
                          className={cn(
                            'group cursor-pointer border-border/60 transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80',
                            isActive && 'bg-primary/6',
                          )}
                          onClick={go}
                          onKeyDown={onRowKeyDown}
                        >
                          <TableCell className="pl-4 align-middle">
                            <p className="truncate font-medium text-foreground" title={client.name}>
                              {client.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground" title={client.address}>
                              {client.address || '—'}
                            </p>
                          </TableCell>
                          <TableCell className="hidden align-middle lg:table-cell">
                            <p className="truncate text-sm text-foreground" title={client.email}>
                              {client.email}
                            </p>
                            <p className="truncate text-xs text-muted-foreground" title={client.phone}>
                              {client.phone || '—'}
                            </p>
                          </TableCell>
                          <TableCell className="align-middle">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] font-semibold', segmentBadgeClass(client.segment))}
                            >
                              {segmentLabel(client.segment)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden align-middle sm:table-cell">
                            <p className="font-medium tabular-nums text-foreground">{client.totalOrders}</p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {formatMoneyUGX(client.totalSpent)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden align-middle sm:table-cell">
                            <p className="font-medium tabular-nums text-foreground">
                              {client.serviceRequestsTotal}
                              {client.serviceRequestsOpen > 0 ? (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                  ({client.serviceRequestsOpen} open)
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last: {formatDate(client.lastServiceRequestAt)}
                            </p>
                          </TableCell>
                          <TableCell className="align-middle text-sm text-muted-foreground">
                            {formatDate(client.lastActivityAt || client.createdAt)}
                          </TableCell>
                          <TableCell className="pr-4 text-right align-middle text-muted-foreground">
                            <ChevronRight
                              className={cn(
                                'ml-auto h-4 w-4 transition-opacity',
                                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70',
                              )}
                              aria-hidden
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="right"
          className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/60 bg-muted/10 px-4 pb-4 pt-6 sm:px-6">
            <SheetTitle className="flex items-center justify-between gap-3 pr-8 text-left">
              <span>Client profile</span>
              {detail?.customer?.id ? (
                <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs" asChild>
                  <Link href="/admin/customers">
                    Legacy <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </SheetTitle>
            <SheetDescription className="text-left text-xs sm:text-sm">
              Orders, service requests, and profile fields for this customer id.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4 sm:px-6">
          {!activeClientId ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Select a client to view details.</div>
          ) : detailError && !detail ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {detailError}
            </div>
          ) : detailLoading && !detail ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading client…
              </p>
            </div>
          ) : !detail ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No details available.</div>
          ) : (
            <div className="space-y-6">
              {detailError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {detailError}
                </div>
              ) : null}
              {detailLoading ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  Loading orders, services, and activity…
                </div>
              ) : null}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{detail.customer.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{detail.customer.email}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{detail.customer.phone || '—'}</p>
                  </div>
                  <Badge variant="outline" className="border-border/70 bg-background">
                    ID {detail.customer.id}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(detail.customer.email ?? '')}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy email
                  </button>
                  <a
                    href={`mailto:${encodeURIComponent(detail.customer.email ?? '')}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
                  >
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                  {detail.customer.phone ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard?.writeText(detail.customer.phone ?? '')}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy phone
                      </button>
                      <a
                        href={`tel:${detail.customer.phone}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    </>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Product orders</p>
                    <div className="mt-1 flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{detail.customer.totalOrders}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total spent (products)</p>
                    <div className="mt-1 flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{formatMoneyUGX(detail.customer.totalSpent)}</p>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Service requests</p>
                    <div className="mt-1 flex items-center gap-1">
                      <Wrench className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {detailLoading && listRowSummary
                          ? listRowSummary.serviceRequestsTotal
                          : detail.serviceRequests.length}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Joined</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDate(detail.customer.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client profile</p>
                    <p className="mt-1 text-sm text-muted-foreground">Update contact details used across product and service workflows.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setProfileDraft({
                        name: detail.customer.name ?? '',
                        email: detail.customer.email ?? '',
                        phone: detail.customer.phone ?? '',
                        address: detail.customer.address ?? '',
                      })
                    }
                    className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
                  >
                    Reset
                  </button>
                </div>

                {profileSaveError ? (
                  <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {profileSaveError}
                  </p>
                ) : null}

                {profileSaved ? (
                  <p className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    Saved.
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2">
                  <input
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Full name"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft((c) => ({ ...c, email: e.target.value }))}
                    placeholder="Email"
                    type="email"
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={profileDraft.phone}
                      onChange={(e) => setProfileDraft((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="Phone"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      value={profileDraft.address}
                      onChange={(e) => setProfileDraft((c) => ({ ...c, address: e.target.value }))}
                      placeholder="Address"
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void saveClientProfile()}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingProfile ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="ops">Operations</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick summary</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Service requests</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading && listRowSummary
                            ? listRowSummary.serviceRequestsTotal
                            : detail.serviceRequests.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open jobs</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading && listRowSummary
                            ? listRowSummary.serviceRequestsOpen
                            : detail.serviceRequests.filter((r) => ['pending', 'matched', 'in_progress'].includes(r.status)).length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orders</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? detail.customer.totalOrders : detail.orders.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payments</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? '—' : detail.payments.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service activity</p>
                      <div className="mt-3 space-y-2">
                        {detailLoading ? (
                          <>
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                          </>
                        ) : (
                          <>
                            {detail.serviceRequests.slice(0, 8).map((r) => (
                              <div key={r.id} className="rounded-lg border border-border/70 bg-background px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-medium text-foreground" title={r.service}>{r.service}</p>
                                  <Badge variant="secondary" className="text-xs">{r.status}</Badge>
                                </div>
                                <p className="mt-1 truncate text-xs text-muted-foreground" title={r.location}>{r.location}</p>
                              </div>
                            ))}
                            {detail.serviceRequests.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No service requests yet.</p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent orders</p>
                      <div className="mt-3 space-y-2">
                        {detailLoading ? (
                          <>
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                          </>
                        ) : (
                          <>
                            {detail.orders.slice(0, 8).map((o) => (
                              <div key={o.id} className="rounded-lg border border-border/70 bg-background px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-foreground">#{o.id.slice(0, 8)}</p>
                                  <p className="text-sm font-semibold text-foreground tabular-nums">{formatMoneyUGX(o.total)}</p>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {o.status} • {formatDate(o.createdAt)}
                                </p>
                              </div>
                            ))}
                            {detail.orders.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No product orders yet.</p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ops" className="mt-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operational data</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Addresses</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? '…' : detail.addresses.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wishlist items</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? '…' : detail.wishlist.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Support tickets</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? '…' : detail.supportTickets.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Provider ratings</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? '…' : detail.ratings.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2 sm:col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payments (in app)</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detailLoading ? '…' : detail.payments.length}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          This includes recorded Paytota events available in the current data layer.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

