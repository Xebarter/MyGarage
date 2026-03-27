'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Vendor } from '@/lib/db';
import { Building2, Search, Star, Truck } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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


  const filteredVendors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return vendors.filter((vendor) => {
      if (!normalizedQuery) return true;
      return (
        vendor.name.toLowerCase().includes(normalizedQuery) ||
        vendor.email.toLowerCase().includes(normalizedQuery) ||
        vendor.phone.toLowerCase().includes(normalizedQuery) ||
        vendor.address.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, vendors]);

  if (loading) {
    return <div className="p-8">Loading vendors...</div>;
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vendors</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vendors appear here after they register via the vendor portal.
            </p>
          </div>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active vendors</p>
          <div className="mt-1 flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">{vendors.length}</p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Products listed</p>
          <div className="mt-1 flex items-center gap-1">
            <Truck className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              {vendors.reduce((sum, vendor) => sum + vendor.totalProducts, 0)}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Average rating</p>
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3 w-3 text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              {vendors.length === 0
                ? '0.0'
                : (vendors.reduce((sum, vendor) => sum + vendor.rating, 0) / vendors.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div>
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="text"
                placeholder="Search vendors by name, email, phone, or address..."
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <table className="w-full table-fixed">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendor</th>
                <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacts</th>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Products</th>
                <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating</th>
                <th className="w-[20%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <p className="text-base font-medium text-foreground">No vendors found</p>
                    <p className="mt-1 text-sm text-muted-foreground">Try changing the search query.</p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="transition hover:bg-accent/30">
                    <td className="px-4 py-4 text-sm">
                      <p className="truncate font-medium text-foreground" title={vendor.name}>{vendor.name}</p>
                      <p className="truncate text-xs text-muted-foreground" title={vendor.address}>{vendor.address}</p>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <p className="truncate text-foreground" title={vendor.email}>{vendor.email}</p>
                      <p className="truncate text-xs text-muted-foreground" title={vendor.phone}>{vendor.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-foreground">{vendor.totalProducts}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Star className="h-3 w-3" />
                        {vendor.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Link
                        href={`/admin/vendors/${vendor.id}`}
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
    </div>
  );
}
