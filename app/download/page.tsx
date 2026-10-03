import type { Metadata } from 'next';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { PublicAppDownload } from '@/components/public-app-download';
import { JsonLdScript } from '@/components/seo/json-ld-script';
import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';

export const metadata: Metadata = buildPageMetadata(STATIC_PAGE_SEO['/download']);

export default function DownloadPage() {
  return (
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Get the app', path: '/download' },
        ])}
      />
      <Header />
      <main className="bg-background">
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="mb-8">
            <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Android app
            </p>
            <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Get the MyGarage app</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Download the public MyGarage app for Android. Supplier and service provider apps are shared inside those
              dashboards after an account is verified.
            </p>
          </div>
          <PublicAppDownload />
        </section>
      </main>
      <Footer />
    </>
  );
}
