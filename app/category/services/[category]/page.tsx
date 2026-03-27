'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { userServiceCategories } from '@/lib/services-catalog';

export default function ServiceCategoryPage() {
  const params = useParams<{ category: string }>();
  const rawCategory = typeof params?.category === 'string' ? params.category : '';
  const categoryTitle = useMemo(() => decodeURIComponent(rawCategory), [rawCategory]);

  const category = useMemo(
    () => userServiceCategories.find((c) => c.title.toLowerCase() === categoryTitle.trim().toLowerCase()) ?? null,
    [categoryTitle]
  );

  return (
    <div className="min-h-screen bg-background">
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
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Request a service
            </Link>
            <Link
              href="/buyer/services"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              Browse services
            </Link>
          </div>
        </div>

        {!category ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-card p-6">
            <p className="text-sm text-muted-foreground">No service category found with that name.</p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border/70 bg-card p-6">
            <p className="text-sm font-semibold text-foreground">Services in this category</p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {category.services.map((service) => (
                <li key={service} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">
                  {service}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

