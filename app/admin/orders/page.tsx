'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Order } from '@/lib/db';
import type { AdminUnifiedCommerceItem, CommercePipelineStage } from '@/lib/admin-commerce-feed';
import { productOrderStatusLabel } from '@/lib/product-order-status';
import { Eye, Search, Package, CheckCircle2, Clock3, ShoppingCart, RefreshCw, MapPin, Calendar, Wrench, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatUgx } from '@/lib/format-ugx';
import { AnalyticsMetricCard } from '@/components/admin/admin-analytics-ui';

const TYPE_OPTIONS: { value: 'all' | 'product' | 'service'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'product', label: 'Products' },
  { value: 'service', label: 'Services' },
];

const PIPELINE_OPTIONS: { value: 'all' | CommercePipelineStage; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_flight', label: 'In progress' },
  { value: 'completed', label: 'Done' },
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
      return 'Done';
    case 'cancelled':
      return 'Cancelled';
    default:
      return p;
  }
}

function SegmentedPills<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-wrap rounded-full border border-border/80 bg-background/80 p-0.5 shadow-sm"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition',
            value === option.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
          {option.count != null ? (
            <span className="ml-1 tabular-nums opacity-80">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function productStatusBadge(status: string): { className: string; label: string } {
  const label = productOrderStatusLabel(status);
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
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
    case 'refunded':
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
  switch (status) {
    case 'pending':
      return {
        label,
        className: 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
      };
    case 'matched':
      return {
        label,
        className: 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100',
      };
    case 'in_progress':
      return {
        label,
        className: 'border-violet-500/35 bg-violet-500/10 text-violet-950 dark:text-violet-100',
      };
    case 'completed':
      return {
        label,
        className: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
      };
    default:
      return {
        label,
        className: 'border-rose-500/35 bg-rose-500/10 text-rose-950 dark:text-rose-100',
      };
  }
}

function OrdersLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <div className="h-32 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.08] via-[#FFF6EA] to-card" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-primary/10 bg-card" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="h-[28rem] rounded-xl border border-primary/10 bg-card xl:col-span-8" />
        <div className="h-96 rounded-xl border border-primary/10 bg-card xl:col-span-4" />
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
      const resPrimary = await fetch('/api/admin-orders', { cache: 'no-store' });
      const res = resPrimary.status === 404 ? await fetch('/api/admin/orders', { cache: 'no-store' }) : resPrimary;
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
        toast.success(`Order marked ${productOrderStatusLabel(newStatus)}`);
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

  const typeCounts = useMemo(
    () => ({
      all: items.length,
      product: loadedCounts.products,
      service: loadedCounts.services,
    }),
    [items.length, loadedCounts.products, loadedCounts.services],
  );

  const stageCounts = useMemo(() => {
    const scoped = items.filter((row) => typeFilter === 'all' || row.kind === typeFilter);
    return {
      all: scoped.length,
      pending: scoped.filter((row) => row.pipeline === 'pending').length,
      in_flight: scoped.filter((row) => row.pipeline === 'in_flight').length,
      completed: scoped.filter((row) => row.pipeline === 'completed').length,
      cancelled: scoped.filter((row) => row.pipeline === 'cancelled').length,
    };
  }, [items, typeFilter]);

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
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 md:px-8 md:py-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.12] via-[#FFF6EA] to-card px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#E8C56B]/25 blur-2xl" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Commerce</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground md:text-[1.85rem]">
              Fulfillment desk
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Product checkouts and field bookings on one timeline. Select a row to inspect, fulfill, or update status.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-border/80 bg-background/85"
            disabled={refreshing}
            onClick={() => void loadFeed('refresh')}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {feedNotes.length > 0 ? (
        <details className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 shadow-sm">
          <summary className="cursor-pointer list-none text-sm font-medium text-amber-950 dark:text-amber-100 [&::-webkit-details-marker]:hidden">
            Partial data ({feedNotes.length} note{feedNotes.length === 1 ? '' : 's'})
            <span className="ml-2 text-[10px] font-normal text-muted-foreground">expand</span>
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-950/90 dark:text-amber-100/90">
            {feedNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetricCard
          label="In the queue"
          value={String(loadedCounts.total)}
          sub={`${loadedCounts.products} product · ${loadedCounts.services} service`}
          icon={Package}
          accent="primary"
        />
        <AnalyticsMetricCard
          label="Matching view"
          value={String(viewMetrics.count)}
          sub="After search and filters"
          icon={Search}
          accent="amber"
        />
        <AnalyticsMetricCard
          label="Amount in view"
          value={formatUgx(viewMetrics.revenue)}
          sub="Known totals in this filter"
          icon={CheckCircle2}
          accent="emerald"
        />
        <AnalyticsMetricCard
          label="Needs attention"
          value={String(viewMetrics.pending + viewMetrics.inFlight)}
          sub={`${viewMetrics.pending} pending · ${viewMetrics.inFlight} in progress`}
          icon={Clock3}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden border-primary/15 shadow-sm xl:col-span-8">
          <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Activity</CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  {viewMetrics.count === loadedCounts.total
                    ? `${viewMetrics.count} rows · newest first`
                    : `${viewMetrics.count} of ${loadedCounts.total} rows`}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="commerce-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search id, customer, booking, phone…"
                  className="h-10 border-border/80 bg-background/85 pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedPills
                  ariaLabel="Filter by type"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={TYPE_OPTIONS.map((option) => ({
                    ...option,
                    count: typeCounts[option.value],
                  }))}
                />
                <SegmentedPills
                  ariaLabel="Filter by stage"
                  value={pipelineFilter}
                  onChange={setPipelineFilter}
                  options={PIPELINE_OPTIONS.map((option) => ({
                    ...option,
                    count: stageCounts[option.value],
                  }))}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(70vh,44rem)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                  <TableRow className="border-border/70 hover:bg-transparent">
                    <TableHead className="w-[92px] pl-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Type
                    </TableHead>
                    <TableHead className="min-w-[180px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Summary
                    </TableHead>
                    <TableHead className="min-w-[120px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Customer
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      When
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="pr-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center align-middle">
                        <div className="mx-auto flex max-w-sm flex-col items-center px-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
                            aria-hidden
                          >
                            <Package className="h-6 w-6" />
                          </div>
                          <p className="mt-4 text-base font-semibold text-foreground">Nothing matches</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Widen filters or refresh — new bookings appear as buyers submit.
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
                          tabIndex={0}
                          aria-selected={isSelected}
                          onClick={() => setSelected(row)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelected(row);
                            }
                          }}
                          className={cn(
                            'cursor-pointer border-border/50 border-l-2 transition-colors hover:bg-primary/[0.04]',
                            row.pipeline === 'pending' && 'border-l-amber-500',
                            row.pipeline === 'in_flight' && 'border-l-sky-500',
                            row.pipeline === 'completed' && 'border-l-primary',
                            row.pipeline === 'cancelled' && 'border-l-rose-400',
                            isSelected && 'bg-primary/[0.07]',
                          )}
                        >
                          <TableCell className="pl-4 align-middle">
                            {row.kind === 'product' ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-[#C4A35A]/40 bg-[#E8C56B]/15 text-[10px] font-semibold text-[#6B5420]"
                              >
                                <ShoppingCart className="h-3 w-3" aria-hidden />
                                Product
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="gap-1 border-primary/35 bg-primary/10 text-[10px] font-semibold text-primary"
                              >
                                <Wrench className="h-3 w-3" aria-hidden />
                                Service
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            <p className="line-clamp-2 font-medium text-foreground">{row.summary}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{row.subtitle}</p>
                          </TableCell>
                          <TableCell className="align-middle">
                            <p className="truncate font-medium text-foreground" title={row.customerName}>
                              {row.customerName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground" title={row.customerEmail}>
                              {row.customerEmail}
                            </p>
                          </TableCell>
                          <TableCell className="align-middle text-xs tabular-nums text-muted-foreground">
                            {format(parseOrderDate(row.sortAt), 'MMM d · HH:mm')}
                          </TableCell>
                          <TableCell className="align-middle text-right">
                            {row.amountUgx != null ? (
                              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                                {formatUgx(row.amountUgx)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-4 align-middle">
                            <Badge
                              variant="outline"
                              title={pipelineLabel(row.pipeline)}
                              className={cn('w-fit text-[10px] font-semibold', st.className)}
                            >
                              {st.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="relative h-fit overflow-hidden border-primary/15 shadow-sm xl:sticky xl:top-20 xl:col-span-4">
          {!selected ? (
            <CardContent className="flex flex-col items-center px-6 py-16 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                aria-hidden
              >
                <Eye className="h-7 w-7" />
              </div>
              <p className="mt-5 text-base font-semibold text-foreground">Select a row</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Line items and fulfillment for product orders. Location, provider, and payments for bookings.
              </p>
            </CardContent>
          ) : selected.kind === 'product' && selected.productOrder ? (
            <ProductDetailPanel
              order={selected.productOrder}
              onClose={() => setSelected(null)}
              onStatusChange={(s) => void updateProductOrderStatus(selected.id, s)}
            />
          ) : selected.kind === 'service' && selected.service ? (
            <ServiceDetailPanel
              request={selected.service.request}
              payments={selected.service.payments}
              onClose={() => setSelected(null)}
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
  onClose,
  onStatusChange,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (s: Order['status']) => void;
}) {
  const st = productStatusBadge(order.status);
  const statuses: Order['status'][] = [
    'pending_fulfillment',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-[#FFF6EA]/80 to-transparent pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Product order</CardTitle>
              <Badge
                variant="outline"
                className="gap-1 border-[#C4A35A]/40 bg-[#E8C56B]/15 text-[10px] font-semibold text-[#6B5420]"
              >
                <ShoppingCart className="h-3 w-3" aria-hidden />
                Checkout
              </Badge>
            </div>
            <CardDescription className="mt-1 font-mono text-xs">#{order.id.slice(0, 8)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', st.className)}>
              {st.label}
            </Badge>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close detail">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {format(parseOrderDate(order.createdAt), 'MMM d, yyyy · HH:mm')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Customer</p>
          <p className="mt-1.5 text-sm font-medium text-foreground">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
        </div>
        {order.shippingAddress ? (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ship to
            </p>
            <p className="flex gap-2 text-sm leading-relaxed text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{order.shippingAddress}</span>
            </p>
          </div>
        ) : null}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Items</p>
          <ScrollArea className="h-[min(12rem,40vh)] rounded-lg border border-border/60 bg-muted/20 pr-3">
            <ul className="space-y-2.5 p-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {item.productName} <span className="text-foreground/80">×{item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                    {formatUgx(item.price * item.quantity)}
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
            <span className="font-medium tabular-nums text-foreground">{formatUgx(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium tabular-nums text-foreground">{formatUgx(order.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold">
            <span className="text-foreground">Total</span>
            <span className="tabular-nums text-foreground">{formatUgx(order.total)}</span>
          </div>
        </div>
        <Separator />
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Fulfillment status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((status) => {
              const active =
                order.status === status ||
                (status === 'pending_fulfillment' &&
                  (order.status === 'pending' || order.status === 'pending_fulfillment'));
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
  onClose,
  onStatusChange,
}: {
  request: import('@/lib/supabase/buyer-services-repo').BuyerServiceRequest;
  payments: import('@/lib/admin-commerce-feed').ServicePaymentSummary[];
  onClose: () => void;
  onStatusChange: (s: (typeof SERVICE_STATUSES)[number]) => void;
}) {
  const st = serviceStatusBadge(request.status);
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#E8C56B]" aria-hidden />
      <CardHeader className="border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-[#FFF6EA]/80 to-transparent pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Service booking</CardTitle>
              <Badge
                variant="outline"
                className="gap-1 border-primary/35 bg-primary/10 text-[10px] font-semibold text-primary"
              >
                <Wrench className="h-3 w-3" aria-hidden />
                Field service
              </Badge>
            </div>
            <CardDescription className="mt-1 font-mono text-xs">#{request.id.slice(0, 8)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', st.className)}>
              {st.label}
            </Badge>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close detail">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {format(parseOrderDate(request.createdAt), 'MMM d, yyyy · HH:mm')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Service</p>
          <p className="mt-1.5 text-sm font-medium text-foreground">{request.service}</p>
          <p className="text-sm text-muted-foreground">{request.category}</p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Location</p>
          <p className="flex gap-2 text-sm leading-relaxed text-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{request.location}</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Buyer contact</p>
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
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Payments ({payments.length})
          </p>
          {payments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              No payments linked yet — amount may appear after checkout completes.
            </p>
          ) : (
            <ScrollArea className="max-h-40 rounded-lg border border-border/60 bg-muted/20">
              <ul className="divide-y divide-border/60 p-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{p.id.slice(0, 8)}</span>
                    <span className="font-medium tabular-nums text-foreground">{formatUgx(p.amountUgx)}</span>
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
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Booking status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_STATUSES.map((status) => {
              const active = request.status === status;
              const { label } = serviceStatusBadge(status);
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
