'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Vendor } from '@/lib/db';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

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

export default function VendorsPage() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(() => new Set());
  const [creatingProvider, setCreatingProvider] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [providerForm, setProviderForm] = useState<ProviderFormState>(initialProviderForm);
  const [filter, setFilter] = useState<AccountFilter>('all');

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    try {
      setError(null);
      const response = await fetch('/api/vendors');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      setError('Could not load vendors.');
      setVendors([]);
    } finally {
      setLoading(false);
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
      await fetchVendors();
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


  const filteredVendors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return vendors
      .filter((vendor) => {
        if (!normalizedQuery) return true;
        return (
          vendor.name.toLowerCase().includes(normalizedQuery) ||
          vendor.email.toLowerCase().includes(normalizedQuery) ||
          vendor.phone.toLowerCase().includes(normalizedQuery) ||
          vendor.address.toLowerCase().includes(normalizedQuery)
        );
      })
      .filter((vendor) => {
        if (filter === 'all') return true;
        if (filter === 'vendor_only') return vendor.vendorVerified;
        if (filter === 'provider_only') return vendor.servicesVerified;
        if (filter === 'needs_verification') return !vendor.vendorVerified || !vendor.servicesVerified;
        return true;
      });
  }, [query, vendors, filter]);

  const stats = useMemo(() => {
    const total = vendors.length;
    const vendorVerified = vendors.filter((v) => v.vendorVerified).length;
    const servicesVerified = vendors.filter((v) => v.servicesVerified).length;
    const vendorPending = total - vendorVerified;
    const servicesPending = total - servicesVerified;
    const listedProducts = vendors.reduce((sum, vendor) => sum + vendor.totalProducts, 0);
    const avgRating =
      total === 0 ? 0 : vendors.reduce((sum, vendor) => sum + vendor.rating, 0) / total;
    return {
      total,
      vendorVerified,
      servicesVerified,
      vendorPending,
      servicesPending,
      listedProducts,
      avgRating,
    };
  }, [vendors]);

  if (loading) {
    return <div className="p-8">Loading accounts...</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <Card className="border-border/70 bg-linear-to-br from-card to-card/70">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Admin
              </p>
              <CardTitle className="text-2xl md:text-3xl">Accounts</CardTitle>
              <CardDescription>
                Manage vendor and service-provider access. Portals stay inactive until verified.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as AccountFilter)}>
                <TabsList className="h-10">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="vendor_only">Vendor portal</TabsTrigger>
                  <TabsTrigger value="provider_only">Provider portal</TabsTrigger>
                  <TabsTrigger value="needs_verification">Needs review</TabsTrigger>
                </TabsList>
              </Tabs>

              <button
                type="button"
                onClick={() => void fetchVendors()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted/50"
                aria-label="Refresh list"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

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
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add provider
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create service provider</DialogTitle>
                    <DialogDescription>
                      Add a new provider profile. Their `/services` dashboard stays inactive until you verify them.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createServiceProvider} className="space-y-3">
                    <input
                      required
                      type="text"
                      placeholder="Business name"
                      value={providerForm.name}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email"
                      value={providerForm.email}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, email: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      required
                      type="text"
                      placeholder="Phone"
                      value={providerForm.phone}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      required
                      type="text"
                      placeholder="Address"
                      value={providerForm.address}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, address: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      min="0"
                      max="5"
                      step="0.1"
                      required
                      type="number"
                      placeholder="Rating (0-5)"
                      value={providerForm.rating}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, rating: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      disabled={creatingProvider}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Plus className="h-4 w-4" />
                      {creatingProvider ? 'Creating…' : 'Create provider'}
                    </button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card className="gap-3 py-5">
          <CardContent className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total accounts
            </p>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-3 py-5">
          <CardContent className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Vendor portal verified
            </p>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{stats.vendorVerified}</p>
              <Badge variant="outline" className="ml-auto">
                <Clock3 className="h-3 w-3" />
                {stats.vendorPending} pending
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-3 py-5">
          <CardContent className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Provider portal verified
            </p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{stats.servicesVerified}</p>
              <Badge variant="outline" className="ml-auto">
                <Clock3 className="h-3 w-3" />
                {stats.servicesPending} pending
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-3 py-5">
          <CardContent className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Products listed
            </p>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{stats.listedProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-3 py-5">
          <CardContent className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Average rating
            </p>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold tabular-nums">{stats.avgRating.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">Directory</CardTitle>
              <CardDescription>
                Search and verify access to the vendor and provider dashboards.
              </CardDescription>
            </div>
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="text"
                placeholder="Search by name, email, phone, or address…"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </CardHeader>

        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[980px] table-fixed">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/60 backdrop-blur">
              <tr>
                <th className="w-[30%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Account
                </th>
                <th className="w-[20%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contacts
                </th>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Products
                </th>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rating
                </th>
                <th className="w-[20%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Portals
                </th>
                <th className="w-[10%] px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Admin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="text-base font-medium text-foreground">No accounts found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try adjusting filters or your search query.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const busy = verifyingIds.has(vendor.id);
                  return (
                    <tr key={vendor.id} className="transition hover:bg-accent/30">
                      <td className="px-6 py-4 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground" title={vendor.name}>
                            {vendor.name}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void copyToClipboard('Account ID', vendor.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/50"
                              aria-label="Copy account id"
                            >
                              <Copy className="h-3 w-3" />
                              <span className="font-mono">{vendor.id}</span>
                            </button>
                            {vendor.vendorVerified ? (
                              <Badge variant="secondary">
                                <CheckCircle2 className="h-3 w-3" />
                                Vendor verified
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock3 className="h-3 w-3" />
                                Vendor pending
                              </Badge>
                            )}
                            {vendor.servicesVerified ? (
                              <Badge variant="secondary">
                                <CheckCircle2 className="h-3 w-3" />
                                Provider verified
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock3 className="h-3 w-3" />
                                Provider pending
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="truncate text-foreground" title={vendor.email}>
                          {vendor.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground" title={vendor.phone}>
                          {vendor.phone}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground tabular-nums">
                        {vendor.totalProducts}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="outline">
                          <Star className="h-3 w-3" />
                          {vendor.rating.toFixed(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">Vendor</p>
                              <p className="text-[11px] text-muted-foreground">
                                Access to `/vendor`
                              </p>
                            </div>
                            <Switch
                              checked={vendor.vendorVerified}
                              disabled={busy}
                              onCheckedChange={(checked) =>
                                void setVendorVerification(vendor.id, Boolean(checked))
                              }
                              aria-label="Toggle vendor verification"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">Provider</p>
                              <p className="text-[11px] text-muted-foreground">
                                Access to `/services`
                              </p>
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
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                          Manage
                        </Link>
                        {busy ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">Saving…</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
