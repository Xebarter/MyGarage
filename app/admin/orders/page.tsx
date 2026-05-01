'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Order } from '@/lib/db';
import type { AdminUnifiedCommerceItem, CommercePipelineStage } from '@/lib/admin-commerce-feed';
import {
  Eye,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
  ShoppingCart,
  Sparkles,
  RefreshCw,
  MapPin,
  Calendar,
  Wrench,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const PIPELINE_OPTIONS: { value: 'all' | CommercePipelineStage; label: string }[] = [
  { value: 'all', label: 'All stages' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_flight', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SERVICE_STATUSES = [
  'pending',
  'matched',
  'in_progress',
  'completed',
  'cancelled',
] as const;

function parseOrderDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function pipelineLabel(p: CommercePipelineStage): string {
  switch (p) {
    case 'pending':
      return 'Pending';
    case 'in_flight':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return p;
  }
}

function pipelineBadgeClass(p: CommercePipelineStage): string {
  switch (p) {
    case 'pending':
      return 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100';
    case 'in_flight':
      return 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100';
    case 'completed':
      return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
    case 'cancelled':
      return 'border-rose-500/35 bg-rose-500/10 text-rose-950 dark:text-rose-100';
    default:
      return '';
  }
}

function productStatusBadge(status: Order['status']): { className: string; label: string } {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  switch (status) {
    case 'pending':
      return {
        label,
        className:
          'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
      };
    case 'processing':
      return {
        label,
        className: 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100',
      };
    case 'shipped':
      return {
        label,
        className: 'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100',
      };
    case 'delivered':
      return {
        label,
        className:
          'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
      };
    case 'cancelled':
      return {
        label,
        className: 'border-rose-500/35 bg-rose-500/10 text-rose-950 dark:text-rose-100',
      };
    default:
      return { label, className: '' };
  }
}

function serviceStatusBadge(status: string): { className: string; label: string } {
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  return {
    label,
    className: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-950 dark:text-fuchsia-100',
  };
}

function OrdersLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="h-36 rounded-2xl border border-border/60 bg-muted/30" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border/50 bg-muted/25" />
        ))}
      </div>
      <div className="h-24 rounded-xl border border-border/50 bg-muted/20" />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="h-112 rounded-xl border border-border/50 bg-muted/20 xl:col-span-8" />
        <div className="h-96 rounded-xl border border-border/50 bg-muted/20 xl:col-span-4" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [items, setItems] = useState<AdminUnifiedCommerceItem[]>([]);
  const [feedNotes, setFeedNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUnifiedCommerceItem | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [pipelineFilter, setPipelineFilter] = useState<'all' | CommercePipelineStage>('all');

  const loadFeed = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    try {
      setError(null);
      if (mode === 'refresh') setRefreshing(true);
      const res = await fetch('/api/admin/orders', { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as {
        items?: AdminUnifiedCommerceItem[];
        notes?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setItems(Array.isArray(body.items) ? body.items : []);
      setFeedNotes(Array.isArray(body.notes) ? body.notes : []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Could not load commerce activity.');
      setItems([]);
      setFeedNotes([]);
      toast.error('Could not load orders & bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed('initial');
  }, [loadFeed]);

  async function updateProductOrderStatus(orderId: string, newStatus: Order['status']) {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        toast.success(`Order marked ${newStatus}`);
        await loadFeed('refresh');
      } else {
        toast.error('Failed to update product order');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update product order');
    }
  }

  async function updateServiceRequestStatus(requestId: string, status: (typeof SERVICE_STATUSES)[number]) {
    try {
      const response = await fetch(`/api/admin/service-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await loadFeed('refresh');
        toast.success(`Booking marked ${status.replace(/_/g, ' ')}`);
      } else {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || 'Failed to update booking');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update booking');
    }
  }

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((row) => {
      if (typeFilter !== 'all' && row.kind !== typeFilter) return false;
      if (pipelineFilter !== 'all' && row.pipeline !== pipelineFilter) return false;
      if (q.length === 0) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q) ||
        row.customerEmail.toLowerCase().includes(q) ||
        row.summary.toLowerCase().includes(q) ||
        row.subtitle.toLowerCase().includes(q) ||
        (row.kind === 'service' &&
          row.service?.request.buyerContactPhone?.toLowerCase().includes(q))
      );
    });
  }, [items, query, typeFilter, pipelineFilter]);

  const viewMetrics = useMemo(() => {
    const revenue = filteredItems.reduce((s, r) => s + (r.amountUgx ?? 0), 0);
    const products = filteredItems.filter((r) => r.kind === 'product').length;
    const services = filteredItems.filter((r) => r.kind === 'service').length;
    const pending = filteredItems.filter((r) => r.pipeline === 'pending').length;
    const inFlight = filteredItems.filter((r) => r.pipeline === 'in_flight').length;
    const done = filteredItems.filter((r) => r.pipeline === 'completed').length;
    const cancelled = filteredItems.filter((r) => r.pipeline === 'cancelled').length;
    return {
      count: filteredItems.length,
      revenue,
      products,
      services,
      pending,
      inFlight,
      done,
      cancelled,
    };
  }, [filteredItems]);

  const loadedCounts = useMemo(() => {
    const products = items.filter((r) => r.kind === 'product').length;
    const services = items.filter((r) => r.kind === 'service').length;
    return { products, services, total: items.length };
  }, [items]);

  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return prev;
      const still = items.find((r) => r.kind === prev.kind && r.id === prev.id);
      return still ?? null;
    });
  }, [items]);

  if (loading) {
    return <OrdersLoadingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 pb-12 pt-2 md:px-8 md:pb-16 md:pt-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-primary/[0.07] via-card to-card px-5 py-6 shadow-md ring-1 ring-black/4 dark:ring-white/6 md:px-8 md:py-7">
        <div
          className="pointer-events-none absolute -right-4 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary sm:flex">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Commerce
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Orders &amp; bookings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Product checkouts from the in-memory order store plus service requests and payments from Supabase —
                unified timeline, newest first.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-border/80 bg-background/80 lg:mt-1"
            disabled={refreshing}
            onClick={() => void loadFeed('refresh')}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {feedNotes.length > 0 ? (
        <details className="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 shadow-sm dark:bg-amber-500/10">
          <summary className="cursor-pointer list-none text-sm font-medium text-amber-950 dark:text-amber-100 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Partial data ({feedNotes.length} note{feedNotes.length === 1 ? '' : 's'})
              <span className="text-[10px] font-normal text-muted-foreground">— click to expand</span>
            </span>
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-950/90 dark:text-amber-100/90">
            {feedNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-500/20 bg-slate-500/6 p-4 shadow-sm dark:bg-slate-500/10">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300">
            <Package className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Loaded</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {loadedCounts.total}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadedCounts.products} product · {loadedCounts.services} service
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Matching</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {viewMetrics.count}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">After search &amp; filters</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Amount (view)</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            UGX {viewMetrics.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Sum where amount is known</p>
        </div>
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Truck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pipeline (view)</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums tracking-tight text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
              {viewMetrics.pending}
            </span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span>{viewMetrics.inFlight} active</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Done {viewMetrics.done} · Cancelled {viewMetrics.cancelled}
          </p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight">Search &amp; filter</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Scope by type (product checkout vs service booking) and lifecycle stage. Search matches buyers, ids, and
            titles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="commerce-search" className="text-xs font-medium text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="commerce-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Id, customer, booking, phone…"
                  className="h-10 border-border/80 bg-background/80 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Type</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="h-10 border-border/80 bg-background/80">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="product">Product orders</SelectItem>
                  <SelectItem value="service">Service bookings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Stage</Label>
              <Select
                value={pipelineFilter}
                onValueChange={(v) => setPipelineFilter(v as typeof pipelineFilter)}
              >
                <SelectTrigger className="h-10 border-border/80 bg-background/80">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6 xl:col-span-8">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold tracking-tight">Activity</CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              {viewMetrics.count === loadedCounts.total
                ? `Showing all ${viewMetrics.count} rows`
                : `Showing ${viewMetrics.count} of ${loadedCounts.total} rows`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[88px] pl-4 font-medium text-muted-foreground">Type</TableHead>
                  <TableHead className="min-w-[160px] font-medium text-muted-foreground">Summary</TableHead>
                  <TableHead className="min-w-[120px] font-medium text-muted-foreground">Customer</TableHead>
                  <TableHead className="whitespace-nowrap font-medium text-muted-foreground">Amount</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="w-[96px] pr-4 text-right font-medium text-muted-foreground"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center align-middle">
                      <div className="mx-auto flex max-w-sm flex-col items-center px-4">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                          aria-hidden
                        >
                          <Package className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-foreground">Nothing matches</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Widen filters or refresh — new bookings appear after buyers submit services.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-5"
                          onClick={() => {
                            setQuery('');
                            setTypeFilter('all');
                            setPipelineFilter('all');
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((row) => {
                    const isSelected = selected?.kind === row.kind && selected?.id === row.id;
                    const st =
                      row.kind === 'product'
                        ? productStatusBadge(row.statusKey as Order['status'])
                        : serviceStatusBadge(row.statusKey);
                    return (
                      <TableRow
                        key={`${row.kind}-${row.id}`}
                        className={cn(
                          'border-border/60 transition-colors hover:bg-muted/25',
                          isSelected && 'bg-primary/6',
                        )}
                      >
                        <TableCell className="pl-4 align-middle">
                          {row.kind === 'product' ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-sky-500/35 bg-sky-500/10 text-[10px] font-semibold text-sky-950 dark:text-sky-100"
                            >
                              <ShoppingCart className="h-3 w-3" aria-hidden />
                              Product
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 border-fuchsia-500/35 bg-fuchsia-500/10 text-[10px] font-semibold text-fuchsia-950 dark:text-fuchsia-100"
                            >
                              <Wrench className="h-3 w-3" aria-hidden />
                              Service
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className="line-clamp-2 font-medium text-foreground">{row.summary}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{row.subtitle}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {row.kind === 'product' ? 'ord' : 'svc'} · {row.id.slice(0, 8)}…
                          </p>
                        </TableCell>
                        <TableCell className="align-middle">
                          <p className="truncate font-medium text-foreground" title={row.customerName}>
                            {row.customerName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground" title={row.customerEmail}>
                            {row.customerEmail}
                          </p>
                        </TableCell>
                        <TableCell className="align-middle">
                          {row.amountUgx != null ? (
                            <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                              UGX {row.amountUgx.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={cn('w-fit text-[10px] font-semibold', st.className)}>
                              {st.label}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'w-fit border text-[10px] font-medium',
                                pipelineBadgeClass(row.pipeline),
                              )}
                            >
                              {pipelineLabel(row.pipeline)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="pr-4 text-right align-middle">
                          <Button
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setSelected(row)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'h-fit border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6 xl:sticky xl:top-20 xl:col-span-4',
          )}
        >
          {!selected ? (
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                aria-hidden
              >
                <Eye className="h-7 w-7" />
              </div>
              <p className="mt-5 text-base font-semibold text-foreground">Select a row</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Product orders show line items and fulfillment status. Service bookings show location, provider, and
                payment rows.
              </p>
            </CardContent>
          ) : selected.kind === 'product' && selected.productOrder ? (
            <ProductDetailPanel
              order={selected.productOrder}
              onStatusChange={(s) => void updateProductOrderStatus(selected.id, s)}
            />
          ) : selected.kind === 'service' && selected.service ? (
            <ServiceDetailPanel
              request={selected.service.request}
              payments={selected.service.payments}
              onStatusChange={(s) => void updateServiceRequestStatus(selected.id, s)}
            />
          ) : (
            <CardContent className="p-6 text-sm text-muted-foreground">Detail unavailable.</CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function ProductDetailPanel({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (s: Order['status']) => void;
}) {
  const st = productStatusBadge(order.status);
  const statuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  return (
    <>
      <CardHeader className="border-b border-border/60 bg-muted/15 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Product order</CardTitle>
              <Badge
                variant="outline"
                className="gap-1 border-sky-500/35 bg-sky-500/10 text-[10px] font-semibold text-sky-950 dark:text-sky-100"
              >
                <ShoppingCart className="h-3 w-3" aria-hidden />
                Checkout
              </Badge>
            </div>
            <CardDescription className="mt-1 font-mono text-xs">#{order.id.slice(0, 8)}…</CardDescription>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', st.className)}>
            {st.label}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {format(parseOrderDate(order.createdAt), 'MMM d, yyyy · HH:mm')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
          <p className="mt-1.5 text-sm font-medium text-foreground">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
        </div>
        {order.shippingAddress ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ship to
            </p>
            <p className="flex gap-2 text-sm leading-relaxed text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{order.shippingAddress}</span>
            </p>
          </div>
        ) : null}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
          <ScrollArea className="h-[min(12rem,40vh)] rounded-lg border border-border/60 pr-3">
            <ul className="space-y-2.5 p-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {item.productName} <span className="text-foreground/80">×{item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                    UGX {(item.price * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums text-foreground">
              UGX {order.subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium tabular-nums text-foreground">
              UGX {order.tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
            <span className="text-foreground">Total</span>
            <span className="tabular-nums text-foreground">
              UGX {order.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
        <Separator />
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Fulfillment status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((status) => {
              const active = order.status === status;
              const { label } = productStatusBadge(status);
              return (
                <Button
                  key={status}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  disabled={active}
                  className={cn('h-9 text-xs font-medium', !active && 'border-border/80 bg-background/80')}
                  onClick={() => onStatusChange(status)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </>
  );
}

function ServiceDetailPanel({
  request,
  payments,
  onStatusChange,
}: {
  request: import('@/lib/supabase/buyer-services-repo').BuyerServiceRequest;
  payments: import('@/lib/admin-commerce-feed').ServicePaymentSummary[];
  onStatusChange: (s: (typeof SERVICE_STATUSES)[number]) => void;
}) {
  const st = serviceStatusBadge(request.status);
  return (
    <>
      <CardHeader className="border-b border-border/60 bg-muted/15 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Service booking</CardTitle>
              <Badge
                variant="outline"
                className="gap-1 border-fuchsia-500/35 bg-fuchsia-500/10 text-[10px] font-semibold text-fuchsia-950 dark:text-fuchsia-100"
              >
                <Wrench className="h-3 w-3" aria-hidden />
                Field service
              </Badge>
            </div>
            <CardDescription className="mt-1 font-mono text-xs">#{request.id.slice(0, 8)}…</CardDescription>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', st.className)}>
            {st.label}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {format(parseOrderDate(request.createdAt), 'MMM d, yyyy · HH:mm')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Service</p>
          <p className="mt-1.5 text-sm font-medium text-foreground">{request.service}</p>
          <p className="text-sm text-muted-foreground">{request.category}</p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
          <p className="flex gap-2 text-sm leading-relaxed text-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>{request.location}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buyer contact</p>
          <p className="mt-1.5 text-sm font-medium text-foreground">{request.buyerContactName}</p>
          <p className="text-sm text-muted-foreground">{request.buyerContactPhone}</p>
        </div>
        {request.providerId ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Provider</span> ·{' '}
            <span className="font-mono">{request.providerId}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No provider assigned yet.</p>
        )}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Payments ({payments.length})
          </p>
          {payments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              No service_payments rows linked — amount may be unknown until checkout completes.
            </p>
          ) : (
            <ScrollArea className="max-h-40 rounded-lg border border-border/60">
              <ul className="divide-y divide-border/60 p-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{p.id.slice(0, 8)}…</span>
                    <span className="font-medium tabular-nums text-foreground">
                      UGX {p.amountUgx.toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        <Separator />
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Booking status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_STATUSES.map((status) => {
              const active = request.status === status;
              const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
              return (
                <Button
                  key={status}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  disabled={active}
                  className={cn('h-9 text-xs font-medium', !active && 'border-border/80 bg-background/80')}
                  onClick={() => onStatusChange(status)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </>
  );
}
