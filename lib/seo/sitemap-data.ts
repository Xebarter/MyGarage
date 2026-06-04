import { listProducts } from '@/lib/supabase/products-repo';
import { userServiceCategories } from '@/lib/services-catalog';

import { STATIC_PAGE_SEO } from '@/lib/seo/metadata';
import { getSiteUrl } from '@/lib/seo/site';

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
};

export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const base = getSiteUrl();
  const entries: SitemapEntry[] = [];

  const staticPaths: { path: string; priority: number; changeFrequency: SitemapEntry['changeFrequency'] }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact-us', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/buyer/services', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/terms-and-conditions', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/privacy-policy', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/refund-policy', priority: 0.5, changeFrequency: 'yearly' },
  ];

  for (const item of staticPaths) {
    if (STATIC_PAGE_SEO[item.path]?.index === false) continue;
    entries.push({
      url: `${base}${item.path}`,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
      lastModified: new Date(),
    });
  }

  let products: Awaited<ReturnType<typeof listProducts>> = [];
  try {
    products = await listProducts();
  } catch {
    products = [];
  }

  const published = products.filter((p) => p.published !== false);
  const categories = new Set<string>();

  for (const product of published) {
    entries.push({
      url: `${base}/products/${product.id}`,
      lastModified: product.updatedAt ?? product.createdAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    if (product.category?.trim()) {
      categories.add(product.category.trim());
    }
  }

  for (const category of categories) {
    entries.push({
      url: `${base}/category/products/${encodeURIComponent(category)}`,
      changeFrequency: 'weekly',
      priority: 0.75,
      lastModified: new Date(),
    });
  }

  for (const serviceCategory of userServiceCategories) {
    entries.push({
      url: `${base}/category/services/${encodeURIComponent(serviceCategory.title)}`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: new Date(),
    });
  }

  return entries;
}
