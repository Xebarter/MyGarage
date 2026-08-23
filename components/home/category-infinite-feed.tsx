'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { CategoryProductCard } from '@/components/home/category-product-card';
import type { Product } from '@/lib/db';
import {
  HOME_FEED_COL_CAPACITY,
  HOME_FEED_MOBILE_COL_CAPACITY,
  buildCategoryFeedPage,
  packCategoryFeedSections,
  type CategoryFeedPackCell,
  type CategoryFeedPackedRow,
} from '@/lib/home-category-feed';
import { cn } from '@/lib/utils';

const FEED_PAGE_SIZE = 3;
const FEED_PER_CATEGORY = 5;

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/** Tailwind col-span classes for product-track packing (mobile 2 / desktop 5). */
const COL_SPAN: Record<2 | 5, Record<number, string>> = {
  2: {
    1: 'col-span-1',
    2: 'col-span-2',
  },
  5: {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
  },
};

const TRACK_COLS: Record<2 | 5, string> = {
  2: 'grid-cols-2',
  5: 'grid-cols-5',
};

function SeeAllButton({
  category,
  narrow,
}: {
  category: string;
  narrow: boolean;
}) {
  return (
    <Link
      href={`/category/products/${encodeURIComponent(category)}`}
      aria-label={`See all ${formatCategoryLabel(category)}`}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
        narrow ? 'w-9 px-0' : 'gap-1.5 px-3.5',
      )}
    >
      {narrow ? null : <span>See all</span>}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function CategoryHeader({
  category,
  narrow = false,
}: {
  category: string;
  narrow?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5 sm:gap-3">
      <Link
        href={`/category/products/${encodeURIComponent(category)}`}
        className={cn(
          'min-w-0 truncate font-extrabold tracking-tight text-foreground transition hover:text-primary',
          narrow ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl',
        )}
      >
        {formatCategoryLabel(category)}
      </Link>
      <SeeAllButton category={category} narrow={narrow} />
    </div>
  );
}

function SoloCategoryRow({
  cell,
  cols,
  imagePriority,
}: {
  cell: CategoryFeedPackCell;
  cols: 2 | 5;
  imagePriority: boolean;
}) {
  const gap = cols === 2 ? 'gap-3' : 'gap-5';

  return (
    <section>
      <CategoryHeader category={cell.section.category} />
      <div className={cn('grid', TRACK_COLS[cols], gap)}>
        {cell.products.map((product, index) => (
          <CategoryProductCard
            key={product.id}
            product={product}
            toneIndex={index}
            imagePriority={imagePriority && index < 2}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Sparse categories sharing one row.
 * Products use a flat N-col track so every card is the same width as a solo strip card.
 */
function SharedCategoryRow({
  row,
  cols,
}: {
  row: CategoryFeedPackedRow;
  cols: 2 | 5;
}) {
  const gap = cols === 2 ? 'gap-3' : 'gap-5';
  const spans = COL_SPAN[cols];

  return (
    <section>
      <div className={cn('mb-3 grid sm:mb-4', TRACK_COLS[cols], gap)}>
        {row.cells.map((cell) => {
          const narrow = cell.colSpan <= Math.max(1, Math.floor(cols / 2));
          return (
            <div
              key={cell.section.category}
              className={cn('min-w-0', spans[cell.colSpan] ?? 'col-span-1')}
            >
              <CategoryHeader category={cell.section.category} narrow={narrow || cols === 2} />
            </div>
          );
        })}
      </div>

      <div className={cn('grid', TRACK_COLS[cols], gap)}>
        {row.cells.flatMap((cell, cellIndex) =>
          cell.products.map((product, index) => {
            const toneIndex =
              row.cells.slice(0, cellIndex).reduce((sum, c) => sum + c.products.length, 0) + index;
            return (
              <CategoryProductCard
                key={`${cell.section.category}-${product.id}`}
                product={product}
                toneIndex={toneIndex}
                imagePriority={cellIndex === 0 && index < 2}
              />
            );
          }),
        )}
      </div>
    </section>
  );
}

function PackedCategoryRow({
  row,
  cols,
}: {
  row: CategoryFeedPackedRow;
  cols: 2 | 5;
}) {
  if (row.cells.length === 1) {
    return <SoloCategoryRow cell={row.cells[0]!} cols={cols} imagePriority />;
  }
  return <SharedCategoryRow row={row} cols={cols} />;
}

export function CategoryInfiniteFeed({ products }: { products: Product[] }) {
  const [visibleLimit, setVisibleLimit] = useState(FEED_PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const page = useMemo(
    () =>
      buildCategoryFeedPage(products, {
        offset: 0,
        limit: visibleLimit,
        perCategory: FEED_PER_CATEGORY,
      }),
    [products, visibleLimit],
  );
  const { sections, hasMore } = page;

  const mobileRows = useMemo(
    () => packCategoryFeedSections(sections, HOME_FEED_MOBILE_COL_CAPACITY),
    [sections],
  );
  const desktopRows = useMemo(
    () => packCategoryFeedSections(sections, HOME_FEED_COL_CAPACITY),
    [sections],
  );

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    setVisibleLimit((current) => current + FEED_PAGE_SIZE);
  }, [hasMore]);

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
      <section className="px-4 py-12 text-center">
        <p className="text-sm font-semibold text-foreground">No category sections yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Products will appear here as vendors list inventory.</p>
      </section>
    );
  }

  return (
    <div>
      {/* Phones / small tablets: pack into 2-card rows */}
      <div className="space-y-10 md:space-y-12 lg:hidden">
        {mobileRows.map((row) => (
          <PackedCategoryRow key={`m-${row.key}`} row={row} cols={2} />
        ))}
      </div>

      {/* Large screens: pack into 5-card rows */}
      <div className="hidden space-y-10 md:space-y-12 lg:block">
        {desktopRows.map((row) => (
          <PackedCategoryRow key={`d-${row.key}`} row={row} cols={5} />
        ))}
      </div>

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

      {!hasMore && sections.length > 0 ? (
        <p className="pb-2 text-center text-xs text-muted-foreground">End of list</p>
      ) : null}
    </div>
  );
}
