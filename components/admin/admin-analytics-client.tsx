'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
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
import {
  AnalyticsMetricCard,
  AnalyticsPageSkeleton,
  AnalyticsSectionCard,
  analyticsTabTriggerClass,
} from '@/components/admin/admin-analytics-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Globe,
  Info,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LineChart as LineChartIcon,
  Mail,
  Copy,
  Layers2,
  Megaphone,
  Package,
  Palette,
  Percent,
  PieChart as PieChartIconLucide,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Tag,
  Ticket,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Wrench,
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

const SectionCard = AnalyticsSectionCard;

const ANALYTICS_TABS = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'sales', label: 'Sales', icon: ShoppingCart },
  { value: 'inventory', label: 'Inventory', icon: Package },
  { value: 'services', label: 'Services', icon: Wrench },
  { value: 'customers', label: 'Customers', icon: Users },
  { value: 'vendors', label: 'Vendors', icon: Store },
  { value: 'orders', label: 'Orders', icon: ClipboardList },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'finance', label: 'Finance', icon: Landmark },
  { value: 'operations', label: 'Ops', icon: Activity },
  { value: 'predictive', label: 'Insights', icon: Lightbulb },
  { value: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { value: 'visuals', label: 'Visuals', icon: BarChart3 },
  { value: 'alerts', label: 'Alerts', icon: Bell },
] as const;

function InventoryVelocityRow({
  rank,
  name,
  units,
  revenue,
  maxUnits,
  barClassName,
  metricLabel = 'units',
}: {
  rank: number;
  name: string;
  units: number;
  revenue: number;
  maxUnits: number;
  barClassName: string;
  /** Shown next to the numeric metric (e.g. "bookings" for services). */
  metricLabel?: string;
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
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            title={`${units} ${metricLabel} in period`}
          >
            <div
              className={cn('h-full rounded-full transition-[width]', barClassName)}
              style={{ width: `${widthPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 sm:text-right">
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatUgx(revenue)}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {units} {metricLabel}
        </span>
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

function KpiCard(props: Parameters<typeof AnalyticsMetricCard>[0]) {
  return <AnalyticsMetricCard {...props} />;
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

  const heatmapPeakDay = useMemo(() => {
    if (!data?.heatmapWeekday.length) return null;
    return data.heatmapWeekday.reduce((best, h) => {
      const t = h.productOrders + h.serviceBookings;
      const bt = best.productOrders + best.serviceBookings;
      return t > bt ? h : best;
    });
  }, [data]);

  const alertStats = useMemo(() => {
    if (!data) return { critical: 0, warning: 0, info: 0, total: 0 };
    const critical = data.alerts.filter((a) => a.severity === 'critical').length;
    const warning = data.alerts.filter((a) => a.severity === 'warning').length;
    const info = data.alerts.filter((a) => a.severity === 'info').length;
    return { critical, warning, info, total: data.alerts.length };
  }, [data]);

  const sortedAlerts = useMemo(() => {
    if (!data) return [];
    const rank: Record<'critical' | 'warning' | 'info', number> = { critical: 0, warning: 1, info: 2 };
    return [...data.alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
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

  const salesAggregates = useMemo(() => {
    if (!data) {
      return {
        categoryRevenueSum: 0,
        regionOrderSum: 0,
        regionRevenueSum: 0,
        maxRegionRevenue: 0,
        vendorRevenueSum: 0,
        topVendorName: '—',
        topCategoryName: '—',
        topCategoryRevenue: 0,
        paymentVolumeSum: 0,
        primaryPaymentLabel: null as string | null,
        topProductsMaxUnits: 1,
        topServicesMaxBookings: 1,
      };
    }
    const { sales } = data;
    const categoryRevenueSum = sales.revenueByCategory.reduce((a, c) => a + c.revenue, 0);
    const regionOrderSum = sales.revenueByLocation.reduce((a, r) => a + r.orders, 0);
    const regionRevenueSum = sales.revenueByLocation.reduce((a, r) => a + r.revenue, 0);
    const maxRegionRevenue = Math.max(0, ...sales.revenueByLocation.map((r) => r.revenue));
    const vendorRevenueSum = sales.revenueByVendor.reduce((a, v) => a + v.revenue, 0);
    const topVendor = sales.revenueByVendor.reduce<{ name: string; revenue: number } | null>(
      (best, v) => (!best || v.revenue > best.revenue ? { name: v.vendorName, revenue: v.revenue } : best),
      null,
    );
    const topCat = sales.revenueByCategory.reduce<{ name: string; revenue: number } | null>(
      (best, c) => (!best || c.revenue > best.revenue ? { name: c.name, revenue: c.revenue } : best),
      null,
    );
    const paymentVolumeSum = sales.paymentMethodPerformance.reduce((a, p) => a + p.amount, 0);
    const primaryPay = sales.paymentMethodPerformance.reduce<{ method: string; amount: number } | null>(
      (best, p) => (!best || p.amount > best.amount ? { method: p.method, amount: p.amount } : best),
      null,
    );
    const topProductsMaxUnits = Math.max(1, ...sales.topProducts.map((p) => p.units));
    const topServicesMaxBookings = Math.max(1, ...sales.topServices.map((s) => s.bookings));
    return {
      categoryRevenueSum,
      regionOrderSum,
      regionRevenueSum,
      maxRegionRevenue,
      vendorRevenueSum,
      topVendorName: topVendor?.name ?? '—',
      topCategoryName: topCat?.name ?? '—',
      topCategoryRevenue: topCat?.revenue ?? 0,
      paymentVolumeSum,
      primaryPaymentLabel: primaryPay?.method ?? null,
      topProductsMaxUnits,
      topServicesMaxBookings,
    };
  }, [data]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data) return '';
    try {
      return formatDistanceToNow(new Date(data.meta.generatedAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [data]);

  const reportsScopeSummary = useMemo(() => {
    const presetLabel =
      preset === '7d'
        ? 'Last 7 days'
        : preset === '30d'
          ? 'Last 30 days'
          : preset === '90d'
            ? 'Last 90 days'
            : preset === 'ytd'
              ? 'Year to date'
              : 'Custom range';
    let rangeLine: string;
    try {
      rangeLine = `${format(parseISO(fromStr), 'MMM d, yyyy')} – ${format(parseISO(toStr), 'MMM d, yyyy')}`;
    } catch {
      rangeLine = `${fromStr} – ${toStr}`;
    }
    const vendorLabel = !vendorId
      ? 'All vendors'
      : data?.filterOptions.vendors.find((v) => v.id === vendorId)?.name ?? 'Selected vendor';
    const productCatLabel = productCategory || 'All product categories';
    const serviceCatLabel = serviceCategory || 'All service types';
    return { presetLabel, rangeLine, vendorLabel, productCatLabel, serviceCatLabel };
  }, [data, preset, fromStr, toStr, vendorId, productCategory, serviceCategory]);

  const overviewAggregates = useMemo(() => {
    if (!data) {
      return {
        productSharePct: null as number | null,
        serviceSharePct: null as number | null,
        categoryCount: 0,
        seasonalMonths: 0,
      };
    }
    const t = data.overview.revenueTotal;
    return {
      productSharePct: t > 0 ? (data.overview.productOrderRevenue / t) * 100 : null,
      serviceSharePct: t > 0 ? (data.overview.serviceRevenue / t) * 100 : null,
      categoryCount: data.sales.revenueByCategory.length,
      seasonalMonths: data.sales.seasonalByMonth.length,
    };
  }, [data]);

  const servicesAggregates = useMemo(() => {
    if (!data) {
      return {
        bookingsTotal: 0,
        topCategoryLabel: null as string | null,
        topCategoryCount: 0,
        topServiceLabel: null as string | null,
        topServiceCount: 0,
        weightedAvgStars: null as number | null,
        reviewCount: 0,
        maxProviderRevenue: 0,
      };
    }
    const s = data.services;
    const bookingsTotal = s.bookingsByCategory.reduce((a, c) => a + c.count, 0);
    const topCat = s.bookingsByCategory[0];
    const topSvc = s.bookingsByService[0];
    let weighted = 0;
    let reviewCount = 0;
    for (const r of s.ratingsByProvider) {
      weighted += r.avgStars * r.count;
      reviewCount += r.count;
    }
    const weightedAvgStars = reviewCount > 0 ? weighted / reviewCount : null;
    const maxProviderRevenue = Math.max(0, ...s.revenueByProvider.map((p) => p.revenue));
    return {
      bookingsTotal,
      topCategoryLabel: topCat?.category ?? null,
      topCategoryCount: topCat?.count ?? 0,
      topServiceLabel: topSvc?.service ?? null,
      topServiceCount: topSvc?.count ?? 0,
      weightedAvgStars,
      reviewCount,
      maxProviderRevenue,
    };
  }, [data]);

  const financeAggregates = useMemo(() => {
    if (!data) {
      return {
        marginRevenueSum: 0,
        revenueWeightedMarginPct: null as number | null,
        topCategoryByRevenue: null as string | null,
        topCategoryRevenue: 0,
        topCategoryMarginPct: null as number | null,
        highestMarginCategory: null as string | null,
        highestMarginPct: null as number | null,
        maxCategoryRevenue: 0,
        pendingPayoutSharePct: null as number | null,
      };
    }
    const f = data.finance;
    const marginRevenueSum = f.marginByCategory.reduce((a, c) => a + c.revenue, 0);
    const revWeightedMargin =
      marginRevenueSum > 0
        ? f.marginByCategory.reduce((a, c) => a + c.marginPct * c.revenue, 0) / marginRevenueSum
        : null;
    const topRev = f.marginByCategory.reduce<{
      category: string;
      revenue: number;
      marginPct: number;
    } | null>((b, c) => (!b || c.revenue > b.revenue ? { category: c.category, revenue: c.revenue, marginPct: c.marginPct } : b), null);
    const topMargin = f.marginByCategory.reduce<{ category: string; marginPct: number } | null>(
      (b, c) => (!b || c.marginPct > b.marginPct ? { category: c.category, marginPct: c.marginPct } : b),
      null,
    );
    const maxCategoryRevenue = Math.max(0, ...f.marginByCategory.map((c) => c.revenue));
    const payoutDenom = f.payoutsPaid + f.payoutsPending;
    const pendingPayoutSharePct =
      payoutDenom > 0 ? (f.payoutsPending / payoutDenom) * 100 : null;
    return {
      marginRevenueSum,
      revenueWeightedMarginPct: revWeightedMargin,
      topCategoryByRevenue: topRev?.category ?? null,
      topCategoryRevenue: topRev?.revenue ?? 0,
      topCategoryMarginPct: topRev?.marginPct ?? null,
      highestMarginCategory: topMargin?.category ?? null,
      highestMarginPct: topMargin?.marginPct ?? null,
      maxCategoryRevenue,
      pendingPayoutSharePct,
    };
  }, [data]);

  const customersAggregates = useMemo(() => {
    if (!data) {
      return {
        newPlusReturning: 0,
        newSharePct: null as number | null,
        funnelMaxCount: 1,
        topFunnelStage: null as string | null,
        topFunnelCount: 0,
        clvSkewHint: null as string | null,
      };
    }
    const c = data.customers;
    const newPlusReturning = c.newInPeriod + c.returningInPeriod;
    const newSharePct = newPlusReturning > 0 ? (c.newInPeriod / newPlusReturning) * 100 : null;
    const funnelMaxCount = Math.max(1, ...c.funnel.map((f) => f.count));
    const topFunnel = c.funnel.reduce<{ stage: string; count: number } | null>(
      (b, f) => (!b || f.count > b.count ? { stage: f.stage, count: f.count } : b),
      null,
    );
    let clvSkewHint: string | null = null;
    if (c.medianClv > 0 && c.avgClv > 0) {
      const ratio = c.avgClv / c.medianClv;
      if (ratio >= 1.2) {
        clvSkewHint = 'Mean CLV is well above median — a concentrated set of high spenders may be driving the average.';
      } else if (ratio <= 0.83) {
        clvSkewHint = 'Median outpaces mean — more buyers sit below the average CLV; check discounting or mix.';
      }
    }
    return {
      newPlusReturning,
      newSharePct,
      funnelMaxCount,
      topFunnelStage: topFunnel?.stage ?? null,
      topFunnelCount: topFunnel?.count ?? 0,
      clvSkewHint,
    };
  }, [data]);

  const operationsAggregates = useMemo(() => {
    if (!data) {
      return {
        ticketThroughput: 0,
        openToResolvedRatio: null as number | null,
        txFailurePct: null as number | null,
        txTotal: 0,
        maxSubjectCount: 1,
        topSubjectLabel: null as string | null,
      };
    }
    const o = data.operations;
    const ticketThroughput = o.supportTicketsOpen + o.supportTicketsResolved;
    const openToResolvedRatio =
      o.supportTicketsResolved > 0 ? o.supportTicketsOpen / o.supportTicketsResolved : null;
    const txTotal = o.failedTransactions + o.succeededTransactions;
    const txFailurePct = txTotal > 0 ? (o.failedTransactions / txTotal) * 100 : null;
    const maxSubjectCount = Math.max(1, ...o.commonTicketSubjects.map((s) => s.count));
    return {
      ticketThroughput,
      openToResolvedRatio,
      txFailurePct,
      txTotal,
      maxSubjectCount,
      topSubjectLabel: o.commonTicketSubjects[0]?.subject ?? null,
    };
  }, [data]);

  const insightsAggregates = useMemo(() => {
    if (!data) {
      return {
        restockCount: 0,
        priceHintCount: 0,
        forecastToPeriodRatio: null as number | null,
      };
    }
    const rev = data.overview.revenueTotal;
    const fc = data.predictive.revenueForecastNext30d;
    return {
      restockCount: data.predictive.restockSuggestions.length,
      priceHintCount: data.predictive.priceOptimizationHints.length,
      forecastToPeriodRatio: rev > 0 ? fc / rev : null,
    };
  }, [data]);

  const resetFilters = useCallback(() => {
    setVendorId('');
    setProductCategory('');
    setServiceCategory('');
  }, []);

  if (loading && !data) {
    return <AnalyticsPageSkeleton />;
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
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Platform analytics
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Revenue, orders, vendors, and operations for the selected date range. Estimates are labeled in
                  Data assumptions.
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
                  <CardTitle className="text-base font-semibold tracking-tight">Scope</CardTitle>
                  <CardDescription className="mt-1 max-w-xl text-xs sm:text-sm">
                    Applies to all tabs, CSV export, and print.
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
            className="inline-flex h-auto min-h-11 w-max max-w-none flex-nowrap justify-start gap-1 rounded-2xl border border-border/60 bg-muted/40 p-1.5 shadow-inner md:flex-wrap"
          >
            {ANALYTICS_TABS.map(({ value, label, icon: TabIcon }) => (
              <TabsTrigger key={value} value={value} className={analyticsTabTriggerClass}>
                <TabIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {label}
                {value === 'alerts' && alertStats.total > 0 ? (
                  <Badge
                    variant={alertStats.critical > 0 ? 'destructive' : 'secondary'}
                    className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px] font-bold tabular-nums"
                  >
                    {alertStats.total}
                  </Badge>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-primary/15 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-inner"
                aria-hidden
              >
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Platform overview
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Snapshot for the current scope — revenue, throughput, and margin before drilling into other tabs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Updated {lastUpdatedLabel || '—'}</span>
                  </Badge>
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Top category · {salesAggregates.topCategoryName}
                      {salesAggregates.topCategoryRevenue > 0
                        ? ` (${formatUgx(salesAggregates.topCategoryRevenue)})`
                        : ''}
                    </span>
                  </Badge>
                  {overviewAggregates.productSharePct != null && overviewAggregates.serviceSharePct != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <PieChartIconLucide className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Mix · Products {overviewAggregates.productSharePct.toFixed(0)}% · Services{' '}
                        {overviewAggregates.serviceSharePct.toFixed(0)}%
                      </span>
                    </Badge>
                  ) : null}
                  {data.overview.revenueMomPct != null ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'max-w-full gap-1 font-normal',
                        data.overview.revenueMomPct >= 0
                          ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-900 dark:text-emerald-100'
                          : 'border-rose-500/30 bg-rose-500/8 text-rose-900 dark:text-rose-100',
                      )}
                    >
                      {data.overview.revenueMomPct >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">
                        Rev. {Math.abs(data.overview.revenueMomPct).toFixed(1)}% vs prior period
                      </span>
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnalyticsMetricCard
              label="Total revenue"
              value={formatUgx(data.overview.revenueTotal)}
              sub={`Products ${formatUgx(data.overview.productOrderRevenue)} · Services ${formatUgx(data.overview.serviceRevenue)}`}
              icon={DollarSign}
              accent="violet"
              trend={
                data.overview.revenueMomPct != null
                  ? { pct: data.overview.revenueMomPct, label: 'vs prior period' }
                  : undefined
              }
            />
            <AnalyticsMetricCard
              label="Orders & payments"
              value={(data.overview.productOrdersCount + data.overview.servicePaymentsCount).toLocaleString()}
              sub={`${data.overview.productOrdersCount.toLocaleString()} product orders · ${data.overview.servicePaymentsCount.toLocaleString()} service payments`}
              icon={ShoppingCart}
              accent="emerald"
            />
            <AnalyticsMetricCard
              label="Net profit (est.)"
              value={formatUgx(data.overview.netProfitEstimate)}
              sub={`Gross ${formatUgx(data.overview.grossProfitEstimate)} · Fees ${formatUgx(data.overview.platformCommissionEstimate)}`}
              icon={TrendingUp}
              accent="amber"
            />
            <AnalyticsMetricCard
              label="Average order value"
              value={formatUgx(data.overview.averageOrderValue)}
              sub={`${data.overview.payingCustomersCount.toLocaleString()} paying customers`}
              icon={BarChart3}
              accent="sky"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnalyticsMetricCard
              label="Platform commission (est.)"
              value={formatUgx(data.overview.platformCommissionEstimate)}
              sub="Fees in the selected window"
              icon={Layers2}
              accent="indigo"
            />
            <AnalyticsMetricCard
              label="Active vendors"
              value={data.overview.activeVendors.toLocaleString()}
              sub={`${data.overview.activeServiceProviders.toLocaleString()} active service providers`}
              icon={Store}
              accent="fuchsia"
            />
            <AnalyticsMetricCard
              label="Conversion"
              value={data.overview.conversionRate != null ? `${data.overview.conversionRate.toFixed(1)}%` : '—'}
              sub={data.overview.conversionNote}
              icon={Percent}
              accent="teal"
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>

          {data.overview.revenueYoyPct != null ? (
            <div
              className={cn(
                'flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between',
                data.overview.revenueYoyPct >= 0
                  ? 'border-emerald-500/35 bg-emerald-500/8 dark:bg-emerald-500/10'
                  : 'border-rose-500/35 bg-rose-500/8 dark:bg-rose-500/10',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    data.overview.revenueYoyPct >= 0
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
                  )}
                  aria-hidden
                >
                  <LineChartIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Year-over-year revenue (approx.)</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Compares this window to the same length in the prior year when the metric is available.
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  'text-2xl font-bold tabular-nums sm:text-right',
                  data.overview.revenueYoyPct >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-700 dark:text-rose-400',
                )}
              >
                {data.overview.revenueYoyPct >= 0 ? '+' : ''}
                {data.overview.revenueYoyPct.toFixed(1)}%
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Revenue by category"
              description="Product and service mix across categories in this period — each bar uses a distinct color for quick scanning."
            >
              {data.sales.revenueByCategory.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No category revenue in this window.</p>
              ) : (
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.sales.revenueByCategory}
                      margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 14)}…` : v)}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (typeof v === 'number' && v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)}
                      />
                      <Tooltip
                        formatter={(v: number) => formatUgx(v)}
                        cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={52}>
                        {data.sales.revenueByCategory.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {overviewAggregates.categoryCount > 0 ? (
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {overviewAggregates.categoryCount} categor
                  {overviewAggregates.categoryCount === 1 ? 'y' : 'ies'} in chart
                </p>
              ) : null}
            </SectionCard>
            <SectionCard
              title="Seasonal trend"
              description="Revenue by calendar month in the selected window — points connect month-to-month totals."
            >
              {data.sales.seasonalByMonth.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No monthly revenue points in this window.</p>
              ) : (
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.sales.seasonalByMonth} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (typeof v === 'number' && v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)}
                      />
                      <Tooltip formatter={(v: number) => formatUgx(v)} cursor={{ stroke: 'hsl(var(--muted-foreground) / 0.35)' }} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {overviewAggregates.seasonalMonths > 0 ? (
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {overviewAggregates.seasonalMonths} month
                  {overviewAggregates.seasonalMonths === 1 ? '' : 's'} in range
                </p>
              ) : null}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-violet-500/8 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-violet-500/12 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 shadow-inner dark:text-violet-300"
                aria-hidden
              >
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sales performance
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Revenue mix, geography, and checkout methods for the selected filters. Totals below follow the same
                    window as the overview tab.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Store className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Top vendor · {salesAggregates.topVendorName}</span>
                  </Badge>
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Top category · {salesAggregates.topCategoryName}
                      {salesAggregates.topCategoryRevenue > 0
                        ? ` (${formatUgx(salesAggregates.topCategoryRevenue)})`
                        : ''}
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Category revenue</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(salesAggregates.categoryRevenueSum)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Sum of product category buckets · Platform total {formatUgx(data.overview.revenueTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Globe className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Ship-to orders</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {salesAggregates.regionOrderSum.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Orders attributed to regions below
                {salesAggregates.regionOrderSum > 0
                  ? ` · ~${formatUgx(salesAggregates.regionRevenueSum / salesAggregates.regionOrderSum)} / order`
                  : ''}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Payment capture</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(salesAggregates.paymentVolumeSum)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {data.sales.paymentMethodPerformance.length === 0
                  ? 'No payment rows in this window'
                  : `${data.sales.paymentMethodPerformance.length} methods · Lead ${salesAggregates.primaryPaymentLabel ?? '—'}`}
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
                <Trophy className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Vendor share (top 8)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {salesAggregates.vendorRevenueSum > 0
                  ? `${Math.min(100, Math.round((data.sales.revenueByVendor.slice(0, 8).reduce((a, v) => a + v.revenue, 0) / salesAggregates.vendorRevenueSum) * 100))}%`
                  : '—'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Share of vendor revenue from the eight bars in the chart
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Top vendors by revenue" description="Leading sellers in the selected period (top 8).">
              {data.sales.revenueByVendor.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No vendor revenue in this window.</p>
              ) : (
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.sales.revenueByVendor.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)} />
                      <YAxis
                        type="category"
                        dataKey="vendorName"
                        width={128}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
                      />
                      <Tooltip formatter={(v: number) => formatUgx(v)} cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
            <SectionCard
              title="Payment method performance"
              description="Share of captured payment volume by method."
            >
              {data.sales.paymentMethodPerformance.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No in-memory payment rows in this window.
                </p>
              ) : (
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Pie
                        data={data.sales.paymentMethodPerformance.map((p) => ({
                          name: p.method,
                          value: p.amount,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="46%"
                        innerRadius={44}
                        outerRadius={88}
                        paddingAngle={2}
                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.sales.paymentMethodPerformance.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatUgx(Number(v))} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Revenue by location"
            description="Orders and revenue by shipping region — bar shows share of the top region in this list."
            contentClassName={data.sales.revenueByLocation.length === 0 ? undefined : 'p-0'}
          >
            {data.sales.revenueByLocation.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No regional orders in this window.</p>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/80 hover:bg-transparent">
                      <TableHead className="bg-muted/20 pl-5">Region</TableHead>
                      <TableHead className="hidden bg-muted/20 md:table-cell">Mix</TableHead>
                      <TableHead className="bg-muted/20 text-right tabular-nums">Orders</TableHead>
                      <TableHead className="bg-muted/20 pr-5 text-right tabular-nums">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sales.revenueByLocation.map((r) => {
                      const mixPct =
                        salesAggregates.maxRegionRevenue > 0
                          ? Math.round((r.revenue / salesAggregates.maxRegionRevenue) * 100)
                          : 0;
                      return (
                        <TableRow key={r.region} className="border-border/50 transition-colors hover:bg-muted/25">
                          <TableCell className="max-w-[12rem] pl-5 font-medium">
                            <span className="line-clamp-2">{r.region}</span>
                          </TableCell>
                          <TableCell className="hidden w-[min(32%,14rem)] md:table-cell">
                            <div
                              className="h-2 overflow-hidden rounded-full bg-muted"
                              title={`${mixPct}% of strongest region`}
                            >
                              <div
                                className="h-full rounded-full bg-primary/75 transition-[width]"
                                style={{ width: `${Math.max(8, mixPct)}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{r.orders}</TableCell>
                          <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-foreground">
                            {formatUgx(r.revenue)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Top products"
              description="Best-selling SKUs by units and revenue — bars are relative to this list only."
              contentClassName="p-0"
            >
              {data.sales.topProducts.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">No product sales in this window.</p>
              ) : (
                <ul className="max-h-[min(26rem,58vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain px-5 text-sm [scrollbar-width:thin]">
                  {data.sales.topProducts.slice(0, 8).map((p, i) => (
                    <InventoryVelocityRow
                      key={p.id}
                      rank={i + 1}
                      name={p.name}
                      units={p.units}
                      revenue={p.revenue}
                      maxUnits={salesAggregates.topProductsMaxUnits}
                      barClassName="bg-violet-500/85 dark:bg-violet-400/80"
                    />
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard
              title="Top services"
              description="Bookings and estimated revenue by service — bars compare bookings in this list."
              contentClassName="p-0"
            >
              {data.sales.topServices.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No service revenue in this window.
                </p>
              ) : (
                <ul className="max-h-[min(26rem,58vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain px-5 text-sm [scrollbar-width:thin]">
                  {data.sales.topServices.slice(0, 8).map((s, i) => (
                    <InventoryVelocityRow
                      key={s.name}
                      rank={i + 1}
                      name={s.name}
                      units={s.bookings}
                      revenue={s.revenue}
                      maxUnits={salesAggregates.topServicesMaxBookings}
                      barClassName="bg-sky-500/85 dark:bg-sky-400/75"
                      metricLabel="bookings"
                    />
                  ))}
                </ul>
              )}
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

        <TabsContent value="services" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-amber-500/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-amber-500/14 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/18 text-amber-800 shadow-inner dark:text-amber-200"
                aria-hidden
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Services snapshot
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Bookings, completion quality, and provider signals for the selected window — complements product metrics
                    on Overview and Sales.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <ClipboardList className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      {servicesAggregates.bookingsTotal.toLocaleString()} bookings ·{' '}
                      {formatUgx(data.overview.serviceRevenue)} revenue
                    </span>
                  </Badge>
                  {servicesAggregates.topCategoryLabel ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Top category · {servicesAggregates.topCategoryLabel} (
                        {servicesAggregates.topCategoryCount.toLocaleString()})
                      </span>
                    </Badge>
                  ) : null}
                  {servicesAggregates.topServiceLabel ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Star className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Top service · {servicesAggregates.topServiceLabel} (
                        {servicesAggregates.topServiceCount.toLocaleString()})
                      </span>
                    </Badge>
                  ) : null}
                  {servicesAggregates.weightedAvgStars != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Star className="h-3 w-3 shrink-0 text-amber-600 opacity-90 dark:text-amber-400" aria-hidden />
                      <span className="truncate">
                        Avg rating · {servicesAggregates.weightedAvgStars.toFixed(2)} ★ (
                        {servicesAggregates.reviewCount.toLocaleString()} reviews)
                      </span>
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Completion rate</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {(data.services.completionRate * 100).toFixed(1)}%
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Share of service requests marked completed in period
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-4 shadow-sm',
                data.services.cancellationRate > 0.2
                  ? 'border-rose-500/35 bg-rose-500/8 dark:bg-rose-500/10'
                  : 'border-amber-500/25 bg-amber-500/6 dark:bg-amber-500/10',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2',
                  data.services.cancellationRate > 0.2
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-amber-800 dark:text-amber-400',
                )}
              >
                <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Cancellation rate</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {(data.services.cancellationRate * 100).toFixed(1)}%
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {data.services.cancellationRate > 0.2
                  ? 'Elevated — check provider capacity and buyer expectations.'
                  : 'Cancelled or abandoned requests in this window'}
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <Timer className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. service time</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.services.avgCompletionMinutes != null
                  ? `${data.services.avgCompletionMinutes.toFixed(0)} min`
                  : '—'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Mean time to completion when timestamps allow
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Booking volume</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {servicesAggregates.bookingsTotal.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {data.overview.servicePaymentsCount.toLocaleString()} service payments ·{' '}
                {data.services.bookingsByCategory.length} categor
                {data.services.bookingsByCategory.length === 1 ? 'y' : 'ies'}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Bookings by category"
              description="Volume of service bookings by category (top 10) — colored bars for quick comparison."
            >
              {data.services.bookingsByCategory.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No service bookings in this window.</p>
              ) : (
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.services.bookingsByCategory.slice(0, 10)}
                      margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(v: number) => [`${v} bookings`, 'Count']}
                        cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {data.services.bookingsByCategory.slice(0, 10).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
            <SectionCard
              title="Provider ratings"
              description="Average stars and review volume — bar length is relative to 5★ within this list."
              contentClassName={data.services.ratingsByProvider.length === 0 ? undefined : 'p-0'}
            >
              {data.services.ratingsByProvider.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No ratings in this window.</p>
              ) : (
                <ul className="max-h-[min(24rem,55vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain px-5 text-sm [scrollbar-width:thin]">
                  {data.services.ratingsByProvider.slice(0, 12).map((r, i) => {
                    const starPct = Math.max(6, Math.round((r.avgStars / 5) * 100));
                    return (
                      <li
                        key={r.providerId}
                        className="flex flex-col gap-3 py-3.5 first:pt-3 last:pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-xs font-bold tabular-nums text-muted-foreground"
                            aria-hidden
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="break-all font-mono text-xs leading-snug text-foreground">{r.providerId}</p>
                            <div
                              className="h-1.5 overflow-hidden rounded-full bg-muted"
                              title={`${r.avgStars.toFixed(1)} / 5 average`}
                            >
                              <div
                                className="h-full rounded-full bg-amber-500/85 transition-[width] dark:bg-amber-400/80"
                                style={{ width: `${starPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5 sm:text-right">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {r.avgStars.toFixed(1)} <span className="text-amber-600 dark:text-amber-400">★</span>
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {r.count.toLocaleString()} review{r.count === 1 ? '' : 's'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Bookings by service"
              description="Most-booked service lines in the period (top 8)."
            >
              {data.services.bookingsByService.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No per-service booking rows.</p>
              ) : (
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.services.bookingsByService.slice(0, 8).map((row) => ({
                        name: row.service.length > 22 ? `${row.service.slice(0, 22)}…` : row.service,
                        fullName: row.service,
                        count: row.count,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={128} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v: number) => [`${v} bookings`, 'Count']}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName != null
                            ? String(payload[0].payload.fullName)
                            : 'Service'
                        }
                        cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                      />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>
            <SectionCard
              title="Revenue by provider"
              description="Captured service payments attributed to provider IDs — bar shows share of the top row in this list."
              contentClassName={data.services.revenueByProvider.length === 0 ? undefined : 'p-0'}
            >
              {data.services.revenueByProvider.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No provider revenue in this window.</p>
              ) : (
                <div className="overflow-x-auto [scrollbar-width:thin]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/80 hover:bg-transparent">
                        <TableHead className="bg-muted/20 pl-5 font-mono text-xs">Provider</TableHead>
                        <TableHead className="hidden bg-muted/20 md:table-cell">Mix</TableHead>
                        <TableHead className="bg-muted/20 text-right tabular-nums">Payments</TableHead>
                        <TableHead className="bg-muted/20 pr-5 text-right tabular-nums">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.services.revenueByProvider.slice(0, 12).map((p) => {
                        const mixPct =
                          servicesAggregates.maxProviderRevenue > 0
                            ? Math.round((p.revenue / servicesAggregates.maxProviderRevenue) * 100)
                            : 0;
                        return (
                          <TableRow key={p.providerId} className="border-border/50 transition-colors hover:bg-muted/25">
                            <TableCell className="max-w-[14rem] pl-5">
                              <span className="break-all font-mono text-xs text-foreground">{p.providerId}</span>
                            </TableCell>
                            <TableCell className="hidden w-[min(32%,14rem)] md:table-cell">
                              <div
                                className="h-2 overflow-hidden rounded-full bg-muted"
                                title={`${mixPct}% of top provider in table`}
                              >
                                <div
                                  className="h-full rounded-full bg-fuchsia-500/80 transition-[width] dark:bg-fuchsia-400/75"
                                  style={{ width: `${Math.max(8, mixPct)}%` }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {p.payments.toLocaleString()}
                            </TableCell>
                            <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-foreground">
                              {formatUgx(p.revenue)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-cyan-500/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-cyan-500/14 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/18 text-cyan-900 shadow-inner dark:text-cyan-200"
                aria-hidden
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer cohorts
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    New vs. returning activity, catalog-based lifetime value estimates, and a lightweight funnel for the
                    selected filters.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Users className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      In period · {customersAggregates.newPlusReturning.toLocaleString()} new + returning
                    </span>
                  </Badge>
                  {customersAggregates.newSharePct != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <UserPlus className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">New share · {customersAggregates.newSharePct.toFixed(0)}% of that pair</span>
                    </Badge>
                  ) : null}
                  {customersAggregates.topFunnelStage ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Filter className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Busiest funnel stage · {customersAggregates.topFunnelStage} (
                        {customersAggregates.topFunnelCount.toLocaleString()})
                      </span>
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <ShoppingCart className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Paying customers (overview) · {data.overview.payingCustomersCount.toLocaleString()}
                    </span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">New (period)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.customers.newInPeriod.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                First-time buyers surfaced in this window
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Returning (period)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.customers.returningInPeriod.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Repeat purchasers with prior activity
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
                <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. CLV (catalog)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.customers.avgClv)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Mean lifetime value from catalog orders · Median {formatUgx(data.customers.medianClv)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <BarChart3 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Median CLV</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.customers.medianClv)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {customersAggregates.clvSkewHint ?? '50th percentile of modeled buyer CLV in this view.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-black/4 dark:bg-muted/10 dark:ring-white/6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-inner"
                aria-hidden
              >
                <Megaphone className="h-4 w-4" />
              </div>
              <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">{data.customers.cacNote}</p>
            </div>
          </div>

          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between',
              data.customers.retentionRateApprox != null && data.customers.retentionRateApprox >= 40
                ? 'border-emerald-500/35 bg-emerald-500/8 dark:bg-emerald-500/10'
                : 'border-border/70 bg-muted/15 dark:bg-muted/10',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 text-foreground shadow-inner"
                aria-hidden
              >
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Retention & churn (approx.)</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Retention: share of active buyers who also purchased before. Churn proxy: new buyers as a share of
                  active — directional only.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 sm:justify-end">
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retention</p>
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    data.customers.retentionRateApprox != null && data.customers.retentionRateApprox >= 40
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-foreground',
                  )}
                >
                  {data.customers.retentionRateApprox != null
                    ? `${data.customers.retentionRateApprox.toFixed(1)}%`
                    : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Churn proxy</p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {data.customers.churnRateApprox != null ? `${data.customers.churnRateApprox.toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Simplified funnel"
              description="Counts by lifecycle stage — colored bars for drop-off scanning; hover for exact counts."
            >
              {data.customers.funnel.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No funnel stages in this window.</p>
              ) : (
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.customers.funnel}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        width={168}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v.toLocaleString()}`, 'Count']}
                        cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                        {data.customers.funnel.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Funnel stages"
              description="% of prior stage when provided — mix bar is relative to the largest count in this list."
              contentClassName={data.customers.funnel.length === 0 ? undefined : 'p-0'}
            >
              {data.customers.funnel.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No rows.</p>
              ) : (
                <div className="max-h-[min(24rem,58vh)] overflow-auto overscroll-contain [scrollbar-width:thin]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/80 hover:bg-transparent">
                        <TableHead className="sticky top-0 z-10 bg-muted/95 pl-5 backdrop-blur-sm">Stage</TableHead>
                        <TableHead className="sticky top-0 z-10 hidden bg-muted/95 backdrop-blur-sm md:table-cell">
                          Mix
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 text-right tabular-nums backdrop-blur-sm">
                          % prior
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 pr-5 text-right tabular-nums backdrop-blur-sm">
                          Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.customers.funnel.map((row) => {
                        const mixPct =
                          customersAggregates.funnelMaxCount > 0
                            ? Math.round((row.count / customersAggregates.funnelMaxCount) * 100)
                            : 0;
                        return (
                          <TableRow key={row.stage} className="border-border/50 transition-colors hover:bg-muted/25">
                            <TableCell className="max-w-[14rem] pl-5 font-medium">
                              <span className="line-clamp-2">{row.stage}</span>
                            </TableCell>
                            <TableCell className="hidden w-[min(32%,14rem)] md:table-cell">
                              <div
                                className="h-2 overflow-hidden rounded-full bg-muted"
                                title={`${mixPct}% of largest stage in table`}
                              >
                                <div
                                  className="h-full rounded-full bg-cyan-500/80 transition-[width] dark:bg-cyan-400/75"
                                  style={{ width: `${Math.max(8, mixPct)}%` }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {row.pctOfPrior != null ? (
                                <Badge variant="secondary" className="tabular-nums">
                                  {row.pctOfPrior.toFixed(1)}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-foreground">
                              {row.count.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
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

        <TabsContent value="finance" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-indigo-500/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-indigo-500/14 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/18 text-indigo-800 shadow-inner dark:text-indigo-200"
                aria-hidden
              >
                <Landmark className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finance & payouts
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Disbursement fees, vendor balances, and modeled category margins — pair with Overview for headline
                    revenue and commission estimates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Layers2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Commission (est.) · {formatUgx(data.overview.platformCommissionEstimate)}
                    </span>
                  </Badge>
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <TrendingUp className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Net profit (est.) · {formatUgx(data.overview.netProfitEstimate)}</span>
                  </Badge>
                  {financeAggregates.topCategoryByRevenue ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Top category (revenue) · {financeAggregates.topCategoryByRevenue} (
                        {formatUgx(financeAggregates.topCategoryRevenue)}
                        {financeAggregates.topCategoryMarginPct != null
                          ? ` · ${financeAggregates.topCategoryMarginPct.toFixed(1)}% margin`
                          : ''}
                        )
                      </span>
                    </Badge>
                  ) : null}
                  {financeAggregates.revenueWeightedMarginPct != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Percent className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Revenue-weighted margin · {financeAggregates.revenueWeightedMarginPct.toFixed(1)}%
                      </span>
                    </Badge>
                  ) : null}
                  {financeAggregates.pendingPayoutSharePct != null ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'max-w-full gap-1 font-normal',
                        financeAggregates.pendingPayoutSharePct > 35
                          ? 'border-amber-500/35 bg-amber-500/8 text-amber-950 dark:text-amber-100'
                          : '',
                      )}
                    >
                      <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Pending share · {financeAggregates.pendingPayoutSharePct.toFixed(0)}% of paid+pending
                      </span>
                    </Badge>
                  ) : null}
                  {financeAggregates.highestMarginCategory != null && financeAggregates.highestMarginPct != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Sparkles className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Peak margin category · {financeAggregates.highestMarginCategory} (
                        {financeAggregates.highestMarginPct.toFixed(1)}%)
                      </span>
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/6 p-4 shadow-sm dark:bg-indigo-500/10">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                <Layers2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Fees (disbursements)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.finance.platformFeesFromDisbursements)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Platform fees attributed to disbursement rows in range
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-4 shadow-sm',
                financeAggregates.pendingPayoutSharePct != null && financeAggregates.pendingPayoutSharePct > 35
                  ? 'border-amber-500/35 bg-amber-500/8 dark:bg-amber-500/10'
                  : 'border-amber-500/25 bg-amber-500/6 dark:bg-amber-500/10',
              )}
            >
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Timer className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Payouts pending</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.finance.payoutsPending)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Awaiting settlement · Paid (lifetime) {formatUgx(data.finance.payoutsPaid)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Payouts paid</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.finance.payoutsPaid)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Cumulative paid out (lifetime sum)</p>
            </div>
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/6 p-4 shadow-sm dark:bg-rose-500/10">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding (estimate)</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.finance.outstandingVendorBalanceEstimate)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Vendor balance still owed — reconcile with Paytota and ledger
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-black/4 dark:bg-muted/10 dark:ring-white/6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-inner"
                aria-hidden
              >
                <Percent className="h-4 w-4" />
              </div>
              <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">{data.finance.taxNote}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Margin by category"
              description="Revenue bars (UGX) with modeled margin % as a line — dual scale for mix vs. rate."
            >
              {data.finance.marginByCategory.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No category margin rows for this window.</p>
              ) : (
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.finance.marginByCategory} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
                        interval={0}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => (typeof v === 'number' && v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`)}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Revenue') return [formatUgx(Number(value)), name];
                          if (name === 'Margin %') return [`${Number(value).toFixed(1)}%`, name];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        name="Revenue"
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={52}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="marginPct"
                        name="Margin %"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              {financeAggregates.marginRevenueSum > 0 ? (
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Roll-up revenue in chart · {formatUgx(financeAggregates.marginRevenueSum)} across{' '}
                  {data.finance.marginByCategory.length} line{data.finance.marginByCategory.length === 1 ? '' : 's'}
                </p>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Category margin detail"
              description="Same data as the chart — revenue share vs. the strongest category in this list and modeled margin %."
              contentClassName={data.finance.marginByCategory.length === 0 ? undefined : 'p-0'}
            >
              {data.finance.marginByCategory.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No rows to show.</p>
              ) : (
                <div className="max-h-[min(24rem,58vh)] overflow-auto overscroll-contain [scrollbar-width:thin]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/80 hover:bg-transparent">
                        <TableHead className="sticky top-0 z-10 bg-muted/95 pl-5 backdrop-blur-sm">Category</TableHead>
                        <TableHead className="sticky top-0 z-10 hidden bg-muted/95 backdrop-blur-sm md:table-cell">
                          Mix
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-muted/95 text-right tabular-nums backdrop-blur-sm">
                          Margin
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-muted/95 pr-5 text-right tabular-nums backdrop-blur-sm">
                          Revenue
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.finance.marginByCategory.map((row) => {
                        const mixPct =
                          financeAggregates.maxCategoryRevenue > 0
                            ? Math.round((row.revenue / financeAggregates.maxCategoryRevenue) * 100)
                            : 0;
                        return (
                          <TableRow key={row.category} className="border-border/50 transition-colors hover:bg-muted/25">
                            <TableCell className="max-w-[12rem] pl-5 font-medium">
                              <span className="line-clamp-2">{row.category}</span>
                            </TableCell>
                            <TableCell className="hidden w-[min(32%,14rem)] md:table-cell">
                              <div
                                className="h-2 overflow-hidden rounded-full bg-muted"
                                title={`${mixPct}% of top category in table`}
                              >
                                <div
                                  className="h-full rounded-full bg-indigo-500/80 transition-[width] dark:bg-indigo-400/75"
                                  style={{ width: `${Math.max(8, mixPct)}%` }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="tabular-nums">
                                {row.marginPct.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-foreground">
                              {formatUgx(row.revenue)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-slate-500/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-slate-500/15 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-500/18 text-slate-800 shadow-inner dark:text-slate-200"
                aria-hidden
              >
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Operations & support
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Queue health, resolution speed, payment failures, and the themes buyers contact you about in this
                    window.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Ticket className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Ticket signal · {operationsAggregates.ticketThroughput.toLocaleString()} open + resolved (proxy)
                    </span>
                  </Badge>
                  {operationsAggregates.openToResolvedRatio != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Bell className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Open ÷ resolved · {operationsAggregates.openToResolvedRatio.toFixed(2)} (backlog pressure)
                      </span>
                    </Badge>
                  ) : null}
                  {data.operations.avgResolutionHours != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Avg resolution · {data.operations.avgResolutionHours.toFixed(1)} h
                      </span>
                    </Badge>
                  ) : null}
                  {operationsAggregates.txFailurePct != null && operationsAggregates.txTotal > 0 ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'max-w-full gap-1 font-normal',
                        operationsAggregates.txFailurePct > 15
                          ? 'border-rose-500/35 bg-rose-500/8 text-rose-950 dark:text-rose-100'
                          : '',
                      )}
                    >
                      <CreditCard className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Tx failure · {operationsAggregates.txFailurePct.toFixed(1)}% of tracked attempts
                      </span>
                    </Badge>
                  ) : null}
                  {operationsAggregates.topSubjectLabel ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <Search className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Top subject ·{' '}
                        {operationsAggregates.topSubjectLabel.length > 42
                          ? `${operationsAggregates.topSubjectLabel.slice(0, 42)}…`
                          : operationsAggregates.topSubjectLabel}
                      </span>
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Globe className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Paytota rows in range · {data.paytotaRowCount.toLocaleString()}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div
              className={cn(
                'rounded-xl border p-4 shadow-sm',
                data.operations.supportTicketsOpen > 0 &&
                  data.operations.supportTicketsResolved > 0 &&
                  data.operations.supportTicketsOpen > data.operations.supportTicketsResolved
                  ? 'border-amber-500/35 bg-amber-500/8 dark:bg-amber-500/10'
                  : 'border-slate-500/25 bg-slate-500/6 dark:bg-slate-500/10',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2',
                  data.operations.supportTicketsOpen > 0 &&
                    data.operations.supportTicketsResolved > 0 &&
                    data.operations.supportTicketsOpen > data.operations.supportTicketsResolved
                    ? 'text-amber-800 dark:text-amber-400'
                    : 'text-slate-800 dark:text-slate-300',
                )}
              >
                <Bell className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Tickets open</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.operations.supportTicketsOpen.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Open or in-progress in support queue
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Tickets resolved</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.operations.supportTicketsResolved.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Closed in the selected period</p>
            </div>
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <Timer className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Avg. resolution</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.operations.avgResolutionHours != null
                  ? `${data.operations.avgResolutionHours.toFixed(1)} h`
                  : '—'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mean hours for resolved tickets</p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-4 shadow-sm',
                operationsAggregates.txFailurePct != null && operationsAggregates.txFailurePct > 15
                  ? 'border-rose-500/35 bg-rose-500/8 dark:bg-rose-500/10'
                  : 'border-slate-500/25 bg-slate-500/6 dark:bg-slate-500/10',
              )}
            >
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300">
                <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Failed transactions</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {data.operations.failedTransactions.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {operationsAggregates.txTotal > 0 && operationsAggregates.txFailurePct != null
                  ? `${operationsAggregates.txFailurePct.toFixed(1)}% of ${operationsAggregates.txTotal.toLocaleString()} tracked`
                  : 'No tracked attempts in this slice'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-black/4 dark:bg-muted/10 dark:ring-white/6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 text-emerald-700 shadow-inner dark:text-emerald-400"
                  aria-hidden
                >
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Payment attempts (tracked)</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Succeeded vs. failed counts follow Paytota when rows exist in range; otherwise in-memory payment
                    stats. Row count reflects Paytota payloads loaded for this filter.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 sm:justify-end">
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Succeeded</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {data.operations.succeededTransactions.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Failed</p>
                  <p
                    className={cn(
                      'text-xl font-bold tabular-nums',
                      data.operations.failedTransactions > 0
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-foreground',
                    )}
                  >
                    {data.operations.failedTransactions.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paytota rows</p>
                  <p className="text-xl font-bold tabular-nums text-foreground">
                    {data.paytotaRowCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Common ticket subjects"
              description="Most frequent support themes — truncated labels on the axis; tooltip shows the full subject."
            >
              {data.operations.commonTicketSubjects.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No ticket subjects in this window.</p>
              ) : (
                <div className="h-[280px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.operations.commonTicketSubjects.map((row) => ({
                        label: row.subject.length > 24 ? `${row.subject.slice(0, 24)}…` : row.subject,
                        fullSubject: row.subject,
                        count: row.count,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={132} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v: number) => [`${v.toLocaleString()}`, 'Tickets']}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullSubject != null
                            ? String(payload[0].payload.fullSubject)
                            : 'Subject'
                        }
                        cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={26}>
                        {data.operations.commonTicketSubjects.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Subject breakdown"
              description="Same subjects as the chart — mix bar is relative to the busiest theme in this list."
              contentClassName={data.operations.commonTicketSubjects.length === 0 ? undefined : 'p-0'}
            >
              {data.operations.commonTicketSubjects.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No rows.</p>
              ) : (
                <div className="max-h-[min(24rem,58vh)] overflow-auto overscroll-contain [scrollbar-width:thin]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/80 hover:bg-transparent">
                        <TableHead className="sticky top-0 z-10 bg-muted/95 pl-5 backdrop-blur-sm">Subject</TableHead>
                        <TableHead className="sticky top-0 z-10 hidden bg-muted/95 backdrop-blur-sm md:table-cell">
                          Mix
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 pr-5 text-right tabular-nums backdrop-blur-sm">
                          Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.operations.commonTicketSubjects.map((row) => {
                        const mixPct =
                          operationsAggregates.maxSubjectCount > 0
                            ? Math.round((row.count / operationsAggregates.maxSubjectCount) * 100)
                            : 0;
                        return (
                          <TableRow key={row.subject} className="border-border/50 transition-colors hover:bg-muted/25">
                            <TableCell className="max-w-[min(100%,18rem)] pl-5">
                              <span className="line-clamp-3 text-sm font-medium text-foreground">{row.subject}</span>
                            </TableCell>
                            <TableCell className="hidden w-[min(32%,14rem)] md:table-cell">
                              <div
                                className="h-2 overflow-hidden rounded-full bg-muted"
                                title={`${mixPct}% of top subject in table`}
                              >
                                <div
                                  className="h-full rounded-full bg-slate-500/80 transition-[width] dark:bg-slate-400/75"
                                  style={{ width: `${Math.max(8, mixPct)}%` }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="pr-5 text-right text-sm font-semibold tabular-nums text-foreground">
                              {row.count.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-8 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-primary/12 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-primary/18 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/18 text-primary shadow-inner"
                aria-hidden
              >
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Insights</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Lightweight forecasts and catalog heuristics — not a replacement for BI or ML models, but fast
                    signals for ops and merchandising with your current filters.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Package className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Restock ideas · {insightsAggregates.restockCount.toLocaleString()}
                    </span>
                  </Badge>
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Tag className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      Price hints · {insightsAggregates.priceHintCount.toLocaleString()}
                    </span>
                  </Badge>
                  {insightsAggregates.forecastToPeriodRatio != null ? (
                    <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                      <LineChartIcon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                      <span className="truncate">
                        Forecast ÷ period revenue · {insightsAggregates.forecastToPeriodRatio.toFixed(2)}× (30d vs
                        selected window)
                      </span>
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <DollarSign className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Period revenue · {formatUgx(data.overview.revenueTotal)}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between',
              'border-primary/30 bg-primary/8 dark:bg-primary/12',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/70 text-primary shadow-inner"
                aria-hidden
              >
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Demand trend</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground/90">{data.predictive.demandTrendLabel}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
                <LineChartIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">30-day revenue forecast</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatUgx(data.predictive.revenueForecastNext30d)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Naive extrapolation from recent monthly buckets — swap for ML when volume and features justify it.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Package className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Restock signals</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {insightsAggregates.restockCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">SKUs flagged by velocity heuristic</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Percent className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Pricing hints</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {insightsAggregates.priceHintCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Catalog rows with guardrail copy</p>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 shadow-sm" asChild>
              <Link href="/admin/products">
                <Package className="h-3.5 w-3.5" />
                Manage catalog
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Restock suggestions"
              description="Heuristic signals tied to fast movers — review stock and vendor lead times before acting."
              contentClassName={data.predictive.restockSuggestions.length === 0 ? undefined : 'p-0'}
            >
              {data.predictive.restockSuggestions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No restock suggestions for this filter set.
                </p>
              ) : (
                <ul className="max-h-[min(28rem,60vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain text-sm [scrollbar-width:thin]">
                  {data.predictive.restockSuggestions.map((s) => (
                    <li key={s.productId} className="flex gap-3 px-5 py-4 first:pt-4 last:pb-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                        aria-hidden
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-foreground">{s.name}</p>
                        <p className="mt-1.5 text-xs font-mono text-muted-foreground">{s.productId}</p>
                        <p className="mt-2 leading-relaxed text-muted-foreground">{s.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard
              title="Price optimization hints"
              description="Compare-at and discount posture — use alongside margin views on Finance."
              contentClassName={data.predictive.priceOptimizationHints.length === 0 ? undefined : 'p-0'}
            >
              {data.predictive.priceOptimizationHints.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No pricing hints for this filter set.
                </p>
              ) : (
                <ul className="max-h-[min(28rem,60vh)] divide-y divide-border/60 overflow-y-auto overscroll-contain text-sm [scrollbar-width:thin]">
                  {data.predictive.priceOptimizationHints.map((s) => (
                    <li key={s.productId} className="flex gap-3 px-5 py-4 first:pt-4 last:pb-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-800 dark:text-amber-400"
                        aria-hidden
                      >
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-foreground">{s.name}</p>
                        <p className="mt-1.5 text-xs font-mono text-muted-foreground">{s.productId}</p>
                        <p className="mt-2 leading-relaxed text-muted-foreground">{s.hint}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 shadow-sm ring-1 ring-black/4 dark:bg-muted/10 dark:ring-white/6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-inner"
                aria-hidden
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                Personalized recommendations for buyers already run on the storefront feed; this admin tab stays focused
                on aggregate demand, inventory nudges, and pricing guardrails for the selected date range and scopes.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-teal-500/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-teal-500/14 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-800 shadow-inner dark:text-teal-300"
                aria-hidden
              >
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Reports &amp; exports
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Download a snapshot of the current analytics dataset. The CSV mirrors the filters in{' '}
                    <span className="font-medium text-foreground">Filters &amp; scope</span> — dates, vendor, and
                    categories all flow through to the file.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Data {lastUpdatedLabel || '—'}</span>
                  </Badge>
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Filter className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">{reportsScopeSummary.presetLabel}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/[0.08] via-card to-card p-5 shadow-md ring-1 ring-emerald-500/10 dark:from-emerald-500/12 dark:ring-emerald-500/15">
              <div
                className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-800 shadow-inner dark:text-emerald-300"
                    aria-hidden
                  >
                    <Download className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">CSV export</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      UTF-8 comma-separated values. Opens cleanly in Excel, Google Sheets, and Numbers.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3 shadow-inner dark:bg-background/40">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active scope
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-foreground/95">
                    <li className="grid gap-0.5 sm:grid-cols-[5rem_1fr] sm:gap-x-3">
                      <span className="text-muted-foreground">Range</span>
                      <span className="font-medium leading-snug">{reportsScopeSummary.rangeLine}</span>
                    </li>
                    <li className="grid gap-0.5 sm:grid-cols-[5rem_1fr] sm:gap-x-3">
                      <span className="text-muted-foreground">Vendor</span>
                      <span className="min-w-0 font-medium leading-snug">{reportsScopeSummary.vendorLabel}</span>
                    </li>
                    <li className="grid gap-0.5 sm:grid-cols-[5rem_1fr] sm:gap-x-3">
                      <span className="text-muted-foreground">Categories</span>
                      <span className="min-w-0 font-medium leading-snug">
                        {reportsScopeSummary.productCatLabel}
                        <span className="text-muted-foreground"> · </span>
                        {reportsScopeSummary.serviceCatLabel}
                      </span>
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Included sections
                  </p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      'Overview KPIs (revenue, orders, profit estimates)',
                      'Revenue by category',
                      'Top products (units & revenue)',
                      'Export metadata (generated time, window)',
                    ].map((line) => (
                      <li
                        key={line}
                        className="flex gap-2 rounded-lg border border-border/50 bg-muted/25 px-2.5 py-2 text-xs leading-relaxed text-foreground/90 dark:bg-muted/15"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
                  <Button
                    type="button"
                    className="gap-2 shadow-sm"
                    onClick={() => downloadAnalyticsCsv(data)}
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                  <Button type="button" variant="outline" className="gap-2 border-border/80" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    Print summary
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-violet-500/25 bg-linear-to-b from-violet-500/[0.06] via-muted/15 to-card p-5 shadow-sm ring-1 ring-violet-500/10 dark:from-violet-500/10 dark:ring-violet-500/15">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/18 text-violet-800 shadow-inner dark:text-violet-300"
                  aria-hidden
                >
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">Scheduled delivery</h2>
                    <Badge
                      variant="secondary"
                      className="border border-violet-500/25 bg-violet-500/10 text-xs font-medium text-violet-950 dark:text-violet-100"
                    >
                      Coming soon
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Automated digests will reuse the same query parameters as manual exports once email or webhook
                    delivery is connected.
                  </p>
                </div>
              </div>

              <ul className="mt-4 flex-1 space-y-3">
                <li className="flex gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-3 dark:bg-background/30">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    aria-hidden
                  >
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Weekly email digest</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Roll-up of revenue, orders, and alerts for leadership inboxes.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-3 dark:bg-background/30">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    aria-hidden
                  >
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Monthly snapshot</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      Longer window CSV pushed on a schedule or fetched from a signed cron URL.
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground/90">Integration note:</span> wire a mail provider or
                  queue worker to call{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/90">
                    /api/admin/analytics
                  </code>{' '}
                  with the same filters you set above.
                </p>
              </div>

              <Button type="button" variant="secondary" disabled className="mt-4 w-full gap-2 sm:w-auto" size="sm">
                <CalendarClock className="h-4 w-4 opacity-50" />
                Schedule report
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visuals" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-sky-500/10 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-sky-500/14 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-800 shadow-inner dark:text-sky-300"
                aria-hidden
              >
                <Palette className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Visuals &amp; patterns
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Explore category comparisons and a weekday activity grid for the filtered period. Toggle comparison
                    mode in <span className="font-medium text-foreground">Filters &amp; scope</span> to overlay a modeled
                    baseline on category revenue.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'max-w-full gap-1 font-normal',
                      compareMode &&
                        'border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100',
                    )}
                  >
                    <LineChartIcon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Comparison {compareMode ? 'on' : 'off'}</span>
                  </Badge>
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <Activity className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">Weekday heatmap</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {!compareMode ? (
              <div className="rounded-xl border border-dashed border-sky-500/35 bg-linear-to-b from-sky-500/[0.06] to-muted/10 px-6 py-10 text-center shadow-sm dark:from-sky-500/10">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-800 dark:text-sky-300"
                  aria-hidden
                >
                  <LineChartIcon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold tracking-tight text-foreground">Comparison chart hidden</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Enable <span className="font-medium text-foreground">Comparison charts in Visuals</span> in the
                  filters card above to show current category revenue next to a baseline derived from MoM %.
                </p>
                <Button type="button" className="mt-5 gap-2 shadow-sm" onClick={() => setCompareMode(true)}>
                  <LineChartIcon className="h-4 w-4" />
                  Turn on comparison
                </Button>
              </div>
            ) : categoryCompareData.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-muted/15 px-6 py-12 text-center shadow-sm">
                <BarChart3 className="mx-auto h-9 w-9 text-muted-foreground/70" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No categories to compare</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This window has no category revenue. Widen the date range or clear category filters.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-indigo-500/25 bg-card shadow-md ring-1 ring-indigo-500/10 dark:ring-indigo-500/15">
                <div className="border-b border-border/60 bg-linear-to-r from-indigo-500/[0.08] via-muted/25 to-transparent px-5 py-3.5 dark:from-indigo-500/12">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        Category revenue — current vs. baseline
                      </h3>
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                        Side-by-side bars; baseline approximates the prior period using platform MoM %.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" aria-hidden />
                        Current
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-[#94a3b8]" aria-hidden />
                        Baseline
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="h-[min(22rem,55vh)] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryCompareData}
                        margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={{ className: 'stroke-border' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) =>
                            typeof v === 'number' && v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`
                          }
                        />
                        <Tooltip
                          formatter={(v: number) => formatUgx(v)}
                          cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 8 }} />
                        <Bar dataKey="current" fill="#3b82f6" name="Current" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        <Bar dataKey="previous" fill="#94a3b8" name="Baseline" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-4 border-t border-border/50 pt-4 text-xs leading-relaxed text-muted-foreground">
                    Baseline bars are modeled from MoM % — for an exact prior-category breakdown, export twice with
                    shifted date ranges in the Reports tab.
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-card shadow-md ring-1 ring-emerald-500/10 dark:ring-emerald-500/15">
              <div className="border-b border-border/60 bg-linear-to-r from-emerald-500/[0.08] via-muted/25 to-transparent px-5 py-3.5 dark:from-emerald-500/12">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Weekday activity</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Product orders (P) and service bookings (S) summed by weekday in the selected window — height and color
                  reflect relative volume.
                </p>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-20 shrink-0 rounded-full bg-linear-to-r from-sky-500/35 via-sky-500/70 to-emerald-500"
                      aria-hidden
                    />
                    <span>Lower → higher combined activity</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/90">Legend:</span> P orders · S bookings
                  </p>
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                  {data.heatmapWeekday.map((h) => {
                    const total = h.productOrders + h.serviceBookings;
                    const intensity = total / heatMax;
                    const isPeak = heatmapPeakDay?.weekday === h.weekday && total > 0;
                    return (
                      <div key={h.weekday} className="flex min-w-0 flex-col items-center gap-2 text-center">
                        <div
                          title={`${h.weekday}: ${h.productOrders} product orders, ${h.serviceBookings} service bookings`}
                          className={cn(
                            'flex h-16 w-full max-w-[6rem] flex-col justify-end rounded-xl border p-2 text-[10px] font-medium text-white shadow-inner ring-1 ring-black/10 transition-transform sm:h-[5.25rem]',
                            isPeak && 'ring-2 ring-emerald-400/90 ring-offset-2 ring-offset-background sm:scale-[1.02]',
                          )}
                          style={{
                            background: `linear-gradient(to top, rgb(59 130 246 / ${0.28 + intensity * 0.72}), rgb(16 185 129 / ${0.22 + intensity * 0.58}))`,
                          }}
                        >
                          <span className="text-[11px] font-semibold tracking-tight drop-shadow-sm">{h.weekday}</span>
                          <span className="mt-1 drop-shadow-sm">
                            P{h.productOrders} · S{h.serviceBookings}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {heatmapPeakDay && heatmapPeakDay.productOrders + heatmapPeakDay.serviceBookings > 0 ? (
                  <p className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs leading-relaxed text-muted-foreground dark:bg-emerald-500/10">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <span>
                      <span className="font-medium text-foreground">Busiest day:</span> {heatmapPeakDay.weekday} (
                      {heatmapPeakDay.productOrders} orders · {heatmapPeakDay.serviceBookings} bookings)
                    </span>
                  </p>
                ) : (
                  <p className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                    No product or service activity in this window for the heatmap.
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-1 gap-4 rounded-xl border border-border/70 bg-linear-to-br from-rose-500/8 via-card to-card p-4 shadow-sm ring-1 ring-black/4 dark:from-rose-500/12 dark:ring-white/6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-800 shadow-inner dark:text-rose-300"
                aria-hidden
              >
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Automated alerts
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/95">
                    Rule-based flags for the current filters — revenue stress, payments, cancellations, and catalog
                    nudges. Severity helps you triage before wiring notifications.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="max-w-full gap-1 font-normal">
                    <ClipboardList className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      {alertStats.total} active
                      {alertStats.total === 1 ? ' alert' : ' alerts'}
                    </span>
                  </Badge>
                  {alertStats.critical > 0 ? (
                    <Badge
                      variant="secondary"
                      className="max-w-full gap-1 border border-rose-500/30 bg-rose-500/10 font-normal text-rose-950 dark:text-rose-100"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                      {alertStats.critical} critical
                    </Badge>
                  ) : null}
                  {alertStats.warning > 0 ? (
                    <Badge
                      variant="secondary"
                      className="max-w-full gap-1 border border-amber-500/30 bg-amber-500/10 font-normal text-amber-950 dark:text-amber-100"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                      {alertStats.warning} warning
                    </Badge>
                  ) : null}
                  {alertStats.info > 0 ? (
                    <Badge
                      variant="secondary"
                      className="max-w-full gap-1 border border-sky-500/25 bg-sky-500/8 font-normal text-sky-950 dark:text-sky-100"
                    >
                      <Info className="h-3 w-3 shrink-0" aria-hidden />
                      {alertStats.info} info
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {sortedAlerts.length === 0 ? (
            <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-linear-to-b from-emerald-500/[0.07] to-card px-6 py-14 text-center shadow-md ring-1 ring-emerald-500/10 dark:from-emerald-500/12">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 shadow-inner dark:text-emerald-400"
                aria-hidden
              >
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-base font-semibold tracking-tight text-foreground">All clear</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                No rules fired for this date range and scope. Adjust filters or check back after more activity.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Analytics alerts">
              {sortedAlerts.map((a, i) => {
                const severityLabel =
                  a.severity === 'critical' ? 'Critical' : a.severity === 'warning' ? 'Warning' : 'Info';
                const Icon = a.severity === 'info' ? Info : AlertTriangle;
                return (
                  <li
                    key={`${a.title}-${i}`}
                    className={cn(
                      'relative overflow-hidden rounded-xl border text-sm shadow-sm ring-1 transition-colors',
                      'before:absolute before:top-0 before:bottom-0 before:left-0 before:w-[3px]',
                      a.severity === 'critical' &&
                        'border-rose-500/35 bg-rose-500/6 ring-rose-500/10 before:bg-rose-500 dark:bg-rose-500/10',
                      a.severity === 'warning' &&
                        'border-amber-500/35 bg-amber-500/6 ring-amber-500/10 before:bg-amber-500 dark:bg-amber-500/10',
                      a.severity === 'info' &&
                        'border-sky-500/25 bg-sky-500/[0.06] ring-sky-500/10 before:bg-sky-500 dark:bg-sky-500/10',
                    )}
                  >
                    <div className="flex gap-4 p-4 pl-5">
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner',
                          a.severity === 'critical' && 'bg-rose-500/20 text-rose-700 dark:text-rose-400',
                          a.severity === 'warning' && 'bg-amber-500/20 text-amber-800 dark:text-amber-400',
                          a.severity === 'info' && 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
                        )}
                        aria-hidden
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <p className="font-semibold tracking-tight text-foreground">{a.title}</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold uppercase tracking-wide',
                              a.severity === 'critical' &&
                                'border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-100',
                              a.severity === 'warning' &&
                                'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100',
                              a.severity === 'info' &&
                                'border-sky-500/35 bg-sky-500/8 text-sky-900 dark:text-sky-100',
                            )}
                          >
                            {severityLabel}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{a.detail}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3 shadow-sm dark:bg-muted/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-inner"
                aria-hidden
              >
                <Megaphone className="h-4 w-4" />
              </div>
              <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/90">Notifications:</span> these alerts are dashboard-only
                until you connect email, Slack, or webhooks. Reuse the same thresholds in a worker that polls{' '}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/90">
                  /api/admin/analytics
                </code>
                .
              </p>
            </div>
          </div>
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
