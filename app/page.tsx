import { Suspense } from 'react';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { HomePageClient } from '@/components/home-page-client';
import { loadHomeInitialProducts, loadHomePromoBanners } from '@/lib/home-initial-data';
import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';

/** Fresh-enough storefront HTML without paying full dynamic TTFB on every request */
export const revalidate = 120;

export const metadata = buildPageMetadata(STATIC_PAGE_SEO['/']);

export default async function Home() {
  const [initialProducts, initialPromoBanners] = await Promise.all([
    loadHomeInitialProducts(300),
    loadHomePromoBanners(),
  ]);

  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="flex min-h-[45vh] flex-col items-center justify-center gap-3 bg-background px-2 sm:px-2.5 md:px-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
            <p className="text-sm font-medium text-foreground">Loading storefront…</p>
            <p className="text-xs text-muted-foreground">Preparing products and recommendations.</p>
          </main>
          <Footer />
        </>
      }
    >
      <HomePageClient initialProducts={initialProducts} initialPromoBanners={initialPromoBanners} />
    </Suspense>
  );
}
