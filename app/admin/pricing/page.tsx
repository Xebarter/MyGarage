'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { formatUgxAmount } from '@/lib/format-service-price';
import { userServiceCategories } from '@/lib/services-catalog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Banknote,
  Check,
  ChevronDown,
  Filter,
  Layers,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Tag,
} from 'lucide-react';

type PriceRow = {
  categoryId: string;
  categoryTitle: string;
  serviceName: string;
  priceUgx: number;
  isCustom: boolean;
  updatedAt: string | null;
};

type StatusFilter = 'all' | 'unsaved' | 'custom' | 'default';

function rowKey(categoryId: string, serviceName: string) {
  return `${categoryId}::${serviceName}`;
}

function catalogDefaultPrice(categoryId: string, serviceName: string): number | null {
  const cat = userServiceCategories.find((c) => c.id === categoryId);
  const service = cat?.services.find((s) => s.name === serviceName);
  return typeof service?.defaultPriceUgx === 'number' ? service.defaultPriceUgx : null;
}

function categoryPriority(categoryId: string): 'urgent' | 'common' | 'optional' {
  return userServiceCategories.find((c) => c.id === categoryId)?.priority ?? 'common';
}

function parseAmount(raw: string): number | null {
  const n = Number(String(raw).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function formatAmountInput(raw: string): string {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-UG');
}

function PricingLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="h-36 rounded-2xl border border-border/60 bg-muted/30" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border/50 bg-muted/25" />
        ))}
      </div>
      <div className="h-28 rounded-xl border border-border/50 bg-muted/20" />
      <div className="h-96 rounded-xl border border-border/50 bg-muted/20" />
    </div>
  );
}

export default function AdminPricingPage() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const applyRows = useCallback((next: PriceRow[]) => {
    setRows(next);
    setDrafts(Object.fromEntries(next.map((row) => [rowKey(row.categoryId, row.serviceName), String(row.priceUgx)])));
  }, []);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      try {
        setError(null);
        if (mode === 'refresh') setRefreshing(true);
        const res = await fetch('/api/admin/service-pricing');
        const json = (await res.json()) as { prices?: PriceRow[]; error?: string };
        if (!res.ok) throw new Error(json.error || 'Failed to load pricing');
        applyRows(json.prices ?? []);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load pricing';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyRows],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const dirtyKeys = useMemo(() => {
    const dirty = new Set<string>();
    for (const row of rows) {
      const key = rowKey(row.categoryId, row.serviceName);
      const next = parseAmount(drafts[key] ?? '');
      if (next === null || next !== row.priceUgx) dirty.add(key);
    }
    return dirty;
  }, [drafts, rows]);

  const invalidKeys = useMemo(() => {
    const invalid = new Set<string>();
    for (const row of rows) {
      const key = rowKey(row.categoryId, row.serviceName);
      if (parseAmount(drafts[key] ?? '') === null) invalid.add(key);
    }
    return invalid;
  }, [drafts, rows]);

  const save = useCallback(async () => {
    const payload = rows
      .map((row) => {
        const key = rowKey(row.categoryId, row.serviceName);
        if (!dirtyKeys.has(key)) return null;
        const priceUgx = parseAmount(drafts[key] ?? '');
        if (priceUgx === null) return null;
        return { categoryId: row.categoryId, serviceName: row.serviceName, priceUgx };
      })
      .filter((row): row is { categoryId: string; serviceName: string; priceUgx: number } => Boolean(row));

    if (payload.length === 0) {
      toast.error(invalidKeys.size > 0 ? 'Enter a valid amount for each edited service.' : 'No changes to save.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/service-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: payload }),
      });
      const json = (await res.json()) as { prices?: PriceRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to save prices');
      applyRows(json.prices ?? rows);
      toast.success(
        payload.length === 1 ? '1 service price saved' : `${payload.length} service prices saved`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save prices');
    } finally {
      setSaving(false);
    }
  }, [applyRows, drafts, dirtyKeys, invalidKeys.size, rows]);

  useEffect(() => {
    if (dirtyKeys.size === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirtyKeys.size]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (dirtyKeys.size > 0 && !saving) void save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirtyKeys.size, save, saving]);

  const stats = useMemo(() => {
    const custom = rows.filter((row) => row.isCustom).length;
    const catalogValue = rows.reduce((sum, row) => sum + (Number.isFinite(row.priceUgx) ? row.priceUgx : 0), 0);
    return {
      total: rows.length,
      custom,
      defaults: rows.length - custom,
      catalogValue,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const key = rowKey(row.categoryId, row.serviceName);
      const matchesQuery =
        q.length === 0 ||
        row.serviceName.toLowerCase().includes(q) ||
        row.categoryTitle.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || row.categoryId === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unsaved' && dirtyKeys.has(key)) ||
        (statusFilter === 'custom' && row.isCustom) ||
        (statusFilter === 'default' && !row.isCustom);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, dirtyKeys, query, rows, statusFilter]);

  const grouped = useMemo(() => {
    const byId = new Map<string, PriceRow[]>();
    for (const row of filteredRows) {
      const list = byId.get(row.categoryId) ?? [];
      list.push(row);
      byId.set(row.categoryId, list);
    }

    const order =
      categoryFilter === 'all' ? userServiceCategories.map((c) => c.id) : [categoryFilter];

    return order
      .filter((id) => byId.has(id))
      .map((id) => {
        const cat = userServiceCategories.find((c) => c.id === id);
        const list = byId.get(id)!;
        const amounts = list
          .map((row) => parseAmount(drafts[rowKey(row.categoryId, row.serviceName)] ?? '') ?? row.priceUgx)
          .filter((n) => Number.isFinite(n));
        return {
          id,
          title: cat?.title ?? list[0]?.categoryTitle ?? id,
          priority: cat?.priority ?? categoryPriority(id),
          rows: list,
          dirtyCount: list.filter((row) => dirtyKeys.has(rowKey(row.categoryId, row.serviceName))).length,
          min: amounts.length ? Math.min(...amounts) : 0,
          max: amounts.length ? Math.max(...amounts) : 0,
        };
      });
  }, [categoryFilter, dirtyKeys, drafts, filteredRows]);

  function discardAll() {
    applyRows(rows);
    toast.message('Unsaved price changes discarded');
  }

  function discardRow(row: PriceRow) {
    const key = rowKey(row.categoryId, row.serviceName);
    setDrafts((prev) => ({ ...prev, [key]: String(row.priceUgx) }));
  }

  function resetToCatalogDefault(row: PriceRow) {
    const fallback = catalogDefaultPrice(row.categoryId, row.serviceName);
    if (fallback === null) return;
    setDrafts((prev) => ({ ...prev, [rowKey(row.categoryId, row.serviceName)]: String(fallback) }));
  }

  async function handleRefresh() {
    if (dirtyKeys.size > 0) {
      const proceed = window.confirm('You have unsaved price changes. Refresh and discard them?');
      if (!proceed) return;
    }
    await load('refresh');
  }

  if (loading) {
    return <PricingLoadingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 pb-28 pt-2 md:px-8 md:pb-32 md:pt-4">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-primary/[0.07] via-card to-card px-5 py-6 shadow-md ring-1 ring-black/4 dark:ring-white/6 md:px-8 md:py-7">
        <div
          className="pointer-events-none absolute -right-4 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary sm:flex">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Platform</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Service pricing
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Set the amounts buyers see when they book. These are platform prices — providers cannot
                override them. Use Ctrl/⌘+S to save.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border/80 bg-background/80"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 shadow-sm"
              disabled={saving || dirtyKeys.size === 0}
              onClick={() => void save()}
            >
              <Save className="h-4 w-4" aria-hidden />
              {saving ? 'Saving…' : dirtyKeys.size > 0 ? `Save ${dirtyKeys.size}` : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Layers className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Services</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Live catalog lines buyers can book</p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <Filter className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">In view</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {filteredRows.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">After search, category, and status</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Tag className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Custom rates</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{stats.custom}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.defaults} still on catalog defaults
          </p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-4 shadow-sm',
            dirtyKeys.size > 0
              ? 'border-primary/30 bg-primary/8'
              : 'border-emerald-500/25 bg-emerald-500/6 dark:bg-emerald-500/10',
          )}
        >
          <div
            className={cn(
              'flex items-center gap-2',
              dirtyKeys.size > 0 ? 'text-primary' : 'text-emerald-800 dark:text-emerald-400',
            )}
          >
            {dirtyKeys.size > 0 ? (
              <Save className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Check className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {dirtyKeys.size > 0 ? 'Unsaved' : 'Catalog value'}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {dirtyKeys.size > 0 ? dirtyKeys.size : formatUgxAmount(stats.catalogValue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dirtyKeys.size > 0
              ? invalidKeys.size > 0
                ? `${invalidKeys.size} need a valid amount`
                : 'Ready to publish to buyers'
              : 'Sum of current list prices'}
          </p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight">Search &amp; filter</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Find a service, jump to a category, or isolate unsaved and custom rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <span>{error}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void load('refresh')}>
                Retry
              </Button>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pricing-search" className="text-xs font-medium text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pricing-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Service or category…"
                  className="h-10 border-border/80 bg-background/80 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 border-border/80 bg-background/80">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {userServiceCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-10 border-border/80 bg-background/80">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rates</SelectItem>
                  <SelectItem value="unsaved">Unsaved only</SelectItem>
                  <SelectItem value="custom">Custom only</SelectItem>
                  <SelectItem value="default">Catalog defaults</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 && error ? (
        <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
          <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Banknote className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground">Pricing could not be loaded</p>
            <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void load('refresh')}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
          <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground/60" aria-hidden />
            <p className="text-sm font-medium text-foreground">No services match these filters</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Clear search or switch category and status to see the catalog again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setQuery('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
            >
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const isCollapsed = Boolean(collapsed[group.id]);
            const accent =
              group.priority === 'urgent'
                ? 'from-rose-500/80'
                : group.priority === 'optional'
                  ? 'from-muted-foreground/45'
                  : 'from-sky-500/80';
            return (
              <section
                key={group.id}
                className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/6"
              >
                <div
                  className={cn('absolute left-0 top-0 h-full w-1 bg-linear-to-b to-transparent', accent)}
                  aria-hidden
                />
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                  aria-expanded={!isCollapsed}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                        {group.title}
                      </h2>
                      {group.dirtyCount > 0 ? (
                        <Badge className="border-primary/25 bg-primary/10 text-primary">
                          {group.dirtyCount} unsaved
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.rows.length} {group.rows.length === 1 ? 'service' : 'services'}
                      {' · '}
                      {group.min === group.max
                        ? formatUgxAmount(group.min)
                        : `${formatUgxAmount(group.min)} – ${formatUgxAmount(group.max)}`}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      isCollapsed && '-rotate-90',
                    )}
                    aria-hidden
                  />
                </button>
                {!isCollapsed ? (
                  <div className="border-t border-border/60">
                    <div className="hidden grid-cols-[minmax(0,1.5fr)_11rem_minmax(12rem,16rem)_7.5rem] gap-3 border-b border-border/50 bg-muted/25 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
                      <span>Service</span>
                      <span>Buyer sees</span>
                      <span>List price</span>
                      <span className="text-right">Status</span>
                    </div>
                    <ul className="divide-y divide-border/60">
                      {group.rows.map((row) => {
                        const key = rowKey(row.categoryId, row.serviceName);
                        const draft = drafts[key] ?? String(row.priceUgx);
                        const parsed = parseAmount(draft);
                        const dirty = dirtyKeys.has(key);
                        const invalid = invalidKeys.has(key);
                        const catalogDefault = catalogDefaultPrice(row.categoryId, row.serviceName);
                        const differsFromCatalog =
                          catalogDefault !== null && (parsed ?? row.priceUgx) !== catalogDefault;
                        return (
                          <li
                            key={key}
                            className={cn(
                              'grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_11rem_minmax(12rem,16rem)_7.5rem] lg:items-center',
                              dirty && 'bg-primary/[0.04]',
                              invalid && 'bg-destructive/[0.04]',
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-snug text-foreground">
                                {row.serviceName}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground lg:hidden">
                                {row.categoryTitle}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden">
                                Buyer sees
                              </p>
                              <p
                                className={cn(
                                  'text-sm font-semibold tabular-nums tracking-tight',
                                  invalid ? 'text-destructive' : 'text-foreground',
                                )}
                              >
                                {parsed === null ? 'Enter an amount' : formatUgxAmount(parsed)}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <Label
                                htmlFor={`price-${key}`}
                                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:sr-only"
                              >
                                List price
                              </Label>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                                  UGX
                                </span>
                                <Input
                                  id={`price-${key}`}
                                  inputMode="numeric"
                                  value={focusedKey === key ? draft : formatAmountInput(draft)}
                                  aria-invalid={invalid}
                                  className={cn(
                                    'h-10 border-border/80 bg-background/90 pl-12 pr-3 text-right font-medium tabular-nums',
                                    invalid && 'border-destructive/50 focus-visible:ring-destructive/30',
                                    dirty && !invalid && 'border-primary/40',
                                  )}
                                  onFocus={() => setFocusedKey(key)}
                                  onBlur={() => setFocusedKey(null)}
                                  onChange={(e) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [key]: e.target.value.replace(/\D/g, ''),
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (dirtyKeys.size > 0) void save();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 lg:justify-end">
                              <div className="flex min-w-0 flex-col items-start gap-1 lg:items-end">
                                {invalid ? (
                                  <Badge variant="destructive">Invalid</Badge>
                                ) : dirty ? (
                                  <Badge className="border-primary/25 bg-primary/10 text-primary">Unsaved</Badge>
                                ) : row.isCustom ? (
                                  <Badge variant="secondary">Custom</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Default
                                  </Badge>
                                )}
                                <div className="flex items-center gap-2">
                                  {dirty ? (
                                    <button
                                      type="button"
                                      className="text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                      onClick={() => discardRow(row)}
                                    >
                                      Discard
                                    </button>
                                  ) : null}
                                  {differsFromCatalog ? (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                      onClick={() => resetToCatalogDefault(row)}
                                    >
                                      <RotateCcw className="h-3 w-3" aria-hidden />
                                      Default
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {dirtyKeys.size > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 px-4 md:left-[16.5rem] md:px-8">
          <div className="pointer-events-auto mx-auto flex max-w-[1600px] flex-col gap-3 rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-xl ring-1 ring-black/8 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:ring-white/10">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {dirtyKeys.size} unsaved {dirtyKeys.size === 1 ? 'change' : 'changes'}
              </p>
              <p className="text-xs text-muted-foreground">
                {invalidKeys.size > 0
                  ? `${invalidKeys.size} ${invalidKeys.size === 1 ? 'row needs' : 'rows need'} a valid amount before save.`
                  : 'Buyers will see the new amounts as soon as you save.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={discardAll}>
                Discard all
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
                <Save className="h-4 w-4" aria-hidden />
                {saving ? 'Saving…' : 'Save prices'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
