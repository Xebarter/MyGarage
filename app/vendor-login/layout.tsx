import type { Metadata } from 'next';

import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPageMetadata(STATIC_PAGE_SEO['/vendor-login']);

export default function VendorLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
