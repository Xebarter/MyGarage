'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

import { CategoryProductCard } from '@/components/home/category-product-card';
import type { CategoryFeedGroup, CategoryFeedSection } from '@/lib/home-category-feed';
import { groupCategorySections } from '@/lib/home-category-feed';
import { formatCategoryLabel } from '@/lib/home-product-display';

function CategoryProductRow({
  section,
  compact = false,
}: {
  section: CategoryFeedSection;
  compact?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const useHorizontalScroll = section.products.length > 3;

  const scroll = (direction: 'left' | 'right') => {
    const row = rowRef.current;
    if (!row) return;
    const distance = Math.max(240, Math.floor(row.clientWidth * 0.8));
    row.scrollBy({ left: direction === 'right' ? distance : -distance, behavior: 'smooth' });
  };

  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Link
          href={`/category/products/${encodeURIComponent(section.category)}`}
          className="truncate text-sm font-bold text-foreground transition hover:text-primary sm:text-base"
        >
          {formatCategoryLabel(section.category)}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={`/category/products/${encodeURIComponent(section.category)}`}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {useHorizontalScroll ? (
            <>
              <button
                type="button"
                onClick={() => scroll('left')}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background transition hover:bg-muted"
                aria-label={`Scroll ${section.category} left`}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background transition hover:bg-muted"
                aria-label={`Scroll ${section.category} right`}
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {useHorizontalScroll ? (
        <div
          ref={rowRef}
          className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin] sm:gap-3"
        >
          {section.products.map((product, index) => (
            <CategoryProductCard
              key={product.id}
              product={product}
              imagePriority={index < 2}
              compact={compact}
              className="w-[9.5rem] shrink-0 sm:w-[10.5rem]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {section.products.map((product, index) => (
            <CategoryProductCard key={product.id} product={product} imagePriority={index < 2} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryFeedGroupBlock({ group }: { group: CategoryFeedGroup }) {
  const isPaired = group.sections.length > 1;

  if (!isPaired) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
        <CategoryProductRow section={group.sections[0]!} />
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
      {group.sections.map((section) => (
        <div key={section.category} className="rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
          <CategoryProductRow section={section} compact />
        </div>
      ))}
    </div>
  );
}

export function SmartCategoryFeed({ sections }: { sections: CategoryFeedSection[] }) {
  const groups = useMemo(() => groupCategorySections(sections), [sections]);

  if (sections.length === 0) return null;

  return (
    <section aria-label="Shop by category" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Shop by category</h2>
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <CategoryFeedGroupBlock key={group.sections.map((s) => s.category).join('|')} group={group} />
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

  const incrementalSections = useMemo(() => {
    const initialKeys = new Set(initialSections.map((s) => s.category));
    return sections.filter((s) => !initialKeys.has(s.category));
  }, [sections, initialSections]);

  const incrementalGroups = useMemo(
    () => groupCategorySections(incrementalSections),
    [incrementalSections],
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/landing/products?offset=${nextOffset}&limit=3&perCategory=5`);
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
      setError('Could not load more products.');
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
      <section className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No products available</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <SmartCategoryFeed sections={initialSections} />

      {incrementalSections.length > 0 ? (
        <section aria-label="Discover more products" className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Discover more</h2>
          <div className="space-y-3">
            {incrementalGroups.map((group) => (
              <CategoryFeedGroupBlock key={group.sections.map((s) => s.category).join('|')} group={group} />
            ))}
          </div>
        </section>
      ) : null}

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        </div>
      ) : null}

      {!hasMore && sections.length > 0 ? (
        <p className="pb-2 text-center text-xs text-muted-foreground">You have reached the end</p>
      ) : null}
    </div>
  );
}
