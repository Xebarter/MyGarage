import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { buildPageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPageMetadata({
  title: 'Page not found',
  description: 'The page you are looking for does not exist on MyGarage.',
  index: false,
});

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">404</p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The link may be broken or the page may have been removed. Browse parts or return home.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Back to shop
          </Link>
          <Link
            href="/contact-us"
            className="inline-flex rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Contact support
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
