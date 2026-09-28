import type { SeoLandingPage } from '@/lib/seo/landing/types';
import { buildPageMetadata } from '@/lib/seo/metadata';

export function metadataFromLanding(page: SeoLandingPage) {
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: page.keywords,
    type: page.kind === 'academy' ? 'article' : 'website',
  });
}
