'use client';

import { useEffect, useMemo, useState } from 'react';
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
      if (!response.ok) throw new Error('Failed to load clients');
      const data = await response.json();
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
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to load client.');
      }
      const data = (await response.json()) as ClientDetail;
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

  if (loading) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
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
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-linear-to-r from-card to-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A unified view of product customers and service clients — searchable, segmentable, and ready for operations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border/70 bg-background">
              <Users className="h-3 w-3" /> {metrics.total} total
            </Badge>
            <Badge variant="outline" className="border-border/70 bg-background">
              <ShoppingBag className="h-3 w-3" /> {metrics.product + metrics.mixed} product buyers
            </Badge>
            <Badge variant="outline" className="border-border/70 bg-background">
              <Wrench className="h-3 w-3" /> {metrics.service + metrics.mixed} service clients
            </Badge>
            {fetching ? (
              <Badge variant="outline" className="border-border/70 bg-background">
                <Loader2 className="h-3 w-3 animate-spin" /> Updating…
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
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

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-8">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search clients by name, email, phone, address, or id..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear filters
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Showing <span className="font-medium text-foreground">{clients.length}</span> client{clients.length === 1 ? '' : 's'}
            {activeTab !== 'all' ? <span> • Segment: {segmentLabel(activeTab as any)}</span> : null}
          </p>
          <p className="inline-flex items-center gap-1">
            Tip: click a row to open the client drawer.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="service">Service</TabsTrigger>
          <TabsTrigger value="mixed">Mixed</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full table-fixed">
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
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                          >
                            Reset view
                          </button>
                        </EmptyContent>
                      </Empty>
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      className="group cursor-pointer transition hover:bg-accent/40"
                      onClick={() => void openClient(client.id)}
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
                        <ChevronRight className="ml-auto h-4 w-4 opacity-0 transition group-hover:opacity-70" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </TabsContent>
      </Tabs>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader className="border-b border-border/60">
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

          {!activeClientId ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Select a client to view details.</div>
          ) : detailLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading client…</div>
          ) : detailError ? (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {detailError}
            </div>
          ) : !detail ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No details available.</div>
          ) : (
            <div className="mt-4 space-y-6 overflow-y-auto px-4 pb-6">
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
                      <p className="text-sm font-medium text-foreground">{detail.serviceRequests.length}</p>
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
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.serviceRequests.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open jobs</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {detail.serviceRequests.filter((r) => ['pending', 'matched', 'in_progress'].includes(r.status)).length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orders</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.orders.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payments</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.payments.length}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service activity</p>
                      <div className="mt-3 space-y-2">
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
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent orders</p>
                      <div className="mt-3 space-y-2">
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
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.addresses.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wishlist items</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.wishlist.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Support tickets</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.supportTickets.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Provider ratings</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.ratings.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background px-3 py-2 sm:col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payments (in app)</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{detail.payments.length}</p>
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
        </SheetContent>
      </Sheet>
    </div>
  );
}

