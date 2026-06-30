'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import { CategoryProductCard } from '@/components/home/category-product-card';
import type { CategoryFeedSection } from '@/lib/home-category-feed';

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function CategoryFeedRow({ section }: { section: CategoryFeedSection }) {
  const products = section.products.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <Link
          href={`/category/products/${encodeURIComponent(section.category)}`}
          className="min-w-0 text-lg font-bold tracking-tight text-foreground transition hover:text-primary"
        >
          {formatCategoryLabel(section.category)}
        </Link>
        <Link
          href={`/category/products/${encodeURIComponent(section.category)}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          All
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 lg:grid-cols-5">
        {products.map((product, index) => (
          <CategoryProductCard
            key={product.id}
            product={product}
            imagePriority={index < 2}
            className={index >= 4 ? 'hidden lg:flex' : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export function CategoryInfiniteFeed({
  initialSections,
  initialHasMore,
  initialNextOffset,
}: {
  initialSections: CategoryFeedSection[];
  initialHasMore: boolean;
  initialNextOffset: number;
}) {
  const [sections, setSections] = useState(initialSections);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/landing/products?offset=${nextOffset}&limit=3&perCategory=5`,
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load more');
      }

      const incoming = Array.isArray(data.sections) ? (data.sections as CategoryFeedSection[]) : [];
      setSections((prev) => {
        const seen = new Set(prev.map((section) => section.category));
        const merged = [...prev];
        for (const section of incoming) {
          if (!seen.has(section.category)) {
            merged.push(section);
            seen.add(section.category);
          }
        }
        return merged;
      });
      setHasMore(Boolean(data.hasMore));
      setNextOffset(typeof data.nextOffset === 'number' ? data.nextOffset : nextOffset);
    } catch (e) {
      console.error('Category feed load more failed:', e);
      setError('Could not load more categories. Scroll to try again.');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, nextOffset]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin: '800px', threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (sections.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-5 py-12 text-center">
        <p className="text-sm font-semibold text-foreground">No category sections yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Products will appear here as vendors list inventory.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <CategoryFeedRow key={section.category} section={section} />
      ))}

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading more categories…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!hasMore && sections.length > 0 ? (
        <p className="pb-2 text-center text-xs text-muted-foreground">End of list</p>
      ) : null}
    </div>
  );
}
