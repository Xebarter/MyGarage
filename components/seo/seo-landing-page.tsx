import Link from 'next/link';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { JsonLdScript } from '@/components/seo/json-ld-script';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { landingPageJsonLd } from '@/lib/seo/json-ld';
import type { SeoLandingPage } from '@/lib/seo/landing/types';

function kindLabel(kind: SeoLandingPage['kind']): string {
  switch (kind) {
    case 'pillar':
      return 'Service';
    case 'brand':
      return 'Brand';
    case 'model':
      return 'Model';
    case 'part':
      return 'Part';
    case 'location':
      return 'Location';
    case 'academy':
      return 'Academy';
    default:
      return 'Directory';
  }
}

export function SeoLandingView({ page }: { page: SeoLandingPage }) {
  const related = page.related;
  const showRelatedAsGrid = page.kind === 'hub' || related.length > 10;

  return (
    <>
      <JsonLdScript data={landingPageJsonLd(page)} />
      <Header />
      <main className="bg-background">
        <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              {page.breadcrumbs.map((crumb, index) => {
                const last = index === page.breadcrumbs.length - 1;
                return (
                  <BreadcrumbItem key={crumb.href}>
                    {index > 0 ? <BreadcrumbSeparator /> : null}
                    {last ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>

          <header className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
            <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {kindLabel(page.kind)}
            </p>
            <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">{page.h1}</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">{page.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {page.ctas.map((cta) => (
                <Link
                  key={`${cta.href}-${cta.label}`}
                  href={cta.href}
                  className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          </header>

          <div className="space-y-5">
            {page.sections.map((section) => (
              <section key={section.heading} className="rounded-xl border border-border bg-card p-5 md:p-6">
                <h2 className="mb-3 text-lg font-semibold text-foreground">{section.heading}</h2>
                <p className="text-sm leading-7 text-muted-foreground md:text-base">{section.body}</p>
              </section>
            ))}
          </div>

          {page.faqs.length > 0 ? (
            <section className="mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Questions people ask</h2>
              <dl className="space-y-5">
                {page.faqs.map((faq) => (
                  <div key={faq.question}>
                    <dt className="text-sm font-semibold text-foreground">{faq.question}</dt>
                    <dd className="mt-1.5 text-sm leading-7 text-muted-foreground">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {related.length > 0 ? (
            <nav aria-labelledby="related-heading" className="mt-8 rounded-xl border border-border bg-card p-5 md:p-6">
              <h2 id="related-heading" className="mb-4 text-lg font-semibold text-foreground">
                {page.kind === 'hub' ? 'Pages in this section' : 'Related on MyGarage'}
              </h2>
              <ul
                className={
                  showRelatedAsGrid
                    ? 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3'
                    : 'flex flex-col gap-2'
                }
              >
                {related.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <Link href={item.href} className="text-sm font-medium text-primary hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </article>
      </main>
      <Footer />
    </>
  );
}
