import type { Product } from '@/lib/db';

export type CategoryFeedSection = {
  category: string;
  products: Product[];
};

export type CategoryFeedPage = {
  sections: CategoryFeedSection[];
  hasMore: boolean;
  nextOffset: number;
  totalCategories: number;
};

/** Categories ordered by catalog size, then name. */
export function getOrderedProductCategories(products: Product[]): string[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    const category = product.category?.trim();
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category]) => category);
}

export function buildCategoryFeedPage(
  products: Product[],
  options: { offset?: number; limit?: number; perCategory?: number } = {},
): CategoryFeedPage {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, options.limit ?? 3);
  const perCategory = Math.max(1, options.perCategory ?? 5);

  const categories = getOrderedProductCategories(products);
  const slice = categories.slice(offset, offset + limit);

  const sections: CategoryFeedSection[] = [];
  for (const category of slice) {
    const categoryProducts = products
      .filter((product) => product.category?.trim() === category)
      .slice(0, perCategory);
    if (categoryProducts.length > 0) {
      sections.push({ category, products: categoryProducts });
    }
  }

  const nextOffset = offset + limit;
  return {
    sections,
    hasMore: nextOffset < categories.length,
    nextOffset,
    totalCategories: categories.length,
  };
}

export function pickFeaturedProducts(products: Product[], limit = 60): Product[] {
  const featured = products.filter((product) => product.featured);
  if (featured.length > 0) return featured.slice(0, limit);
  return products.slice(0, limit);
}

/** Desktop product-column capacity for home category strips. */
export const HOME_FEED_COL_CAPACITY = 5;

/** Phone / small tablet: at most two product cards per row. */
export const HOME_FEED_MOBILE_COL_CAPACITY = 2;

export type CategoryFeedPackCell = {
  section: CategoryFeedSection;
  /** Products shown (up to HOME_FEED_COL_CAPACITY from the feed). */
  products: Product[];
  /** Grid columns this cell occupies on the packed track. */
  colSpan: number;
};

export type CategoryFeedPackedRow = {
  /** Stable key for the packed row. */
  key: string;
  cells: CategoryFeedPackCell[];
};

/**
 * First-fit pack sparse category sections into shared rows.
 * Categories with product count ≥ capacity get a solo multi-row strip (all listed products kept).
 * Smaller categories share a row until product slots fill capacity.
 */
export function packCategoryFeedSections(
  sections: CategoryFeedSection[],
  capacity: number = HOME_FEED_COL_CAPACITY,
): CategoryFeedPackedRow[] {
  const cap = Math.max(1, capacity);
  const maxProducts = HOME_FEED_COL_CAPACITY;
  const rows: CategoryFeedPackedRow[] = [];
  let open: CategoryFeedPackCell[] = [];
  let used = 0;

  const flush = () => {
    if (open.length === 0) return;
    rows.push({
      key: open.map((c) => c.section.category).join('|'),
      cells: open,
    });
    open = [];
    used = 0;
  };

  for (const section of sections) {
    // Keep full feed slice (up to 5); capacity only controls packing, not list length.
    const products = section.products.slice(0, maxProducts);
    if (products.length === 0) continue;

    // Enough products to fill (or exceed) the row track → exclusive strip.
    if (products.length >= cap) {
      flush();
      rows.push({
        key: section.category,
        cells: [{ section, products, colSpan: cap }],
      });
      continue;
    }

    const n = products.length;
    if (used + n > cap) {
      flush();
    }
    open.push({ section, products, colSpan: n });
    used += n;
  }

  flush();
  return rows;
}
