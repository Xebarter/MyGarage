import type { MetadataRoute } from 'next';

import { ALLOW_PATHS, DISALLOW_PATHS, robotsHost } from '@/lib/seo/robots-rules';
import { getSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', ...ALLOW_PATHS],
        disallow: DISALLOW_PATHS,
      },
    ],
    host: robotsHost(),
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
