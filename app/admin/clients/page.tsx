'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Search,
  ShoppingBag,
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
  return `UGX ${safe.toFixed(0)}`;
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
  if (segment === 'mixed') return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20';
  if (segment === 'product') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
  if (segment === 'service') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
  return 'bg-muted text-muted-foreground border-border';
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
      className="flex cursor-pointer flex-col gap-2 border-b border-border px-4 py-3 transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80 touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium leading-snug text-foreground">{client.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{client.email || '—'}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${segmentBadgeClass(client.segment)}`}
        >
          {segmentLabel(client.segment)}
        </span>
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
      setError(e instanceof Error ? e.message : 'Could not load clients.');
      setClients([]);
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
      <div className="space-y-5 px-4 pb-10 pt-4 sm:space-y-6 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-border bg-linear-to-r from-card to-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Skeleton className="h-8 w-44" />
              <Skeleton className="mt-3 h-4 w-[min(520px,100%)]" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-28 rounded-md" />
              <Skeleton className="h-7 w-36 rounded-md" />
              <Skeleton className="h-7 w-36 rounded-md" />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-[54px] rounded-md" />
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-12">
            <Skeleton className="h-10 lg:col-span-8" />
            <Skeleton className="h-10 lg:col-span-4" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="p-4">
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="space-y-3 p-4 pt-0">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters = query.trim().length > 0 || activeTab !== 'all' || sort !== 'recent';

  return (
    <div className="space-y-5 px-4 pb-10 pt-4 sm:space-y-6 sm:p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-linear-to-r from-card to-card/70 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Clients</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Product customers and service clients in one place — search, segment, and open a profile drawer for details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline" className="border-border/70 bg-background">
              <Users className="h-3 w-3" /> {metrics.total} total
            </Badge>
            <Badge variant="outline" className="border-border/70 bg-background">
              <ShoppingBag className="h-3 w-3" /> {metrics.product + metrics.mixed} product buyers
            </Badge>
            <Badge variant="outline" className="border-border/70 bg-background">
              <Wrench className="h-3 w-3" /> {metrics.service + metrics.mixed} service clients
            </Badge>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-7">
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2 xl:col-span-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Revenue (products)</p>
          <p className="mt-1 text-base font-medium text-foreground">{formatMoneyUGX(metrics.spent)}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open service jobs</p>
          <div className="mt-1 flex items-center gap-1">
            <Clock3 className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{metrics.openJobs}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Product only</p>
          <p className="mt-1 text-base font-medium text-foreground">{metrics.product}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Service only</p>
          <p className="mt-1 text-base font-medium text-foreground">{metrics.service}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mixed</p>
          <p className="mt-1 text-base font-medium text-foreground">{metrics.mixed}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Inactive</p>
          <p className="mt-1 text-base font-medium text-foreground">{metrics.inactive}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-8">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Search name, email, phone, address, or id…"
              aria-label="Search clients"
              className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-base text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 md:h-10 md:text-sm"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort clients"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/20 md:h-10 md:text-sm"
            >
              <option value="recent">Sort: Recent activity</option>
              <option value="spent">Sort: Highest spend</option>
              <option value="orders">Sort: Most product orders</option>
              <option value="service">Sort: Most service requests</option>
            </select>
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={() => {
                setQuery('');
                setSort('recent');
                setActiveTab('all');
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 md:h-10 touch-manipulation"
            >
              Clear filters
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p>
            Showing <span className="font-medium text-foreground">{clients.length}</span> client{clients.length === 1 ? '' : 's'}
            {activeTab !== 'all' ? <span> · {segmentLabel(activeTab as ClientSegment)}</span> : null}
            {fetching ? <span className="ml-1 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Updating</span> : null}
          </p>
          <p className="hidden sm:block">Click a row or press Enter to open the client drawer.</p>
          <p className="sm:hidden">Tap a card for full profile.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex h-auto min-h-9 w-max min-w-full justify-start rounded-lg bg-muted p-1 sm:flex sm:w-full">
            <TabsTrigger value="all" className="shrink-0 px-3 sm:flex-1">
              All
            </TabsTrigger>
            <TabsTrigger value="product" className="shrink-0 px-3 sm:flex-1">
              Product
            </TabsTrigger>
            <TabsTrigger value="service" className="shrink-0 px-3 sm:flex-1">
              Service
            </TabsTrigger>
            <TabsTrigger value="mixed" className="shrink-0 px-3 sm:flex-1">
              Mixed
            </TabsTrigger>
            <TabsTrigger value="inactive" className="shrink-0 px-3 sm:flex-1">
              Inactive
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-3">
          <section
            className={fetching ? 'overflow-hidden rounded-xl border border-border bg-card opacity-75 shadow-sm transition-opacity' : 'overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-opacity'}
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
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setSort('recent');
                          setActiveTab('all');
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 touch-manipulation"
                      >
                        Reset view
                      </button>
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

            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] table-fixed">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur supports-backdrop-filter:bg-muted/40">
                <tr>
                  <th className="w-[34%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</th>
                  <th className="hidden w-[22%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground lg:table-cell">Contact</th>
                  <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Segment</th>
                  <th className="hidden w-[12%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">Product</th>
                  <th className="hidden w-[12%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">Service</th>
                  <th className="w-[16%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Activity</th>
                  <th className="w-[4%] px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6">
                      <Empty className="border-border/60 bg-background">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Users className="h-5 w-5" />
                          </EmptyMedia>
                          <EmptyTitle>No clients found</EmptyTitle>
                          <EmptyDescription>Try a different search term or clear filters.</EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <button
                            type="button"
                            onClick={() => {
                              setQuery('');
                              setSort('recent');
                              setActiveTab('all');
                            }}
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 touch-manipulation md:h-10"
                          >
                            Reset view
                          </button>
                        </EmptyContent>
                      </Empty>
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => {
                    const go = () => void openClient(client.id);
                    const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        go();
                      }
                    };
                    return (
                    <tr
                      key={client.id}
                      tabIndex={0}
                      className="group cursor-pointer transition hover:bg-accent/40 focus-visible:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
                      onClick={go}
                      onKeyDown={onRowKeyDown}
                    >
                      <td className="px-4 py-4 text-sm">
                        <p className="truncate font-medium text-foreground" title={client.name}>{client.name}</p>
                        <p className="truncate text-xs text-muted-foreground" title={client.address}>{client.address || '—'}</p>
                      </td>
                      <td className="hidden px-4 py-4 text-sm lg:table-cell">
                        <p className="truncate text-foreground" title={client.email}>{client.email}</p>
                        <p className="truncate text-xs text-muted-foreground" title={client.phone}>{client.phone || '—'}</p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${segmentBadgeClass(client.segment)}`}>
                          {segmentLabel(client.segment)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-4 text-sm sm:table-cell">
                        <p className="font-medium text-foreground">{client.totalOrders}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">{formatMoneyUGX(client.totalSpent)}</p>
                      </td>
                      <td className="hidden px-4 py-4 text-sm sm:table-cell">
                        <p className="font-medium text-foreground">
                          {client.serviceRequestsTotal}
                          {client.serviceRequestsOpen > 0 ? (
                            <span className="ml-1 text-xs text-muted-foreground">({client.serviceRequestsOpen} open)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last: {formatDate(client.lastServiceRequestAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(client.lastActivityAt || client.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-muted-foreground">
                        <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition group-hover:opacity-70 group-focus-within:opacity-70" aria-hidden />
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          side="right"
          className="flex h-dvh max-h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="shrink-0 space-y-0 border-b border-border/60 px-4 pb-4 pt-6 sm:px-6">
            <SheetTitle className="flex items-center justify-between gap-3">
              <span>Client profile</span>
              {detail?.customer?.id ? (
                <Link
                  href="/admin/customers"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/50"
                >
                  Legacy customers <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </SheetTitle>
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

