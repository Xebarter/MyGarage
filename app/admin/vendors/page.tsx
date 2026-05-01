'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Vendor } from '@/lib/db';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

const initialProviderForm: ProviderFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  rating: '4.5',
};

type AccountFilter = 'all' | 'vendor_only' | 'provider_only' | 'needs_verification';

function accountInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function VendorsLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="h-36 rounded-2xl border border-border/60 bg-muted/30" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border/50 bg-muted/25" />
        ))}
      </div>
      <div className="h-32 rounded-xl border border-border/50 bg-muted/20" />
      <div className="h-96 rounded-xl border border-border/50 bg-muted/20" />
    </div>
  );
}

export default function VendorsPage() {
  const { toast } = useToast();
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
        if (data.stats) {
          setDirectoryStats(data.stats);
        }
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
      toast({ title: 'Refresh failed', description: 'Could not reload the directory.' });
    } finally {
      setRefreshing(false);
    }
  }

  async function copyToClipboard(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied', description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: 'Copy failed', description: 'Your browser blocked clipboard access.' });
    }
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
      setVendors((current) => current.map((v) => (v.id === updated.id ? updated : v)));
      toast({
        title: nextVerified ? 'Vendor verified' : 'Vendor unverified',
        description: updated.name,
      });
    } catch (e) {
      console.error('Failed to verify vendor:', e);
      const msg = e instanceof Error ? e.message : 'Failed to update vendor verification.';
      setError(msg);
      toast({ title: 'Update failed', description: msg });
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
      setVendors((current) => current.map((v) => (v.id === updated.id ? updated : v)));
      toast({
        title: nextVerified ? 'Provider verified' : 'Provider unverified',
        description: updated.name,
      });
    } catch (e) {
      console.error('Failed to verify service provider:', e);
      const msg = e instanceof Error ? e.message : 'Failed to update service-provider verification.';
      setError(msg);
      toast({ title: 'Update failed', description: msg });
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
    setError(null);
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
      toast({ title: 'Provider created', description: 'Profile created successfully.' });
    } catch (e) {
      console.error('Failed to create service provider:', e);
      const msg = e instanceof Error ? e.message : 'Failed to create service provider.';
      setError(msg);
      toast({ title: 'Create failed', description: msg });
    } finally {
      setCreatingProvider(false);
    }
  }

  const stats = useMemo(() => {
    const s = directoryStats;
    return {
      ...s,
      vendorPending: Math.max(0, s.total - s.vendorVerified),
      servicesPending: Math.max(0, s.total - s.servicesVerified),
    };
  }, [directoryStats]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  if (loading) {
    return <VendorsLoadingSkeleton />;
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
              <Truck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Admin
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Vendors &amp; providers
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Manage vendor and service-provider access. Portals stay inactive until you verify them from this
                directory.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border/80 bg-background/80"
              disabled={refreshing || tableLoading}
              onClick={() => void refetchDirectory()}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              Refresh
            </Button>
            <Dialog
              open={createDialogOpen}
              onOpenChange={(open) => {
                if (!open && !creatingProvider) {
                  setProviderForm(initialProviderForm);
                }
                setCreateDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" size="sm" className="gap-2 shadow-sm">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add provider
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create service provider</DialogTitle>
                  <DialogDescription>
                    Add a new provider profile. Their `/services` dashboard stays inactive until you verify them.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createServiceProvider} className="space-y-4">
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
                      className="h-10"
                    />
                  </div>
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
                      className="h-10"
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
                      className="h-10"
                    />
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
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider-rating">Rating (0–5)</Label>
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
                      className="h-10"
                    />
                  </div>
                  <Button type="submit" disabled={creatingProvider} className="w-full gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    {creatingProvider ? 'Creating…' : 'Create provider'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/6 p-4 shadow-sm dark:bg-violet-500/10">
          <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
            <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total accounts</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Platform-wide (all accounts)</p>
        </div>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/6 p-4 shadow-sm dark:bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
            <Store className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Vendor portal</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{stats.vendorVerified}</p>
            <Badge variant="outline" className="shrink-0 gap-1 text-[10px] font-medium">
              <Clock3 className="h-3 w-3" aria-hidden />
              {stats.vendorPending} pending
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Verified for `/vendor`</p>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 p-4 shadow-sm dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Provider portal</span>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {stats.servicesVerified}
            </p>
            <Badge variant="outline" className="shrink-0 gap-1 text-[10px] font-medium">
              <Clock3 className="h-3 w-3" aria-hidden />
              {stats.servicesPending} pending
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Verified for `/services`</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/6 p-4 shadow-sm dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <Truck className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Products listed</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {stats.listedProducts}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across all accounts</p>
        </div>
        <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/6 p-4 shadow-sm dark:bg-fuchsia-500/10 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-fuchsia-800 dark:text-fuchsia-300">
            <Star className="h-4 w-4 shrink-0" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average rating</span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {stats.avgRating.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Mean of account ratings</p>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-semibold tracking-tight">Search &amp; filters</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Filters and search run on the server so the directory stays fast with large vendor counts. Search debounces
            as you type.
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
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Account scope</Label>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as AccountFilter)}>
              <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="h-10 w-max min-w-full justify-start bg-muted/60 sm:min-w-0">
                  <TabsTrigger value="all" className="px-3 text-xs sm:text-sm">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="vendor_only" className="px-3 text-xs sm:text-sm">
                    Vendor portal
                  </TabsTrigger>
                  <TabsTrigger value="provider_only" className="px-3 text-xs sm:text-sm">
                    Provider portal
                  </TabsTrigger>
                  <TabsTrigger value="needs_verification" className="px-3 text-xs sm:text-sm">
                    Needs review
                  </TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendors-search" className="text-xs font-medium text-muted-foreground">
              Search directory
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="vendors-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, email, phone, or address…"
                className="h-10 border-border/80 bg-background/80 pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/80 shadow-sm ring-1 ring-black/4 dark:ring-white/6">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">Account directory</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                {total === 0
                  ? 'No accounts match the current filters'
                  : `Rows ${rangeFrom.toLocaleString()}–${rangeTo.toLocaleString()} of ${total.toLocaleString()} matching`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-18 border-border/80 bg-background/80 text-xs">
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
        </CardHeader>
        <CardContent className="relative max-h-[min(62vh,720px)] overflow-auto p-0">
          {tableLoading ? (
            <div
              className="pointer-events-none absolute inset-0 z-1 flex items-start justify-center bg-background/40 pt-24"
              aria-hidden
            >
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          <Table className={cn('min-w-[980px] table-fixed', tableLoading && 'opacity-50')}>
            <TableHeader>
              <TableRow className="sticky top-0 z-10 border-border/70 bg-muted/80 backdrop-blur-md hover:bg-muted/80">
                <TableHead className="w-[30%] pl-4 font-medium text-muted-foreground">Account</TableHead>
                <TableHead className="w-[20%] font-medium text-muted-foreground">Contacts</TableHead>
                <TableHead className="w-[10%] font-medium text-muted-foreground">Products</TableHead>
                <TableHead className="w-[10%] font-medium text-muted-foreground">Rating</TableHead>
                <TableHead className="w-[20%] font-medium text-muted-foreground">Portals</TableHead>
                <TableHead className="w-[10%] pr-4 text-right font-medium text-muted-foreground">Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-52 text-center align-middle">
                    <div className="mx-auto flex max-w-sm flex-col items-center px-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        <Store className="h-6 w-6" />
                      </div>
                      <p className="mt-4 text-base font-semibold text-foreground">No accounts match</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try another filter or clear search. You can also add a new provider from the header.
                      </p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-border/80"
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
                          className="gap-2"
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
                  return (
                    <TableRow key={vendor.id} className="border-border/60 transition-colors hover:bg-muted/25">
                      <TableCell className="pl-4 align-top">
                        <div className="flex min-w-0 gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-bold tracking-tight text-primary ring-1 ring-primary/20"
                            aria-hidden
                          >
                            {accountInitials(vendor.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground" title={vendor.name}>
                              {vendor.name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => void copyToClipboard('Account ID', vendor.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/50"
                                aria-label="Copy account id"
                              >
                                <Copy className="h-3 w-3 shrink-0" />
                                <span className="max-w-32 truncate font-mono">{vendor.id}</span>
                              </button>
                              {vendor.vendorVerified ? (
                                <Badge variant="secondary" className="gap-0.5 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Vendor
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-0.5 text-[10px]">
                                  <Clock3 className="h-3 w-3" />
                                  Vendor
                                </Badge>
                              )}
                              {vendor.servicesVerified ? (
                                <Badge variant="secondary" className="gap-0.5 text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Provider
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-0.5 text-[10px]">
                                  <Clock3 className="h-3 w-3" />
                                  Provider
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <p className="truncate text-sm text-foreground" title={vendor.email}>
                          {vendor.email}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={vendor.phone}>
                          {vendor.phone}
                        </p>
                      </TableCell>
                      <TableCell className="align-top text-sm font-medium tabular-nums text-foreground">
                        {vendor.totalProducts}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="gap-0.5 font-medium tabular-nums">
                          <Star className="h-3 w-3" />
                          {vendor.rating.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <div className="grid max-w-[280px] gap-2">
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">Vendor</p>
                              <p className="text-[11px] text-muted-foreground">`/vendor` access</p>
                            </div>
                            <Switch
                              checked={vendor.vendorVerified}
                              disabled={busy}
                              onCheckedChange={(checked) => void setVendorVerification(vendor.id, Boolean(checked))}
                              aria-label="Toggle vendor verification"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">Provider</p>
                              <p className="text-[11px] text-muted-foreground">`/services` access</p>
                            </div>
                            <Switch
                              checked={vendor.servicesVerified}
                              disabled={busy}
                              onCheckedChange={(checked) =>
                                void setServiceProviderVerification(vendor.id, Boolean(checked))
                              }
                              aria-label="Toggle service provider verification"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right align-top">
                        <Button variant="outline" size="sm" className="h-9 gap-1 border-border/80 font-semibold" asChild>
                          <Link href={`/admin/vendors/${vendor.id}`}>
                            Manage
                            <ArrowRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                          </Link>
                        </Button>
                        {busy ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">Saving…</p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
            {total > 0 ? (
              <span className="text-muted-foreground"> · {total.toLocaleString()} total matches</span>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 border-border/80"
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
              className="h-9 border-border/80"
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
  );
}
