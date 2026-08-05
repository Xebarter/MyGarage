'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { userServiceCategories } from '@/lib/services-catalog';
import {
  formatServicePriceRangeLabel,
  type ServicePriceRange,
} from '@/lib/format-service-price';

export default function ServiceCategoryPage() {
  const params = useParams<{ category: string }>();
  const rawCategory = typeof params?.category === 'string' ? params.category : '';
  const categoryTitle = useMemo(() => decodeURIComponent(rawCategory), [rawCategory]);

  const category = useMemo(
    () => userServiceCategories.find((c) => c.title.toLowerCase() === categoryTitle.trim().toLowerCase()) ?? null,
    [categoryTitle]
  );

  const [priceRanges, setPriceRanges] = useState<ServicePriceRange[]>([]);
  const [rangesLoading, setRangesLoading] = useState(false);

  useEffect(() => {
    if (!category?.id) {
      setPriceRanges([]);
      return;
    }
    let cancelled = false;
    setRangesLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/services/price-ranges?categoryId=${encodeURIComponent(category.id)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { ranges?: ServicePriceRange[] };
        if (!cancelled) setPriceRanges(Array.isArray(data.ranges) ? data.ranges : []);
      } catch {
        if (!cancelled) setPriceRanges([]);
      } finally {
        if (!cancelled) setRangesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category?.id]);

  const rangeByName = useMemo(
    () => new Map(priceRanges.map((r) => [r.serviceName, r] as const)),
    [priceRanges],
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service category</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {category ? `${category.emoji} ${category.title}` : categoryTitle || 'Category'}
            </h1>
            {category ? <p className="mt-1 text-sm text-muted-foreground">{category.useWhen}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/buyer/services"
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Request a service
            </Link>
            <Link
              href="/buyer/services"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              Browse services
            </Link>
          </div>
        </div>

        {!category ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">No service category found with that name.</p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">Services in this category</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prices are set by MyGarage admin for each service.
                </p>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {category.services.map((service) => {
                const label = rangesLoading
                  ? 'Loading price…'
                  : formatServicePriceRangeLabel(rangeByName.get(service.name));
                return (
                  <li
                    key={service.name}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{service.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                    </div>
                    <Link
                      href={`/buyer/services?sc=${encodeURIComponent(category.id)}&ss=${encodeURIComponent(service.name)}&quick=yes`}
                      className="shrink-0 text-sm font-semibold text-primary hover:underline"
                    >
                      Request
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
