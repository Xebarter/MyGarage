'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import type { AdminComprehensiveAnalytics } from '@/lib/admin-comprehensive-analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RangeSelector } from '@/components/analytics/range-selector';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  Filter,
  Globe,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Copy,
  Layers2,
  Megaphone,
  Package,
  Percent,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Tag,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const NO_SALES_BAR = '#e11d48';

function formatUgx(n: number) {
  return `UGX ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function buildQuery(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.07]',
        className,
      )}
    >
      <div className="border-b border-border/60 bg-muted/30 px-5 py-3.5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </div>
  );
}

function InventoryVelocityRow({
  rank,
  name,
  units,
  revenue,
  maxUnits,
  barClassName,
}: {
  rank: number;
  name: string;
  units: number;
  revenue: number;
  maxUnits: number;
  barClassName: string;
}) {
  const widthPct = maxUnits > 0 ? Math.max(6, Math.round((units / maxUnits) * 100)) : 6;
  return (
    <li className="flex flex-col gap-3 py-3.5 first:pt-2 last:pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-xs font-bold tabular-nums text-muted-foreground"
          aria-hidden
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium leading-snug text-foreground">{name}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" title={`${units} units in period`}>
            <div
              className={cn('h-full rounded-full transition-[width]', barClassName)}
              style={{ width: `${widthPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 sm:text-right">
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatUgx(revenue)}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{units} units</span>
      </div>
    </li>
  );
}

function NoSalesListingsExplorer({
  items,
  pricingByProductId,
}: {
  items: AdminComprehensiveAnalytics['inventory']['deadStockCandidates'];
  pricingByProductId: Map<string, AdminComprehensiveAnalytics['inventory']['pricingInsights'][number]>;
}) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('__all__');
  const [sortBy, setSortBy] = useState<'name' | 'category'>('name');

  const normalizedItems = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        category: it.category.trim() || 'Uncategorized',
      })),
    [items],
  );

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of normalizedItems) {
      m.set(it.category, (m.get(it.category) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }, [normalizedItems]);

  const chartRows = useMemo(() => {
    const top = categoryCounts.slice(0, 10);
    const rest = categoryCounts.slice(10);
    const other = rest.reduce((s, [, n]) => s + n, 0);
    const rows = top.map(([fullName, count]) => ({
      count,
      fullName,
      label: fullName.length > 22 ? `${fullName.slice(0, 22)}…` : fullName,
    }));
    if (other > 0) {
      rows.push({ count: other, fullName: 'Other', label: 'Other' });
    }
    return rows;
  }, [categoryCounts]);

  const maxCatCount = useMemo(() => Math.max(1, ...chartRows.map((r) => r.count)), [chartRows]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = normalizedItems;
    if (q.length > 0) {
      out = out.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== '__all__') {
      out = out.filter((i) => i.category === categoryFilter);
    }
    const sorted = [...out];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else {
      sorted.sort(
        (a, b) =>
          a.category.localeCompare(b.category, undefined, { sensitivity: 'base' }) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
    }
    return sorted;
  }, [normalizedItems, query, categoryFilter, sortBy]);

  const promoMatchesInResults = useMemo(
    () => filteredSorted.filter((i) => pricingByProductId.has(i.id)).length,
    [filteredSorted, pricingByProductId],
  );

  const copyProductId = useCallback((id: string) => {
    void navigator.clipboard.writeText(id).then(
      () => toast.success('Product ID copied'),
      () => toast.error('Could not copy'),
    );
  }, []);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Package className="h-7 w-7" aria-hidden />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">Nothing to flag</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Every tracked published listing had at least one order in this window. Try another date range if you expect
          idle SKUs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-rose-500/20 bg-linear-to-br from-rose-500/6 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-rose-500/10 dark:ring-white/6 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Idle listings
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Live SKUs with <span className="font-medium text-foreground">zero unit sales</span> in the selected period.
              Filter and sort to prioritize bundles, SEO, or catalog cleanup. The API returns up to{' '}
              <span className="tabular-nums font-medium text-foreground">20</span> candidates per load.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              <Layers2 className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
              <span>
                <span className="font-semibold tabular-nums text-foreground">{categoryCounts.length}</span> categories
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              <Percent className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
              <span>
                <span className="font-semibold tabular-nums text-foreground">{promoMatchesInResults}</span> /{' '}
                <span className="tabular-nums">{filteredSorted.length}</span> in view overlap pricing table
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-3">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">Mix by category</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Volume of no-sales SKUs per category (top 10 + other).</p>
          </div>
          <div className="p-4 sm:p-5">
            {chartRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories.</p>
            ) : (
              <div className="h-[min(17rem,45vh)] w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartRows}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, maxCatCount]} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={118} tick={{ fontSize: 10 }} interval={0} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Listings']}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                        return row?.fullName ?? '';
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Listings">
                      {chartRows.map((row) => (
                        <Cell
                          key={`${row.fullName}-${row.count}`}
                          fill={row.fullName === 'Other' ? '#94a3b8' : NO_SALES_BAR}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-2">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">Category rollup</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Click a row to filter the grid (again to clear).</p>
          </div>
          <ul className="max-h-[min(17rem,45vh)] min-h-[200px] space-y-0 divide-y divide-border/50 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            {categoryCounts.map(([cat, n]) => {
              const active = categoryFilter === cat;
              return (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(active ? '__all__' : cat)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                      active ? 'bg-rose-500/10 font-medium text-rose-900 dark:text-rose-100' : 'hover:bg-muted/50',
                    )}
                    aria-pressed={active}
                  >
                    <span className="min-w-0 truncate">{cat}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-10 pl-9"
            placeholder="Search name, ID, or category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter no-sales listings"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v === 'category' ? 'category' : 'name')}>
          <SelectTrigger className="h-10 w-full sm:w-[200px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Product name (A–Z)</SelectItem>
            <SelectItem value="category">Sort: Category, then name</SelectItem>
          </SelectContent>
        </Select>
        {(query.trim() !== '' || categoryFilter !== '__all__') && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 shrink-0"
            onClick={() => {
              setQuery('');
              setCategoryFilter('__all__');
            }}
          >
            Reset filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={categoryFilter === '__all__' ? 'default' : 'outline'}
          className="h-8 rounded-full px-3"
          onClick={() => setCategoryFilter('__all__')}
        >
          All
          <span className="ml-1.5 tabular-nums opacity-80">({items.length})</span>
        </Button>
        {categoryCounts.slice(0, 8).map(([cat, n]) => {
          const active = categoryFilter === cat;
          return (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="h-8 max-w-[220px] rounded-full px-3"
              onClick={() => setCategoryFilter(active ? '__all__' : cat)}
              title={cat}
            >
              <span className="truncate">{cat}</span>
              <span className="ml-1.5 shrink-0 tabular-nums opacity-80">{n}</span>
            </Button>
          );
        })}
      </div>

      {filteredSorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-12 text-center">
          <Search className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">No listings match</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing search or category filters.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setQuery('');
              setCategoryFilter('__all__');
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSorted.map((p) => {
            const pricing = pricingByProductId.get(p.id);
            return (
              <li
                key={p.id}
                className="group flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm ring-1 ring-black/4 transition-[box-shadow,border-color] hover:border-rose-500/25 hover:shadow-md dark:ring-white/7"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-400"
                    aria-hidden
                  >
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-foreground line-clamp-2">{p.name}</p>
                    <Badge variant="secondary" className="mt-2 max-w-full truncate font-normal">
                      {p.category}
                    </Badge>
                  </div>
                </div>

                {pricing ? (
                  <div className="mt-4 space-y-1 border-t border-border/55 pt-3 text-xs">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-muted-foreground">Shelf</span>
                      <span className="font-semibold tabular-nums text-foreground">{formatUgx(pricing.price)}</span>
                    </div>
                    {pricing.compareAt != null ? (
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-muted-foreground">Compare at</span>
                        <span className="tabular-nums text-muted-foreground line-through">
                          {formatUgx(pricing.compareAt)}
                        </span>
                      </div>
                    ) : null}
                    {pricing.discountPct != null && pricing.discountPct > 0 ? (
                      <div className="pt-1">
                        <Badge className="tabular-nums">{pricing.discountPct}% off</Badge>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 border-t border-border/55 pt-3 text-xs leading-relaxed text-muted-foreground">
                    Not in the promo / compare-at sample on this report — open the catalog to inspect price.
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2 border-t border-border/55 pt-3">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                    {p.id}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => copyProductId(p.id)}
                    aria-label={`Copy product ID ${p.id}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function vendorRankBadgeClass(rank: number) {
  if (rank === 1) {
    return 'bg-amber-500/20 text-amber-900 ring-1 ring-amber-500/35 dark:text-amber-300';
  }
  if (rank === 2) {
    return 'bg-slate-400/20 text-slate-800 ring-1 ring-slate-400/35 dark:text-slate-200';
  }
  if (rank === 3) {
    return 'bg-orange-600/20 text-orange-950 ring-1 ring-orange-500/40 dark:text-orange-300';
  }
  return 'bg-muted/90 text-muted-foreground';
}

function VendorAnalyticsSection({
  leaderboard,
  avgRating,
  churnRiskCount,
}: {
  leaderboard: AdminComprehensiveAnalytics['vendors']['leaderboard'];
  avgRating: number;
  churnRiskCount: number;
}) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'fulfillment' | 'name'>('revenue');

  const totalRevenue = useMemo(() => leaderboard.reduce((s, v) => s + v.revenue, 0), [leaderboard]);

  const chartData = useMemo(() => {
    return [...leaderboard]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12)
      .map((v) => ({
        label: v.name.length > 20 ? `${v.name.slice(0, 20)}…` : v.name,
        revenue: v.revenue,
        fullName: v.name,
      }));
  }, [leaderboard]);

  const topThree = useMemo(() => {
    return [...leaderboard].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  }, [leaderboard]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = leaderboard;
    if (q.length > 0) {
      rows = rows.filter((v) => v.name.toLowerCase().includes(q) || v.vendorId.toLowerCase().includes(q));
    }
    const sorted = [...rows];
    switch (sortBy) {
      case 'orders':
        sorted.sort((a, b) => b.orders - a.orders);
        break;
      case 'fulfillment':
        sorted.sort((a, b) => b.fulfillmentRate - a.fulfillmentRate);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        break;
      default:
        sorted.sort((a, b) => b.revenue - a.revenue);
    }
    return sorted;
  }, [leaderboard, query, sortBy]);

  const rowMaxRevenue = useMemo(
    () => Math.max(1, ...filteredSorted.map((v) => v.revenue)),
    [filteredSorted],
  );

  const avgRevenuePerVendor = leaderboard.length > 0 ? totalRevenue / leaderboard.length : 0;

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-violet-500/20 bg-linear-to-br from-violet-500/6 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-violet-500/10 dark:ring-white/6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400"
              aria-hidden
            >
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                Vendors
              </p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                No vendor revenue rows match the current filters. Adjust the date range or clear vendor / category
                filters above.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="no-print shrink-0 gap-2 shadow-sm" asChild>
            <Link href="/admin/vendors">
              <Store className="h-3.5 w-3.5" />
              Vendor directory
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Avg. vendor rating" value={avgRating > 0 ? avgRating.toFixed(2) : '—'} sub="Platform-wide signal" />
          <KpiCard label="Vendors with no revenue" value={String(churnRiskCount)} sub="In selected filters" />
          <KpiCard label="Leaderboard rows" value="0" sub="Try widening filters" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-violet-500/20 bg-linear-to-br from-violet-500/6 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-violet-500/10 dark:ring-white/6 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400"
            aria-hidden
          >
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
              Seller network
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Rankings use <span className="font-medium text-foreground">product order revenue</span> in the selected
              window. Open a vendor workspace for catalog, orders, and dedicated analytics.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="no-print shrink-0 gap-2 shadow-sm" asChild>
          <Link href="/admin/vendors">
            <ExternalLink className="h-3.5 w-3.5" />
            Vendor directory
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Star className="h-4 w-4 shrink-0 fill-violet-500/25 text-violet-600 dark:text-violet-400" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. rating</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {avgRating > 0 ? avgRating.toFixed(2) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Aggregated vendor stars in range</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">No revenue</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{churnRiskCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Vendors at risk in this filter set</p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ranked sellers</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{leaderboard.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">With revenue in leaderboard</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total (leaderboard)</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums leading-snug tracking-tight text-foreground sm:text-xl">
            {formatUgx(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{formatUgx(avgRevenuePerVendor)} avg / vendor
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-3">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">Revenue by vendor</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Top {Math.min(12, leaderboard.length)} by product revenue in this period.</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="h-[min(20rem,50vh)] w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`)} />
                  <YAxis type="category" dataKey="label" width={128} tick={{ fontSize: 10 }} interval={0} />
                  <Tooltip
                    formatter={(v: number) => [formatUgx(Number(v)), 'Revenue']}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                      return row?.fullName ?? '';
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue">
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7">
            <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
                Top 3 spotlight
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">By revenue — quick jump to workspace.</p>
            </div>
            <ul className="divide-y divide-border/50">
              {topThree.map((v, i) => (
                <li key={v.vendorId} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums',
                      vendorRankBadgeClass(i + 1),
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{v.name}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formatUgx(v.revenue)} · {v.orders} orders · {(v.fulfillmentRate * 100).toFixed(0)}% fulfill
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="no-print h-8 w-8 shrink-0" asChild>
                    <Link href={`/admin/vendors/${encodeURIComponent(v.vendorId)}`} aria-label={`Open ${v.name}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Full leaderboard</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Search, sort, and open any vendor. Position numbers follow your sort. Revenue bars scale to the largest row
            in the current results.
          </p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-10 pl-9"
                placeholder="Search vendor name or ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter vendors"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'revenue' | 'orders' | 'fulfillment' | 'name')}>
              <SelectTrigger className="h-10 w-full sm:w-[220px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort: Revenue (high → low)</SelectItem>
                <SelectItem value="orders">Sort: Orders (high → low)</SelectItem>
                <SelectItem value="fulfillment">Sort: Fulfillment (high → low)</SelectItem>
                <SelectItem value="name">Sort: Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
            {query.trim() !== '' && (
              <Button type="button" variant="ghost" size="sm" className="h-10" onClick={() => setQuery('')}>
                Clear search
              </Button>
            )}
          </div>

          {filteredSorted.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
              <p className="mt-2 text-sm font-medium text-foreground">No vendors match</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different search term.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredSorted.map((v, i) => {
                const rank = i + 1;
                const revPct = rowMaxRevenue > 0 ? Math.max(8, Math.round((v.revenue / rowMaxRevenue) * 100)) : 8;
                const fulfillPct = Math.round(v.fulfillmentRate * 100);
                return (
                  <li
                    key={v.vendorId}
                    className="rounded-xl border border-border/70 bg-card/50 p-4 shadow-sm ring-1 ring-black/4 transition-colors hover:border-violet-500/25 hover:bg-card dark:ring-white/7"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
                            sortBy === 'revenue' && rank <= 3
                              ? vendorRankBadgeClass(rank)
                              : 'bg-muted/90 text-muted-foreground',
                          )}
                          aria-hidden
                        >
                          {rank}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold leading-snug text-foreground">{v.name}</p>
                            <Badge variant="outline" className="font-mono text-[10px] font-normal text-muted-foreground">
                              {v.vendorId.length > 14 ? `${v.vendorId.slice(0, 14)}…` : v.vendorId}
                            </Badge>
                          </div>
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                            title={`${formatUgx(v.revenue)} in this result set`}
                          >
                            <div
                              className="h-full rounded-full bg-violet-500/85 dark:bg-violet-400/80"
                              style={{ width: `${revPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-foreground">{formatUgx(v.revenue)}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{v.orders} orders</p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums',
                            fulfillPct >= 90 && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
                            fulfillPct >= 70 &&
                              fulfillPct < 90 &&
                              'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
                            fulfillPct < 70 && 'border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-300',
                          )}
                        >
                          {fulfillPct}% fulfill
                        </span>
                        <Button variant="outline" size="sm" className="no-print h-9 shrink-0 gap-1.5 px-3" asChild>
                          <Link href={`/admin/vendors/${encodeURIComponent(v.vendorId)}`}>
                            Open
                            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function formatOrderStatusLabel(status: string) {
  const t = status.replace(/_/g, ' ').trim();
  if (!t) return status;
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

function OrdersAnalyticsSection({
  orders,
  productOrdersCount,
  servicePaymentsCount,
}: {
  orders: AdminComprehensiveAnalytics['orders'];
  productOrdersCount: number;
  servicePaymentsCount: number;
}) {
  const [statusQuery, setStatusQuery] = useState('');

  const successPct = orders.successPaymentRate * 100;
  const failurePct = orders.failurePaymentRate * 100;
  const paymentOtherPct = Math.max(0, 100 - successPct - failurePct);

  const statusRows = useMemo(() => {
    const rows = Object.entries(orders.statusMix).map(([status, count]) => ({ status, count }));
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [orders.statusMix]);

  const statusBreakdownTotal = useMemo(
    () => statusRows.reduce((s, r) => s + r.count, 0),
    [statusRows],
  );

  const filteredStatusRows = useMemo(() => {
    const q = statusQuery.trim().toLowerCase();
    if (!q) return statusRows;
    return statusRows.filter(
      (r) =>
        r.status.toLowerCase().includes(q) || formatOrderStatusLabel(r.status).toLowerCase().includes(q),
    );
  }, [statusRows, statusQuery]);

  const maxStatusCount = useMemo(
    () => Math.max(1, ...filteredStatusRows.map((r) => r.count)),
    [filteredStatusRows],
  );

  const statusChartData = useMemo(() => {
    return statusRows.slice(0, 14).map((r) => ({
      label:
        formatOrderStatusLabel(r.status).length > 18
          ? `${formatOrderStatusLabel(r.status).slice(0, 18)}…`
          : formatOrderStatusLabel(r.status),
      count: r.count,
      key: r.status,
    }));
  }, [statusRows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-cyan-500/20 bg-linear-to-br from-cyan-500/6 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-cyan-500/10 dark:ring-white/6 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
            aria-hidden
          >
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-400">
              Orders & payments
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Product order statuses</span> reflect in-range shipments with
              line items matching your filters. <span className="font-medium text-foreground">Payment rates</span> come
              from Paytota collection rows (succeeded vs failed). Open the orders desk for full detail.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="no-print shrink-0 gap-2 shadow-sm" asChild>
          <Link href="/admin/orders">
            <ExternalLink className="h-3.5 w-3.5" />
            Orders desk
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Product orders</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{productOrdersCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Checkout rows with product lines (period)</p>
        </div>
        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/6 p-4 shadow-sm dark:bg-indigo-500/10">
          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Service payments</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {servicePaymentsCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Succeeded service checkouts (period)</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Payment success</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {successPct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Share of Paytota collections succeeded</p>
        </div>
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/6 p-4 shadow-sm dark:bg-rose-500/10">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Payment failure</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {failurePct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Share of Paytota collections failed</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-3">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">Payment outcome mix</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Approximate split of tracked collection attempts in range.</p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex h-4 overflow-hidden rounded-full bg-muted shadow-inner">
              {successPct > 0 ? (
                <div
                  className="bg-emerald-500 transition-all dark:bg-emerald-400"
                  style={{ width: `${successPct}%` }}
                  title={`Succeeded ${successPct.toFixed(1)}%`}
                />
              ) : null}
              {failurePct > 0 ? (
                <div
                  className="bg-rose-500 transition-all dark:bg-rose-400"
                  style={{ width: `${failurePct}%` }}
                  title={`Failed ${failurePct.toFixed(1)}%`}
                />
              ) : null}
              {paymentOtherPct > 0.05 ? (
                <div
                  className="bg-muted-foreground/25"
                  style={{ width: `${paymentOtherPct}%` }}
                  title={`Other / pending ${paymentOtherPct.toFixed(1)}%`}
                />
              ) : null}
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                <span className="text-muted-foreground">Succeeded</span>
                <span className="font-semibold tabular-nums text-foreground">{successPct.toFixed(1)}%</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-rose-500" aria-hidden />
                <span className="text-muted-foreground">Failed</span>
                <span className="font-semibold tabular-nums text-foreground">{failurePct.toFixed(1)}%</span>
              </li>
              {paymentOtherPct > 0.05 ? (
                <li className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-muted-foreground/40" aria-hidden />
                  <span className="text-muted-foreground">Other</span>
                  <span className="font-semibold tabular-nums text-foreground">{paymentOtherPct.toFixed(1)}%</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-2">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <Timer className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
              Fulfillment clock
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Mean hours from created → last update (product orders).</p>
          </div>
          <div className="flex flex-col justify-center gap-2 p-5">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {orders.avgProcessingHours != null ? `${orders.avgProcessingHours.toFixed(1)}` : '—'}
              {orders.avgProcessingHours != null ? (
                <span className="ml-1 text-lg font-semibold text-muted-foreground">h</span>
              ) : null}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {orders.avgProcessingHours != null
                ? 'Lower is faster to terminal status; spikes often correlate with carrier or vendor delays.'
                : 'Not enough product orders with timestamps in this window.'}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Product order status mix</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Distribution of <span className="tabular-nums font-medium text-foreground">{statusBreakdownTotal}</span>{' '}
            in-range product orders (after catalog filters). Search to focus a state.
          </p>
        </div>
        <div className="space-y-6 p-4 sm:p-5">
          {statusRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-12 text-center">
              <ShoppingCart className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">No product orders in this window</p>
              <p className="mt-1 text-xs text-muted-foreground">Widen the date range or relax vendor / category filters.</p>
            </div>
          ) : (
            <>
              <div className="h-[min(16rem,40vh)] w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 10 }} interval={0} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Orders']}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { key?: string } | undefined;
                        return row?.key != null ? formatOrderStatusLabel(row.key) : '';
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Orders">
                      {statusChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <div className="relative max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    className="h-10 pl-9"
                    placeholder="Filter statuses…"
                    value={statusQuery}
                    onChange={(e) => setStatusQuery(e.target.value)}
                    aria-label="Filter order statuses"
                  />
                </div>
                {filteredStatusRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No statuses match that search.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {filteredStatusRows.map((row) => {
                      const pct =
                        statusBreakdownTotal > 0 ? Math.round((row.count / statusBreakdownTotal) * 1000) / 10 : 0;
                      const barPct = maxStatusCount > 0 ? Math.max(6, Math.round((row.count / maxStatusCount) * 100)) : 6;
                      return (
                        <li
                          key={row.status}
                          className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 sm:px-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Badge variant="secondary" className="max-w-[min(100%,14rem)] truncate font-normal">
                                {formatOrderStatusLabel(row.status)}
                              </Badge>
                              <span className="text-xs tabular-nums text-muted-foreground">{pct}% of mix</span>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-foreground">{row.count}</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
                            <div
                              className="h-full rounded-full bg-cyan-500/80 dark:bg-cyan-400/75"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketingAnalyticsSection({ marketing }: { marketing: AdminComprehensiveAnalytics['marketing'] }) {
  const [campaignQuery, setCampaignQuery] = useState('');
  const [campaignSort, setCampaignSort] = useState<'uses' | 'code' | 'headroom'>('uses');
  const [proxyQuery, setProxyQuery] = useState('');

  const { campaigns, proxyMostViewed, trafficNote, cpaNote, searchTermsNote } = marketing;

  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.active).length, [campaigns]);
  const totalRedemptions = useMemo(() => campaigns.reduce((s, c) => s + c.uses, 0), [campaigns]);
  const exhaustedCampaigns = useMemo(
    () => campaigns.filter((c) => c.maxUses > 0 && c.uses >= c.maxUses).length,
    [campaigns],
  );

  const filteredCampaigns = useMemo(() => {
    const q = campaignQuery.trim().toLowerCase();
    let rows = campaigns;
    if (q.length > 0) {
      rows = rows.filter(
        (c) => c.code.toLowerCase().includes(q) || c.discountType.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows];
    switch (campaignSort) {
      case 'code':
        sorted.sort((a, b) => a.code.localeCompare(b.code, undefined, { sensitivity: 'base' }));
        break;
      case 'headroom':
        sorted.sort((a, b) => {
          const headA = a.maxUses > 0 ? a.maxUses - a.uses : Number.MAX_SAFE_INTEGER;
          const headB = b.maxUses > 0 ? b.maxUses - b.uses : Number.MAX_SAFE_INTEGER;
          return headB - headA;
        });
        break;
      default:
        sorted.sort((a, b) => b.uses - a.uses);
    }
    return sorted;
  }, [campaigns, campaignQuery, campaignSort]);

  const campaignChartData = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 12)
      .map((c) => ({
        label: c.code.length > 16 ? `${c.code.slice(0, 16)}…` : c.code,
        uses: c.uses,
        fullCode: c.code,
      }));
  }, [campaigns]);

  const maxChartUses = useMemo(() => Math.max(1, ...campaignChartData.map((d) => d.uses)), [campaignChartData]);

  const topCampaignSpotlight = useMemo(() => {
    return [...campaigns].sort((a, b) => b.uses - a.uses).slice(0, 4);
  }, [campaigns]);

  const maxProxyScore = useMemo(
    () => Math.max(1, ...proxyMostViewed.map((p) => p.score)),
    [proxyMostViewed],
  );

  const filteredProxy = useMemo(() => {
    const q = proxyQuery.trim().toLowerCase();
    if (!q) return proxyMostViewed;
    return proxyMostViewed.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [proxyMostViewed, proxyQuery]);

  const proxyChartData = useMemo(() => {
    return [...proxyMostViewed]
      .slice(0, 12)
      .map((p) => ({
        label: p.name.length > 18 ? `${p.name.slice(0, 18)}…` : p.name,
        score: p.score,
        fullName: p.name,
      }));
  }, [proxyMostViewed]);

  const copyCode = useCallback((code: string) => {
    void navigator.clipboard.writeText(code).then(
      () => toast.success('Code copied'),
      () => toast.error('Could not copy'),
    );
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-fuchsia-500/20 bg-linear-to-br from-fuchsia-500/6 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-fuchsia-500/10 dark:ring-white/6 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400"
            aria-hidden
          >
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800 dark:text-fuchsia-400">
              Marketing & growth
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Promotions pull from the campaigns table; merchandising scores blend featured placement with a lightweight
              sales signal. Traffic, CPA, and search-term depth still need telemetry — see the roadmap cards below.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="no-print gap-2 shadow-sm" asChild>
            <Link href="/admin/promotions">
              <Tag className="h-3.5 w-3.5" />
              Promotions
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" className="no-print gap-2 shadow-sm" asChild>
            <Link href="/admin/products">
              <Package className="h-3.5 w-3.5" />
              Catalog
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/4 dark:ring-white/7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-600 dark:text-sky-400">
            <Globe className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traffic & attribution</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{trafficNote}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/4 dark:ring-white/7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acquisition cost</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{cpaNote}</p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/4 dark:ring-white/7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-400">
            <Search className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On-site search</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{searchTermsNote}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/6 p-4 shadow-sm dark:bg-fuchsia-500/10">
          <div className="flex items-center gap-2 text-fuchsia-800 dark:text-fuchsia-300">
            <Tag className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Campaigns</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{campaigns.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Rows in this admin sample (up to 12)</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active now</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{activeCampaigns}</p>
          <p className="mt-1 text-xs text-muted-foreground">Promotions flagged active in catalog</p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Redemptions</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{totalRedemptions}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sum of reported uses in sample</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">At cap</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{exhaustedCampaigns}</p>
          <p className="mt-1 text-xs text-muted-foreground">Uses ≥ max (finite caps only)</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-3">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
            <h4 className="text-sm font-semibold tracking-tight text-foreground">Redemptions by code</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Top campaigns by current-use counter in this export.</p>
          </div>
          <div className="p-4 sm:p-5">
            {campaignChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag className="h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No promotion rows</p>
                <p className="mt-1 text-xs text-muted-foreground">Create a campaign under Promotions to see it here.</p>
              </div>
            ) : (
              <div className="h-[min(18rem,42vh)] w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={campaignChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, maxChartUses]} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={112} tick={{ fontSize: 10 }} interval={0} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Uses']}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { fullCode?: string } | undefined;
                        return row?.fullCode ?? '';
                      }}
                    />
                    <Bar dataKey="uses" radius={[0, 6, 6, 0]} name="Uses">
                      {campaignChartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7 lg:col-span-2">
          <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <Sparkles className="h-4 w-4 text-fuchsia-500" aria-hidden />
              Hot codes
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Quick copy for support or social.</p>
          </div>
          <ul className="divide-y divide-border/50">
            {topCampaignSpotlight.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">No campaigns yet.</li>
            ) : (
              topCampaignSpotlight.map((c) => {
                const pct = c.maxUses > 0 ? Math.min(100, Math.round((c.uses / c.maxUses) * 100)) : null;
                return (
                  <li key={c.code} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                          {c.code}
                        </code>
                        {c.active ? (
                          <Badge className="h-5 text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                            Paused
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.uses} uses
                        {c.maxUses > 0 ? ` · cap ${c.maxUses}` : ' · no cap'}
                        {pct != null ? ` · ${pct}% full` : null}
                      </p>
                      {c.maxUses > 0 ? (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pct != null && pct >= 95 ? 'bg-amber-500' : 'bg-fuchsia-500/85',
                            )}
                            style={{ width: `${pct ?? 0}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyCode(c.code)}
                      aria-label={`Copy code ${c.code}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">All campaigns in sample</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">Search, sort, and inspect discount type & caps.</p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-10 pl-9"
                placeholder="Search code or discount type…"
                value={campaignQuery}
                onChange={(e) => setCampaignQuery(e.target.value)}
                aria-label="Filter campaigns"
              />
            </div>
            <Select
              value={campaignSort}
              onValueChange={(v) => setCampaignSort(v as 'uses' | 'code' | 'headroom')}
            >
              <SelectTrigger className="h-10 w-full sm:w-[240px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uses">Sort: Uses (high → low)</SelectItem>
                <SelectItem value="code">Sort: Code (A–Z)</SelectItem>
                <SelectItem value="headroom">Sort: Headroom (most room first)</SelectItem>
              </SelectContent>
            </Select>
            {campaignQuery.trim() !== '' && (
              <Button type="button" variant="ghost" size="sm" className="h-10" onClick={() => setCampaignQuery('')}>
                Clear
              </Button>
            )}
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-10 text-center text-sm text-muted-foreground">
              No campaigns match that filter.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCampaigns.map((c) => {
                const pct = c.maxUses > 0 ? Math.min(100, Math.round((c.uses / c.maxUses) * 100)) : null;
                const barW = pct ?? (c.uses > 0 ? 100 : 0);
                return (
                  <li
                    key={c.code}
                    className="rounded-xl border border-border/70 bg-muted/5 p-4 shadow-sm ring-1 ring-black/4 transition-colors hover:border-fuchsia-500/20 dark:ring-white/7"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <code className="font-mono text-sm font-semibold text-foreground">{c.code}</code>
                        <p className="mt-1 text-xs text-muted-foreground">{c.discountType}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {c.active ? <Badge className="text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px] font-normal">Off</Badge>}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyCode(c.code)}
                          aria-label={`Copy ${c.code}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.uses}</span> /{' '}
                        {c.maxUses > 0 ? c.maxUses : '∞'} uses
                      </span>
                      {pct != null ? (
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">{pct}%</span>
                      ) : null}
                    </div>
                    {c.maxUses > 0 ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            pct != null && pct >= 100 ? 'bg-amber-500' : 'bg-fuchsia-500/80',
                          )}
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    ) : c.uses > 0 ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-full rounded-full bg-fuchsia-500/40" />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/4 dark:ring-white/7">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">Merchandising proxy</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Featured listings weighted by a simple sales signal — not true page views until events are logged.
          </p>
        </div>
        <div className="space-y-6 p-4 sm:p-5">
          {proxyMostViewed.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 py-12 text-center">
              <BarChart3 className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">No merchandising scores</p>
              <p className="mt-1 text-xs text-muted-foreground">Feature products in the catalog to populate this list.</p>
            </div>
          ) : (
            <>
              <div className="h-[min(16rem,38vh)] w-full min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={proxyChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} interval={0} />
                    <Tooltip
                      formatter={(v: number) => [v, 'Score']}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                        return row?.fullName ?? '';
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]} fill="#c026d3" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="relative max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  className="h-10 pl-9"
                  placeholder="Filter listings…"
                  value={proxyQuery}
                  onChange={(e) => setProxyQuery(e.target.value)}
                  aria-label="Filter merchandising list"
                />
              </div>

              {filteredProxy.length === 0 ? (
                <p className="text-sm text-muted-foreground">No listings match that search.</p>
              ) : (
                <ul className="space-y-2">
                  {filteredProxy.map((p) => {
                    const w = maxProxyScore > 0 ? Math.max(8, Math.round((p.score / maxProxyScore) * 100)) : 8;
                    return (
                      <li
                        key={p.id}
                        className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 sm:px-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0 font-medium leading-snug text-foreground line-clamp-2">{p.name}</span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-fuchsia-700 dark:text-fuchsia-400">
                            {p.score}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
                          <div
                            className="h-full rounded-full bg-fuchsia-500/75 dark:bg-fuchsia-400/70"
                            style={{ width: `${w}%` }}
                          />
                        </div>
                        <p className="mt-1.5 truncate font-mono text-[10px] text-muted-foreground">{p.id}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadAnalyticsCsv(data: AdminComprehensiveAnalytics) {
  const lines: string[][] = [
    ['MyGarage admin analytics export'],
    ['Generated', data.meta.generatedAt],
    ['From', data.meta.from],
    ['To', data.meta.to],
    [],
    ['Overview'],
    ['Total revenue', String(data.overview.revenueTotal)],
    ['Product order revenue', String(data.overview.productOrderRevenue)],
    ['Service revenue', String(data.overview.serviceRevenue)],
    ['Product orders', String(data.overview.productOrdersCount)],
    ['Service payments', String(data.overview.servicePaymentsCount)],
    ['Gross profit (est.)', String(data.overview.grossProfitEstimate)],
    ['Net profit (est.)', String(data.overview.netProfitEstimate)],
    ['Platform commission (est.)', String(data.overview.platformCommissionEstimate)],
    ['AOV', String(data.overview.averageOrderValue)],
    ['Active buyers', String(data.overview.activeBuyers)],
    ['Active vendors', String(data.overview.activeVendors)],
    [],
    ['Sales by category', 'Revenue'],
    ...data.sales.revenueByCategory.map((r) => [r.name, String(r.revenue)]),
    [],
    ['Top products', 'Units', 'Revenue'],
    ...data.sales.topProducts.map((p) => [p.name, String(p.units), String(p.revenue)]),
  ];
  const csv = lines.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mygarage-analytics-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV export downloaded');
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { pct: number; label: string };
  className?: string;
}) {
  const up = trend && trend.pct >= 0;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 pl-5 shadow-sm ring-1 ring-black/[0.04] transition-all duration-200 dark:ring-white/[0.07] hover:shadow-md',
        'before:absolute before:top-3 before:bottom-3 before:left-0 before:w-[3px] before:rounded-full before:bg-primary/75',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {sub ? <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{sub}</p> : null}
      {trend ? (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-medium',
            up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
          )}
        >
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(trend.pct).toFixed(1)}% {trend.label}
        </p>
      ) : null}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-8 px-4 py-6 md:px-8">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-8">
        <div className="h-6 w-40 rounded-md bg-muted" />
        <div className="mt-3 h-4 max-w-lg rounded bg-muted/80" />
        <div className="mt-6 flex flex-wrap gap-2">
          <div className="h-9 w-24 rounded-lg bg-muted" />
          <div className="h-9 w-24 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border border-border/50 bg-muted/40" />
        ))}
      </div>
      <div className="h-36 rounded-xl border border-border/50 bg-muted/30" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-80 rounded-xl border border-border/50 bg-muted/35" />
        <div className="h-80 rounded-xl border border-border/50 bg-muted/35" />
      </div>
    </div>
  );
}

export function AdminAnalyticsClient() {
  const [preset, setPreset] = useState<'7d' | '30d' | '90d' | 'ytd' | 'custom'>('30d');
  const [fromStr, setFromStr] = useState(() => format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd'));
  const [toStr, setToStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [vendorId, setVendorId] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [data, setData] = useState<AdminComprehensiveAnalytics | null>(null);
  const dataRef = useRef<AdminComprehensiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [compareMode, setCompareMode] = useState(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const applyPreset = useCallback((p: typeof preset) => {
    const to = new Date();
    let from = new Date();
    if (p === '7d') from = new Date(to.getTime() - 7 * 86400000);
    else if (p === '30d') from = new Date(to.getTime() - 30 * 86400000);
    else if (p === '90d') from = new Date(to.getTime() - 90 * 86400000);
    else if (p === 'ytd') from = new Date(to.getFullYear(), 0, 1);
    else return;
    setFromStr(format(from, 'yyyy-MM-dd'));
    setToStr(format(to, 'yyyy-MM-dd'));
  }, []);

  const load = useCallback(async () => {
    const hasData = dataRef.current != null;
    const hadDataBeforeRequest = hasData;
    try {
      setError(null);
      if (hasData) setRefreshing(true);
      else setLoading(true);

      const from = new Date(`${fromStr}T00:00:00.000Z`);
      const to = new Date(`${toStr}T23:59:59.999Z`);
      const q = buildQuery({
        from: from.toISOString(),
        to: to.toISOString(),
        vendorId: vendorId || undefined,
        productCategory: productCategory || undefined,
        serviceCategory: serviceCategory || undefined,
      });
      const res = await fetch(`/api/admin/analytics${q}`, { cache: 'no-store' });
      const payload = (await res.json().catch(() => ({}))) as
        | AdminComprehensiveAnalytics
        | { error?: string; hint?: string };
      if (!res.ok) {
        const errObj = payload as { error?: string; hint?: string };
        const msg = [errObj.error, errObj.hint].filter(Boolean).join(' — ') || `Request failed (${res.status})`;
        throw new Error(msg);
      }
      const next = payload as AdminComprehensiveAnalytics;
      if (!next?.overview) {
        throw new Error('Invalid analytics response from server');
      }
      setData(next);
      dataRef.current = next;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Could not load analytics. Check your connection and try again.');
      if (!dataRef.current) setData(null);
      if (hadDataBeforeRequest) toast.error('Could not refresh analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromStr, toStr, vendorId, productCategory, serviceCategory]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  useEffect(() => {
    if (preset === 'custom') return;
    applyPreset(preset);
  }, [preset, applyPreset]);

  const categoryCompareData = useMemo(() => {
    if (!data) return [];
    return data.sales.revenueByCategory.map((c) => ({
      name: c.name.length > 16 ? `${c.name.slice(0, 16)}…` : c.name,
      current: c.revenue,
      previous: Math.max(0, c.revenue * (1 - (data.overview.revenueMomPct ?? 0) / 100)),
    }));
  }, [data]);

  const heatMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(
      1,
      ...data.heatmapWeekday.map((h) => h.productOrders + h.serviceBookings),
    );
  }, [data]);

  const invFastMaxUnits = useMemo(() => {
    if (!data?.inventory.fastMovers.length) return 1;
    return Math.max(1, ...data.inventory.fastMovers.map((p) => p.units));
  }, [data]);

  const invSlowMaxUnits = useMemo(() => {
    if (!data?.inventory.slowMovers.length) return 1;
    return Math.max(1, ...data.inventory.slowMovers.map((p) => p.units));
  }, [data]);

  const deadStockPricingById = useMemo(() => {
    const m = new Map<string, AdminComprehensiveAnalytics['inventory']['pricingInsights'][number]>();
    if (!data) return m;
    for (const p of data.inventory.pricingInsights) {
      m.set(p.id, p);
    }
    return m;
  }, [data]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data) return '';
    try {
      return formatDistanceToNow(new Date(data.meta.generatedAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [data]);

  const resetFilters = useCallback(() => {
    setVendorId('');
    setProductCategory('');
    setServiceCategory('');
  }, []);

  if (loading && !data) {
    return <PageSkeleton />;
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6 text-destructive shadow-sm ring-1 ring-destructive/10">
          <AlertTriangle className="mx-auto h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold tracking-tight text-foreground">Couldn&apos;t load analytics</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {error ?? 'No data returned. Verify Supabase connectivity and try again.'}
          </p>
        </div>
        <Button type="button" size="lg" className="gap-2 shadow-sm" onClick={() => load()}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-[1600px] px-4 pb-14 pt-2 md:px-8 md:pb-16 md:pt-4 print:p-4"
      id="admin-analytics-root"
    >
      {error && data ? (
        <div
          role="alert"
          className="no-print mb-4 flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-500/5"
        >
          <p className="text-sm text-amber-950 dark:text-amber-100">
            {error} Showing the last successful load. Adjust filters or retry.
          </p>
          <Button type="button" variant="outline" size="sm" className="shrink-0 border-amber-600/30" onClick={() => load()}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : null}

      <div className="no-print mb-6 space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-br from-primary/[0.07] via-card to-card px-5 py-6 shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06] md:px-8 md:py-7">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary sm:flex">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Admin analytics
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Analytics</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Revenue, services, customers, and operations in one place. Figures marked as estimates use
                  assumptions where the database doesn&apos;t store full cost or visitor data yet.
                </p>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Updated {lastUpdatedLabel}
                  </span>
                  {refreshing ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Refreshing…
                    </span>
                  ) : null}
                  {autoRefresh ? <span className="text-muted-foreground">· Auto-refresh on</span> : null}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => load()}
                disabled={refreshing}
                className="border-border/80 bg-background/80"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => downloadAnalyticsCsv(data)}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>

        <Card className="no-print sticky top-14 z-10 border-border/80 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/95 dark:ring-white/[0.06] md:static md:top-0 md:backdrop-blur-none">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Filter className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">Filters &amp; scope</CardTitle>
                  <CardDescription className="mt-1 max-w-2xl text-xs sm:text-sm">
                    Date range and dimensions apply to every tab, export, and print view.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-border/80"
                onClick={resetFilters}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset scope
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Range preset</Label>
                <RangeSelector
                  value={preset}
                  onChange={(v) => setPreset(v as typeof preset)}
                  options={[
                    { value: '7d', label: 'Last 7 days' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: '90d', label: 'Last 90 days' },
                    { value: 'ytd', label: 'Year to date' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                  ariaLabel="Date range preset"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="analytics-from" className="text-xs font-medium text-muted-foreground">
                  From
                </Label>
                <Input
                  id="analytics-from"
                  type="date"
                  value={fromStr}
                  disabled={preset !== 'custom'}
                  onChange={(e) => {
                    setPreset('custom');
                    setFromStr(e.target.value);
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="analytics-to" className="text-xs font-medium text-muted-foreground">
                  To
                </Label>
                <Input
                  id="analytics-to"
                  type="date"
                  value={toStr}
                  disabled={preset !== 'custom'}
                  onChange={(e) => {
                    setPreset('custom');
                    setToStr(e.target.value);
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Vendor</Label>
                <Select
                  value={vendorId || '__all_vendors__'}
                  onValueChange={(v) => setVendorId(v === '__all_vendors__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_vendors__">All vendors</SelectItem>
                    {data.filterOptions.vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Product category</Label>
                <Select
                  value={productCategory || '__all_pc__'}
                  onValueChange={(v) => setProductCategory(v === '__all_pc__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_pc__">All categories</SelectItem>
                    {data.filterOptions.productCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Service type</Label>
                <Select
                  value={serviceCategory || '__all_sc__'}
                  onValueChange={(v) => setServiceCategory(v === '__all_sc__' ? '' : v)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="All service categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all_sc__">All service categories</SelectItem>
                    {data.filterOptions.serviceCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-border/70" />

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="analytics-auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={(c) => setAutoRefresh(c === true)}
                />
                <Label htmlFor="analytics-auto-refresh" className="cursor-pointer text-sm font-normal">
                  Auto-refresh every 60s
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="analytics-compare"
                  checked={compareMode}
                  onCheckedChange={(c) => setCompareMode(c === true)}
                />
                <Label htmlFor="analytics-compare" className="cursor-pointer text-sm font-normal">
                  Comparison charts in Visuals
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {data.meta.dataNotes.length > 0 ? (
          <details className="no-print rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 shadow-sm dark:bg-amber-500/10">
            <summary className="cursor-pointer list-none text-sm font-medium text-amber-950 dark:text-amber-100 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Data assumptions & limits ({data.meta.dataNotes.length})
                <span className="text-[10px] font-normal text-muted-foreground">— click to expand</span>
              </span>
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-1 pl-1 text-xs text-amber-950/90 dark:text-amber-100/90">
              {data.meta.dataNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <Tabs defaultValue="overview" className="gap-6">
        <div className="no-print -mx-1 overflow-x-auto pb-2 [scrollbar-width:thin]">
          <TabsList
            aria-label="Analytics sections"
            className="inline-flex h-auto min-h-11 w-max max-w-none flex-nowrap justify-start gap-1 rounded-xl border border-border/60 bg-muted/45 p-1.5 shadow-inner md:flex-wrap"
          >
          <TabsTrigger
            value="overview"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="sales"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Sales
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Inventory
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Services
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Customers
          </TabsTrigger>
          <TabsTrigger
            value="vendors"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Vendors
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Orders
          </TabsTrigger>
          <TabsTrigger
            value="marketing"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Marketing
          </TabsTrigger>
          <TabsTrigger
            value="finance"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Finance
          </TabsTrigger>
          <TabsTrigger
            value="operations"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Operations
          </TabsTrigger>
          <TabsTrigger
            value="predictive"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Insights
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="visuals"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Visuals
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium shadow-none transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm"
          >
            Alerts
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total revenue"
              value={formatUgx(data.overview.revenueTotal)}
              sub={`Products ${formatUgx(data.overview.productOrderRevenue)} · Services ${formatUgx(data.overview.serviceRevenue)}`}
              trend={
                data.overview.revenueMomPct != null
                  ? { pct: data.overview.revenueMomPct, label: 'vs prior period' }
                  : undefined
              }
            />
            <KpiCard
              label="Orders & payments"
              value={`${data.overview.productOrdersCount + data.overview.servicePaymentsCount}`}
              sub={`${data.overview.productOrdersCount} product orders · ${data.overview.servicePaymentsCount} service payments`}
            />
            <KpiCard
              label="Net profit (est.)"
              value={formatUgx(data.overview.netProfitEstimate)}
              sub={`Gross ${formatUgx(data.overview.grossProfitEstimate)} · Fees ${formatUgx(data.overview.platformCommissionEstimate)}`}
            />
            <KpiCard
              label="Average order value"
              value={formatUgx(data.overview.averageOrderValue)}
              sub={`${data.overview.payingCustomersCount} paying customers`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <KpiCard
              label="Platform commission (est.)"
              value={formatUgx(data.overview.platformCommissionEstimate)}
            />
            <KpiCard
              label="Active vendors"
              value={String(data.overview.activeVendors)}
              sub={`${data.overview.activeServiceProviders} active service providers`}
            />
            <KpiCard
              label="Conversion (registered → paid)"
              value={data.overview.conversionRate != null ? `${data.overview.conversionRate.toFixed(1)}%` : '—'}
              sub={data.overview.conversionNote}
            />
          </div>
          {data.overview.revenueYoyPct != null ? (
            <p className="text-sm text-muted-foreground">
              Year-over-year revenue change (approx.):{' '}
              <span className="font-medium text-foreground">{data.overview.revenueYoyPct.toFixed(1)}%</span>
            </p>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Revenue by category" description="Product and service mix across categories in this period.">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sales.revenueByCategory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatUgx(v)} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Seasonal trend" description="Revenue by calendar month in the selected window.">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sales.seasonalByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatUgx(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Top vendors by revenue" description="Leading sellers in the selected period (top 8).">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sales.revenueByVendor.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="vendorName" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatUgx(v)} />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard
              title="Payment method performance"
              description="Share of captured payment volume by method."
            >
              {data.sales.paymentMethodPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No in-memory payment rows in this window.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.sales.paymentMethodPerformance.map((p) => ({
                          name: p.method,
                          value: p.amount,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {data.sales.paymentMethodPerformance.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatUgx(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
          </div>
          <SectionCard title="Revenue by location" description="Orders and revenue by shipping region.">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sales.revenueByLocation.map((r) => (
                  <TableRow key={r.region}>
                    <TableCell className="font-medium">{r.region}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUgx(r.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Top products" description="Best-selling SKUs by units and revenue.">
              <ul className="space-y-0 divide-y divide-border/60 text-sm">
                {data.sales.topProducts.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="truncate font-medium text-foreground">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {p.units} units · {formatUgx(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Top services" description="Bookings and estimated revenue by service.">
              <ul className="space-y-0 divide-y divide-border/60 text-sm">
                {data.sales.topServices.slice(0, 8).map((s) => (
                  <li key={s.name} className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="truncate font-medium text-foreground">{s.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {s.bookings} bookings · ~{formatUgx(s.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4 rounded-xl border border-border/70 bg-linear-to-br from-muted/35 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-muted/20 dark:ring-white/6 sm:max-w-[min(100%,42rem)] sm:flex-1">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-inner"
                aria-hidden
              >
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock & velocity note
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">{data.inventory.stockNote}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" className="no-print shrink-0 gap-2 shadow-sm" asChild>
              <Link href="/admin/products">
                <Package className="h-3.5 w-3.5" />
                Manage catalog
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Fast movers</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.inventory.fastMovers.length}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">SKUs with strongest unit velocity</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <TrendingDown className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Slow movers</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.inventory.slowMovers.length}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Candidates for promos or delisting</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm dark:bg-rose-500/10">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">No sales (period)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.inventory.deadStockCandidates.length}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Published listings without orders</p>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <Percent className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Pricing signals</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.inventory.pricingInsights.length}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Rows with compare-at / discount data</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Fast movers"
              description="Highest unit sales in the selected window — relative bars compare SKUs in this list only."
              contentClassName="p-0"
            >
              {data.inventory.fastMovers.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No fast movers for these filters. Widen the date range or check product category.
                </p>
              ) : (
                <ul className="max-h-[min(24rem,55vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain px-5 text-sm [scrollbar-width:thin]">
                  {data.inventory.fastMovers.map((p, i) => (
                    <InventoryVelocityRow
                      key={p.id}
                      rank={i + 1}
                      name={p.name}
                      units={p.units}
                      revenue={p.revenue}
                      maxUnits={invFastMaxUnits}
                      barClassName="bg-emerald-500/85 dark:bg-emerald-400/80"
                    />
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard
              title="Slow movers"
              description="Lowest throughput among SKUs with some sales — tune placement, price, or inventory."
              contentClassName="p-0"
            >
              {data.inventory.slowMovers.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No slow movers surfaced. Try another period or vendor scope.
                </p>
              ) : (
                <ul className="max-h-[min(24rem,55vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain px-5 text-sm [scrollbar-width:thin]">
                  {data.inventory.slowMovers.map((p, i) => (
                    <InventoryVelocityRow
                      key={p.id}
                      rank={i + 1}
                      name={p.name}
                      units={p.units}
                      revenue={p.revenue}
                      maxUnits={invSlowMaxUnits}
                      barClassName="bg-amber-500/80 dark:bg-amber-400/75"
                    />
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Published listings with no sales"
            description="Explore idle SKUs: category mix, search, and quick actions — pricing details appear when the product is also in the pricing sample below."
            contentClassName="p-4 sm:p-5"
          >
            <NoSalesListingsExplorer
              items={data.inventory.deadStockCandidates}
              pricingByProductId={deadStockPricingById}
            />
          </SectionCard>

          <SectionCard title="Pricing & promotions" description="Shelf price, compare-at, and effective discount where available.">
            {data.inventory.pricingInsights.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No pricing insight rows for the current filter set.
              </p>
            ) : (
              <div className="-mx-1 overflow-x-auto px-1">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-40">Product</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Compare at</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inventory.pricingInsights.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[18rem] font-medium">
                          <span className="line-clamp-2">{p.name}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatUgx(p.price)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.compareAt != null ? formatUgx(p.compareAt) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.discountPct != null && p.discountPct > 0 ? (
                            <Badge className="tabular-nums">{p.discountPct}% off</Badge>
                          ) : p.discountPct === 0 ? (
                            <span className="text-xs text-muted-foreground">List</span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="services" className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Completion rate"
              value={`${(data.services.completionRate * 100).toFixed(1)}%`}
            />
            <KpiCard
              label="Cancellation rate"
              value={`${(data.services.cancellationRate * 100).toFixed(1)}%`}
            />
            <KpiCard
              label="Avg. service time"
              value={
                data.services.avgCompletionMinutes != null
                  ? `${data.services.avgCompletionMinutes.toFixed(0)} min`
                  : '—'
              }
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Bookings by category" description="Volume of service bookings by category.">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.services.bookingsByCategory.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Provider ratings" description="Average stars and review count by provider.">
              <div className="max-h-[280px] space-y-0 divide-y divide-border/60 overflow-y-auto text-sm">
                {data.services.ratingsByProvider.length === 0 ? (
                  <p className="py-4 text-muted-foreground">No ratings in this window.</p>
                ) : (
                  data.services.ratingsByProvider.slice(0, 12).map((r) => (
                    <div key={r.providerId} className="flex justify-between gap-3 py-3 first:pt-0">
                      <span className="font-mono text-xs text-muted-foreground">{r.providerId}</span>
                      <span className="tabular-nums font-medium">
                        {r.avgStars.toFixed(1)} ★ ({r.count})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="New customers (period)" value={String(data.customers.newInPeriod)} />
            <KpiCard label="Returning customers" value={String(data.customers.returningInPeriod)} />
            <KpiCard label="Avg. CLV (catalog)" value={formatUgx(data.customers.avgClv)} />
            <KpiCard label="Median CLV" value={formatUgx(data.customers.medianClv)} />
          </div>
          <p className="rounded-lg border border-border/60 bg-muted/25 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {data.customers.cacNote}
          </p>
          <SectionCard title="Simplified funnel" description="Counts by lifecycle stage in this period.">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.customers.funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="stage" width={180} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Retention (approx.):{' '}
            {data.customers.retentionRateApprox != null
              ? `${data.customers.retentionRateApprox.toFixed(1)}% returning of active`
              : '—'}
            {' · '}
            Churn proxy:{' '}
            {data.customers.churnRateApprox != null
              ? `${data.customers.churnRateApprox.toFixed(1)}% new of active`
              : '—'}
          </p>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-8 focus-visible:outline-none">
          <VendorAnalyticsSection
            leaderboard={data.vendors.leaderboard}
            avgRating={data.vendors.avgRating}
            churnRiskCount={data.vendors.churnRiskCount}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-8 focus-visible:outline-none">
          <OrdersAnalyticsSection
            orders={data.orders}
            productOrdersCount={data.overview.productOrdersCount}
            servicePaymentsCount={data.overview.servicePaymentsCount}
          />
        </TabsContent>

        <TabsContent value="marketing" className="space-y-8 focus-visible:outline-none">
          <MarketingAnalyticsSection marketing={data.marketing} />
        </TabsContent>

        <TabsContent value="finance" className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Fees (disbursements)"
              value={formatUgx(data.finance.platformFeesFromDisbursements)}
            />
            <KpiCard label="Payouts pending" value={formatUgx(data.finance.payoutsPending)} />
            <KpiCard label="Payouts paid (lifetime sum)" value={formatUgx(data.finance.payoutsPaid)} />
            <KpiCard
              label="Outstanding (estimate)"
              value={formatUgx(data.finance.outstandingVendorBalanceEstimate)}
            />
          </div>
          <p className="rounded-lg border border-border/60 bg-muted/25 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            {data.finance.taxNote}
          </p>
          <SectionCard title="Margin by category" description="Modeled revenue roll-up by category.">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.finance.marginByCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="operations" className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Support tickets open" value={String(data.operations.supportTicketsOpen)} />
            <KpiCard label="Tickets resolved" value={String(data.operations.supportTicketsResolved)} />
            <KpiCard
              label="Avg. resolution time"
              value={
                data.operations.avgResolutionHours != null
                  ? `${data.operations.avgResolutionHours.toFixed(1)} h`
                  : '—'
              }
            />
            <KpiCard label="Failed transactions" value={String(data.operations.failedTransactions)} />
          </div>
          <p className="rounded-lg border border-border/60 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
            Succeeded (tracked): {data.operations.succeededTransactions} · Paytota rows in range:{' '}
            {data.paytotaRowCount}
          </p>
          <SectionCard title="Common ticket subjects" description="Most frequent support themes in period.">
            <ul className="space-y-0 divide-y divide-border/60 text-sm">
              {data.operations.commonTicketSubjects.map((t) => (
                <li key={t.subject} className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="max-w-[80%] truncate font-medium text-foreground">{t.subject}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{t.count}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-8">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground shadow-sm">
            {data.predictive.demandTrendLabel}
          </div>
          <KpiCard
            label="30-day revenue forecast (naive trend)"
            value={formatUgx(data.predictive.revenueForecastNext30d)}
            sub="Extrapolated from recent monthly buckets — replace with ML when data volume allows."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Restock suggestions" description="Heuristic signals for inventory planning.">
              <ul className="space-y-4 text-sm">
                {data.predictive.restockSuggestions.map((s) => (
                  <li key={s.productId} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{s.reason}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Price optimization hints" description="Lightweight pricing guardrails from catalog data.">
              <ul className="space-y-4 text-sm">
                {data.predictive.priceOptimizationHints.map((s) => (
                  <li key={s.productId} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <span className="font-semibold text-foreground">{s.name}</span>
                    <p className="mt-1 leading-relaxed text-muted-foreground">{s.hint}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Personalized recommendations for buyers already run on the storefront feed; this admin view focuses on
            aggregate demand and pricing guardrails.
          </p>
        </TabsContent>

        <TabsContent value="reports" className="space-y-8">
          <SectionCard
            title="Custom reports"
            description="Scoped exports using the filters above — vendor, product category, and service category."
          >
            <p className="text-sm leading-relaxed text-muted-foreground">
              Export CSV includes overview and sales tables. Excel and Sheets open CSV files directly.
            </p>
          </SectionCard>
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-6 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                <BarChart3 className="h-4 w-4" />
              </span>
              Scheduled reports
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Weekly or monthly email digests are not wired to a mail provider yet. When you add one, this block can
              call a cron-triggered API with the same query parameters you use here.
            </p>
            <Button type="button" variant="secondary" disabled className="mt-4" size="sm">
              Schedule report (soon)
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="visuals" className="space-y-8">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <LineChartIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="leading-relaxed">
              Comparison mode overlays a modeled prior-period baseline on categories when enabled in Filters.
            </p>
          </div>
          {compareMode ? (
            <SectionCard
              title="Category revenue — current vs. baseline"
              description="Side-by-side with an approximate prior-period baseline from MoM %."
            >
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryCompareData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatUgx(v)} />
                    <Legend />
                    <Bar dataKey="current" fill="#3b82f6" name="Current" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previous" fill="#94a3b8" name="Baseline" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 border-t border-border/50 pt-4 text-xs leading-relaxed text-muted-foreground">
                Baseline bars approximate prior performance using MoM % — for exact prior-category breakdown, run two
                exports with shifted date ranges.
              </p>
            </SectionCard>
          ) : null}
          <SectionCard
            title="Activity heatmap"
            description="Product orders vs. service bookings by weekday in the selected window."
          >
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {data.heatmapWeekday.map((h) => {
                const intensity = (h.productOrders + h.serviceBookings) / heatMax;
                return (
                  <div key={h.weekday} className="flex flex-col items-center gap-2 text-center">
                    <div
                      className="flex h-[4.5rem] w-full max-w-[5.5rem] flex-col justify-end rounded-lg border border-border/60 p-1.5 text-[10px] font-medium text-white shadow-inner sm:h-[5rem]"
                      style={{
                        background: `linear-gradient(to top, rgb(59 130 246 / ${0.25 + intensity * 0.75}), rgb(16 185 129 / ${0.2 + intensity * 0.55}))`,
                      }}
                    >
                      <span className="text-[11px] font-semibold tracking-tight">{h.weekday}</span>
                      <span className="mt-0.5 opacity-95">
                        P{h.productOrders} · S{h.serviceBookings}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {data.alerts.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/20 px-6 py-12 text-center shadow-sm">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium text-foreground">All clear</p>
              <p className="mt-1 text-sm text-muted-foreground">No automated alerts for this window.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.alerts.map((a, i) => (
                <li
                  key={`${a.title}-${i}`}
                  className={cn(
                    'flex gap-4 rounded-xl border p-4 text-sm shadow-sm ring-1 transition-colors',
                    a.severity === 'critical' &&
                      'border-rose-500/35 bg-rose-500/[0.06] ring-rose-500/10 dark:bg-rose-500/10',
                    a.severity === 'warning' &&
                      'border-amber-500/35 bg-amber-500/[0.06] ring-amber-500/10 dark:bg-amber-500/10',
                    a.severity !== 'critical' &&
                      a.severity !== 'warning' &&
                      'border-border/80 bg-card ring-black/[0.04] dark:ring-white/[0.06]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      a.severity === 'critical' && 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                      a.severity === 'warning' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      a.severity !== 'critical' &&
                        a.severity !== 'warning' &&
                        'bg-muted text-muted-foreground',
                    )}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold tracking-tight text-foreground">{a.title}</p>
                    <p className="leading-relaxed text-muted-foreground">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <Bell className="h-3.5 w-3.5 shrink-0" />
            Wire these thresholds to email or Slack when notification infrastructure is ready.
          </p>
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          #admin-analytics-root {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
