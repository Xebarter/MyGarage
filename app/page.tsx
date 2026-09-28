import { Suspense } from 'react';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { HomePageClient } from '@/components/home-page-client';
import { loadHomeInitialProducts, loadHomePromoBanners } from '@/lib/home-initial-data';
import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';

/** Fresh-enough storefront HTML without paying full dynamic TTFB on every request */
export const revalidate = 120;

export const metadata = buildPageMetadata(STATIC_PAGE_SEO['/']);

function HomeShellFallback() {
  return (
    <>
      <Header />
      <main className="flex min-h-[45vh] flex-col items-center justify-center gap-3 bg-[#F2F4F8] px-3 text-center sm:px-4 md:bg-muted/30 md:px-5">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
        <p className="text-sm font-medium text-foreground">Loading storefront…</p>
        <p className="text-xs text-muted-foreground">Preparing products and recommendations.</p>
      </main>
      <Footer />
    </>
  );
}

async function HomeContent() {
  const [initialProducts, initialPromoBanners] = await Promise.all([
    loadHomeInitialProducts(300),
    loadHomePromoBanners(),
  ]);

  return (
    <HomePageClient initialProducts={initialProducts} initialPromoBanners={initialPromoBanners} />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeShellFallback />}>
      <HomeContent />
    </Suspense>
  );
}
