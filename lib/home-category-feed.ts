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
