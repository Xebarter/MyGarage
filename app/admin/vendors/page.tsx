'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Vendor } from '@/lib/db';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type DirectoryStats = {
  total: number;
  vendorVerified: number;
  servicesVerified: number;
  listedProducts: number;
  avgRating: number;
};

type AdminVendorsResponse = {
  items: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  stats: DirectoryStats;
};

type ProviderFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: string;
};

type AccountFilter = 'all' | 'vendor_only' | 'provider_only' | 'needs_verification';

const initialProviderForm: ProviderFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  rating: '4.5',
};

const ACCOUNT_FILTERS: { value: AccountFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vendor_only', label: 'Vendor portal' },
  { value: 'provider_only', label: 'Provider portal' },
  { value: 'needs_verification', label: 'Needs review' },
];

function accountInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatJoined(value: Vendor['createdAt']) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, 'd MMM yyyy');
}

function clampCount(n: number) {
  return Math.max(0, n);
}

function VendorsLoadingSkeleton() {
  return (
    <div className="min-h-full bg-muted/25">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-8 px-4 py-8 md:px-8 md:py-10">
        <div className="h-40 rounded-2xl border border-border/50 bg-card/80 shadow-sm" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-border/50 bg-card/60 shadow-sm" />
          ))}
        </div>
        <div className="h-20 rounded-xl border border-border/50 bg-card/60" />
        <div className="h-[480px] rounded-xl border border-border/50 bg-card/50 shadow-sm" />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon,
  progress,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  progress?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <Card
      className={cn(
        'group overflow-hidden border-border/60 bg-linear-to-b from-card to-muted/15 shadow-sm ring-1 ring-black/3 transition-all duration-200 dark:ring-white/4',
        onClick && 'cursor-pointer hover:border-border hover:shadow-md',
        active && 'border-primary/40 ring-primary/15',
      )}
    >
      <CardContent className="flex gap-3.5 p-4 sm:gap-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-11 sm:w-11 [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-wider text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">{value}</p>
          {hint ? <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">{hint}</p> : null}
          {typeof progress === 'number' ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!onClick) return inner;
  return (
    <button type="button" className="w-full text-left" onClick={onClick}>
      {inner}
    </button>
  );
}

function AccountAvatar({ vendor }: { vendor: Vendor }) {
  return (
    <Avatar className="h-11 w-11 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      {vendor.imageUrl ? <AvatarImage src={vendor.imageUrl} alt="" className="rounded-xl object-cover" /> : null}
      <AvatarFallback className="rounded-xl bg-primary/12 text-xs font-bold tracking-tight text-primary">
        {accountInitials(vendor.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [directoryStats, setDirectoryStats] = useState<DirectoryStats>({
    total: 0,
    vendorVerified: 0,
    servicesVerified: 0,
    listedProducts: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(() => new Set());
  const [creatingProvider, setCreatingProvider] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [providerForm, setProviderForm] = useState<ProviderFormState>(initialProviderForm);
  const [filter, setFilter] = useState<AccountFilter>('all');
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadDirectory() {
      setError(null);
      if (!initialLoadDone.current) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          filter,
          q: debouncedQuery,
        });
        const response = await fetch(`/api/admin/vendors?${params}`);
        if (response.status === 403) {
          throw new Error('Admin access required to load this directory.');
        }
        if (!response.ok) throw new Error('Failed to fetch vendors');
        const data = (await response.json()) as AdminVendorsResponse;
        if (cancelled) return;

        const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize) || 1);
        if (page > totalPages) {
          setPage(totalPages);
          return;
        }

        setVendors(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
        if (data.stats) setDirectoryStats(data.stats);
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load vendors.');
          setVendors([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          initialLoadDone.current = true;
          setLoading(false);
          setTableLoading(false);
        }
      }
    }

    void loadDirectory();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, filter, debouncedQuery]);

  async function refetchDirectory() {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        filter,
        q: debouncedQuery,
      });
      const response = await fetch(`/api/admin/vendors?${params}`);
      if (!response.ok) throw new Error('Failed to refresh');
      const data = (await response.json()) as AdminVendorsResponse;
      const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize) || 1);
      if (page > totalPages) {
        setPage(totalPages);
        return;
      }
      setVendors(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
      if (data.stats) setDirectoryStats(data.stats);
    } catch (e) {
      console.error(e);
      toast.error('Could not reload the directory.');
    } finally {
      setRefreshing(false);
    }
  }

  async function copyToClipboard(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Clipboard access was blocked.');
    }
  }

  function applyUpdatedVendor(updated: Vendor, field: 'vendorVerified' | 'servicesVerified', next: boolean) {
    setVendors((current) => current.map((v) => (v.id === updated.id ? updated : v)));
    setDirectoryStats((s) => {
      if (field === 'vendorVerified') {
        return { ...s, vendorVerified: clampCount(s.vendorVerified + (next ? 1 : -1)) };
      }
      return { ...s, servicesVerified: clampCount(s.servicesVerified + (next ? 1 : -1)) };
    });
  }

  async function setVendorVerification(vendorId: string, nextVerified: boolean) {
    if (!vendorId) return;
    setVerifyingIds((current) => new Set(current).add(vendorId));
    try {
      const response = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorVerified: nextVerified }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to update vendor verification.');
      }
      const updated = (await response.json()) as Vendor;
      applyUpdatedVendor(updated, 'vendorVerified', nextVerified);
      toast.success(nextVerified ? 'Vendor portal enabled' : 'Vendor portal disabled', {
        description: updated.name,
      });
    } catch (e) {
      console.error('Failed to verify vendor:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to update vendor verification.');
    } finally {
      setVerifyingIds((current) => {
        const next = new Set(current);
        next.delete(vendorId);
        return next;
      });
    }
  }

  async function setServiceProviderVerification(providerId: string, nextVerified: boolean) {
    if (!providerId) return;
    setVerifyingIds((current) => new Set(current).add(providerId));
    try {
      const response = await fetch(`/api/vendors/${encodeURIComponent(providerId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicesVerified: nextVerified }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to update service-provider verification.');
      }
      const updated = (await response.json()) as Vendor;
      applyUpdatedVendor(updated, 'servicesVerified', nextVerified);
      toast.success(nextVerified ? 'Provider portal enabled' : 'Provider portal disabled', {
        description: updated.name,
      });
    } catch (e) {
      console.error('Failed to verify service provider:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to update service-provider verification.');
    } finally {
      setVerifyingIds((current) => {
        const next = new Set(current);
        next.delete(providerId);
        return next;
      });
    }
  }

  async function createServiceProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingProvider) return;
    setCreatingProvider(true);
    try {
      const payload = {
        ...providerForm,
        rating: Number(providerForm.rating),
        totalProducts: 0,
      };
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to create service provider.');
      }
      setProviderForm(initialProviderForm);
      setCreateDialogOpen(false);
      await refetchDirectory();
      toast.success('Provider created');
    } catch (e) {
      console.error('Failed to create service provider:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to create service provider.');
    } finally {
      setCreatingProvider(false);
    }
  }

  const stats = useMemo(() => {
    const s = directoryStats;
    const vendorPending = Math.max(0, s.total - s.vendorVerified);
    const servicesPending = Math.max(0, s.total - s.servicesVerified);
    return {
      ...s,
      vendorPending,
      servicesPending,
      vendorRate: s.total > 0 ? (s.vendorVerified / s.total) * 100 : 0,
      servicesRate: s.total > 0 ? (s.servicesVerified / s.total) * 100 : 0,
    };
  }, [directoryStats]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  if (loading) return <VendorsLoadingSkeleton />;

  return (
    <div className="min-h-full bg-muted/25">
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 md:px-8 md:py-10">
        <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/3 dark:ring-white/4">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-primary/7 blur-3xl" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between md:p-8">
            <div className="flex gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
                <Truck className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Directory</p>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Vendors &amp; providers
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                  Review accounts, grant portal access, and onboard service providers. Dashboards stay inactive until
                  you verify them here.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-border/80 bg-background/80 px-3.5 shadow-sm"
                disabled={refreshing || tableLoading}
                onClick={() => void refetchDirectory()}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                Refresh
              </Button>
              <Dialog
                open={createDialogOpen}
                onOpenChange={(open) => {
                  if (!open && !creatingProvider) setProviderForm(initialProviderForm);
                  setCreateDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button type="button" size="sm" className="h-10 gap-2 rounded-xl px-4 shadow-sm">
                    <Plus className="h-4 w-4" aria-hidden />
                    Add provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
                  <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
                    <DialogTitle className="text-xl tracking-tight">New service provider</DialogTitle>
                    <DialogDescription className="text-[13px] leading-relaxed">
                      Create a profile for the services portal. Access stays off until you verify them in this
                      directory.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createServiceProvider} className="space-y-4 px-6 py-5">
                    <div className="space-y-2">
                      <Label htmlFor="provider-name">Business name</Label>
                      <Input
                        id="provider-name"
                        required
                        type="text"
                        placeholder="Acme Auto Care"
                        value={providerForm.name}
                        onChange={(event) =>
                          setProviderForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="provider-email">Email</Label>
                        <Input
                          id="provider-email"
                          required
                          type="email"
                          placeholder="hello@example.com"
                          value={providerForm.email}
                          onChange={(event) =>
                            setProviderForm((current) => ({ ...current, email: event.target.value }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="provider-phone">Phone</Label>
                        <Input
                          id="provider-phone"
                          required
                          type="text"
                          placeholder="+256 …"
                          value={providerForm.phone}
                          onChange={(event) =>
                            setProviderForm((current) => ({ ...current, phone: event.target.value }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider-address">Address</Label>
                      <Input
                        id="provider-address"
                        required
                        type="text"
                        placeholder="Street, city"
                        value={providerForm.address}
                        onChange={(event) =>
                          setProviderForm((current) => ({ ...current, address: event.target.value }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provider-rating">Starting rating (0–5)</Label>
                      <Input
                        id="provider-rating"
                        min={0}
                        max={5}
                        step={0.1}
                        required
                        type="number"
                        value={providerForm.rating}
                        onChange={(event) =>
                          setProviderForm((current) => ({ ...current, rating: event.target.value }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <DialogFooter className="gap-2 border-t border-border/50 pt-4 sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl"
                        disabled={creatingProvider}
                        onClick={() => setCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingProvider} className="h-10 gap-2 rounded-xl">
                        {creatingProvider ? (
                          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Plus className="h-4 w-4" aria-hidden />
                        )}
                        {creatingProvider ? 'Creating…' : 'Create provider'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Accounts"
            value={stats.total.toLocaleString()}
            hint="Vendors and providers on the platform"
            icon={<Building2 />}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <StatTile
            label="Vendor portal"
            value={stats.vendorVerified.toLocaleString()}
            hint={
              stats.vendorPending
                ? `${stats.vendorPending.toLocaleString()} awaiting review`
                : 'All accounts verified'
            }
            icon={<Store />}
            progress={stats.vendorRate}
            active={filter === 'vendor_only'}
            onClick={() => setFilter('vendor_only')}
          />
          <StatTile
            label="Provider portal"
            value={stats.servicesVerified.toLocaleString()}
            hint={
              stats.servicesPending
                ? `${stats.servicesPending.toLocaleString()} awaiting review`
                : 'All accounts verified'
            }
            icon={<ShieldCheck />}
            progress={stats.servicesRate}
            active={filter === 'provider_only'}
            onClick={() => setFilter('provider_only')}
          />
          <StatTile
            label="Catalog"
            value={stats.listedProducts.toLocaleString()}
            hint={`Mean rating ${stats.avgRating.toFixed(1)} · listed products`}
            icon={<Package />}
          />
        </div>

        <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-black/3 dark:ring-white/4">
          <div className="flex flex-col gap-4 border-b border-border/50 bg-muted/15 p-4 md:flex-row md:items-center md:p-5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="vendors-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, phone, or address…"
                className="h-11 rounded-xl border-border/70 bg-background/80 pl-10 shadow-sm"
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as AccountFilter)}>
              <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="h-11 w-max min-w-full justify-start rounded-xl bg-background/70 p-1 shadow-sm sm:min-w-0">
                  {ACCOUNT_FILTERS.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="rounded-lg px-3.5 text-xs font-medium data-[state=active]:shadow-sm sm:text-sm"
                    >
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3 md:px-5">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">Account directory</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {total === 0
                  ? 'No accounts match the current filters'
                  : `${rangeFrom.toLocaleString()}–${rangeTo.toLocaleString()} of ${total.toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[4.5rem] rounded-lg border-border/80 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="mx-4 mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive md:mx-5"
            >
              {error}
            </div>
          ) : null}

          <div className="relative max-h-[min(68vh,760px)] overflow-auto">
            {tableLoading ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/45 pt-24 backdrop-blur-[1px]"
                aria-hidden
              >
                <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : null}

            <Table className={cn('min-w-[1080px]', tableLoading && 'opacity-50')}>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 border-border/70 bg-card/95 hover:bg-card/95">
                  <TableHead className="w-[34%] pl-5 font-semibold text-muted-foreground">Account</TableHead>
                  <TableHead className="w-[22%] font-semibold text-muted-foreground">Contact</TableHead>
                  <TableHead className="w-[12%] font-semibold text-muted-foreground">Activity</TableHead>
                  <TableHead className="w-[22%] font-semibold text-muted-foreground">Portal access</TableHead>
                  <TableHead className="w-[10%] pr-5 text-right font-semibold text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-72 text-center align-middle">
                      <div className="mx-auto flex max-w-sm flex-col items-center px-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm ring-4 ring-muted/40">
                          <Store className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-foreground">No accounts match</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Try another filter, clear search, or add a new service provider.
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => {
                              setFilter('all');
                              setQuery('');
                              setPage(1);
                            }}
                          >
                            Reset filters
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-2 rounded-xl"
                            onClick={() => setCreateDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                            Add provider
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((vendor) => {
                    const busy = verifyingIds.has(vendor.id);
                    const joined = formatJoined(vendor.createdAt);
                    const offerings = vendor.serviceOfferings?.slice(0, 2) ?? [];
                    const extraOfferings = Math.max(0, (vendor.serviceOfferings?.length ?? 0) - offerings.length);

                    return (
                      <TableRow key={vendor.id} className="border-border/50 hover:bg-muted/30">
                        <TableCell className="py-4 pl-5 align-middle">
                          <div className="flex min-w-0 gap-3.5">
                            <AccountAvatar vendor={vendor} />
                            <div className="min-w-0 space-y-1">
                              <Link
                                href={`/admin/vendors/${vendor.id}`}
                                className="block truncate text-[15px] font-semibold tracking-tight text-foreground hover:text-primary"
                                title={vendor.name}
                              >
                                {vendor.name}
                              </Link>
                              {vendor.address ? (
                                <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                  <span className="truncate">{vendor.address}</span>
                                </p>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {joined ? (
                                  <span className="text-[11px] text-muted-foreground">Joined {joined}</span>
                                ) : null}
                                {offerings.map((offering) => (
                                  <Badge
                                    key={offering}
                                    variant="secondary"
                                    className="h-5 rounded-md px-1.5 text-[10px] font-medium"
                                  >
                                    {offering}
                                  </Badge>
                                ))}
                                {extraOfferings > 0 ? (
                                  <span className="text-[11px] text-muted-foreground">+{extraOfferings}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          <div className="min-w-0 space-y-1">
                            <p className="flex items-center gap-1.5 truncate text-sm text-foreground" title={vendor.email}>
                              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">{vendor.email || '—'}</span>
                            </p>
                            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground" title={vendor.phone}>
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate tabular-nums">{vendor.phone || '—'}</span>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {vendor.totalProducts.toLocaleString()}
                            <span className="ml-1 text-xs font-medium text-muted-foreground">products</span>
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums text-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400/90 text-amber-500" />
                            {Number(vendor.rating || 0).toFixed(1)}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 align-middle">
                          <div className="max-w-[240px] space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground">Vendor</p>
                                <p
                                  className={cn(
                                    'text-[11px]',
                                    vendor.vendorVerified
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  {vendor.vendorVerified ? 'Live on /vendor' : 'Awaiting review'}
                                </p>
                              </div>
                              <Switch
                                checked={vendor.vendorVerified}
                                disabled={busy}
                                onCheckedChange={(checked) => void setVendorVerification(vendor.id, Boolean(checked))}
                                aria-label={`Toggle vendor portal for ${vendor.name}`}
                              />
                            </div>
                            <div className="h-px bg-border/70" />
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground">Provider</p>
                                <p
                                  className={cn(
                                    'text-[11px]',
                                    vendor.servicesVerified
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  {vendor.servicesVerified ? 'Live on /services' : 'Awaiting review'}
                                </p>
                              </div>
                              <Switch
                                checked={vendor.servicesVerified}
                                disabled={busy}
                                onCheckedChange={(checked) =>
                                  void setServiceProviderVerification(vendor.id, Boolean(checked))
                                }
                                aria-label={`Toggle provider portal for ${vendor.name}`}
                              />
                            </div>
                            {busy ? (
                              <p className="text-[11px] text-muted-foreground">Saving…</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 pr-5 text-right align-middle">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-9 rounded-xl px-3 text-xs font-semibold" asChild>
                              <Link href={`/admin/vendors/${vendor.id}`}>
                                Open
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 rounded-xl"
                                  aria-label={`More actions for ${vendor.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => void copyToClipboard('Account ID', vendor.id)}>
                                  <Copy className="h-4 w-4" />
                                  Copy ID
                                </DropdownMenuItem>
                                {vendor.email ? (
                                  <DropdownMenuItem onClick={() => void copyToClipboard('Email', vendor.email)}>
                                    <Mail className="h-4 w-4" />
                                    Copy email
                                  </DropdownMenuItem>
                                ) : null}
                                {vendor.phone ? (
                                  <DropdownMenuItem onClick={() => void copyToClipboard('Phone', vendor.phone)}>
                                    <Phone className="h-4 w-4" />
                                    Copy phone
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/vendors/${vendor.id}`}>
                                    <ArrowUpRight className="h-4 w-4" />
                                    Open workspace
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{' '}
              <span className="font-semibold text-foreground">{totalPages}</span>
              {total > 0 ? <span> · {total.toLocaleString()} matching</span> : null}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl"
                disabled={page <= 1 || tableLoading || refreshing}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl"
                disabled={page >= totalPages || tableLoading || refreshing}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
