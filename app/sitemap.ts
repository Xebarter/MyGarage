import type { MetadataRoute } from 'next';

import { collectSitemapEntries } from '@/lib/seo/sitemap-data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await collectSitemapEntries();

  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
