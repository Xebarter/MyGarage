'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Vendor } from '@/lib/db';
import { Building2, Plus, Search, Star, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type ProviderFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: string;
};

const initialForm: ProviderFormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  rating: '4.5',
};

export default function ServiceProvidersPage() {
  const [providers, setProviders] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [creatingProvider, setCreatingProvider] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<ProviderFormState>(initialForm);

  useEffect(() => {
    fetchProviders();
  }, []);

  async function fetchProviders() {
    try {
      setError(null);
      const response = await fetch('/api/vendors');
      if (!response.ok) throw new Error('Failed to fetch service providers');
      const data = await response.json();
      setProviders(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Failed to fetch service providers:', fetchError);
      setError('Could not load service providers.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }

  async function createProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingProvider) return;

    setCreatingProvider(true);
    try {
      const payload = {
        ...form,
        rating: Number(form.rating),
        totalProducts: 0,
      };
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create service provider');
      }

      setForm(initialForm);
      setCreateDialogOpen(false);
      await fetchProviders();
    } catch (createError) {
      console.error('Failed to create service provider:', createError);
      alert('Failed to create service provider. Please check the details and try again.');
    } finally {
      setCreatingProvider(false);
    }
  }

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return providers.filter((provider) => {
      if (!normalizedQuery) return true;
      return (
        provider.name.toLowerCase().includes(normalizedQuery) ||
        provider.email.toLowerCase().includes(normalizedQuery) ||
        provider.phone.toLowerCase().includes(normalizedQuery) ||
        provider.address.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, providers]);

  if (loading) {
    return <div className="p-8">Loading service providers...</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Service Providers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and manage service providers, then jump into their services workspace for orders, customers, promotions, and profile settings.
            </p>
          </div>
          <Dialog
            open={createDialogOpen}
            onOpenChange={(open) => {
              if (!open && !creatingProvider) {
                setForm(initialForm);
              }
              setCreateDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Add Service Provider
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Service Provider</DialogTitle>
                <DialogDescription>
                  Add a new service provider to unlock service management, service orders, promotions, customer insights, and profile settings.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createProvider} className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder="Business name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  required
                  type="text"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  required
                  type="text"
                  placeholder="Address"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  min="0"
                  max="5"
                  step="0.1"
                  required
                  type="number"
                  placeholder="Rating (0-5)"
                  value={form.rating}
                  onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={creatingProvider}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  {creatingProvider ? 'Creating...' : 'Create Service Provider'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active providers</p>
          <div className="mt-1 flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{providers.length}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Services listed</p>
          <div className="mt-1 flex items-center gap-1">
            <Wrench className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              {providers.reduce((sum, provider) => sum + provider.totalProducts, 0)}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average rating</p>
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              {providers.length === 0 ? '0.0' : (providers.reduce((sum, provider) => sum + provider.rating, 0) / providers.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="text"
              placeholder="Search service providers by name, email, phone, or address..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <table className="w-full table-fixed">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="w-[28%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Provider</th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacts</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Services</th>
              <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</th>
              <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredProviders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <p className="text-base font-medium text-foreground">No service providers found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try changing the search query.</p>
                </td>
              </tr>
            ) : (
              filteredProviders.map((provider) => (
                <tr key={provider.id} className="transition hover:bg-accent/30">
                  <td className="px-4 py-4 text-sm">
                    <p className="truncate font-medium text-foreground" title={provider.name}>{provider.name}</p>
                    <p className="truncate text-xs text-muted-foreground" title={provider.address}>{provider.address}</p>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <p className="truncate text-foreground" title={provider.email}>{provider.email}</p>
                    <p className="truncate text-xs text-muted-foreground" title={provider.phone}>{provider.phone}</p>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-foreground">{provider.totalProducts}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Star className="h-3 w-3" />
                      {provider.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <Link
                      href={`/admin/vendors/${provider.id}`}
                      className="inline-flex rounded-md border border-border px-2.5 py-1.5 text-primary transition hover:bg-primary/10"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
