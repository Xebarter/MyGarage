'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/db';

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

export default function ProductCategoryPage() {
  const params = useParams<{ category: string }>();
  const rawCategory = typeof params?.category === 'string' ? params.category : '';
  const categoryName = useMemo(() => decodeURIComponent(rawCategory), [rawCategory]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch('/api/feed?limit=300&forceRefresh=1');
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to fetch products');
        if (cancelled) return;
        setProducts(Array.isArray(data) ? (data as Product[]) : []);
      } catch (e) {
        console.error('Failed to fetch category products:', e);
        if (cancelled) return;
        setProducts([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = normalizeCategory(categoryName);
    if (!needle) return [];
    return products.filter((p) => normalizeCategory(p.category || '') === needle);
  }, [categoryName, products]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product category</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{categoryName || 'Category'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${filtered.length} item${filtered.length === 1 ? '' : 's'} found`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              Back to home
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-card p-6">
            <p className="text-sm text-muted-foreground">Loading products for this category…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border/70 bg-card p-6">
            <p className="text-sm text-muted-foreground">No products found in this category.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tip: categories must match exactly (e.g. “Tyres & Battery”).
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

