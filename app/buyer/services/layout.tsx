import type { Metadata } from 'next';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';

export const metadata: Metadata = buildPageMetadata(STATIC_PAGE_SEO['/buyer/services']);

export default function BuyerServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Book services', path: '/buyer/services' },
        ])}
      />
      {children}
    </>
  );
}
