import type { Metadata } from 'next';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { categoryServicesJsonLd } from '@/lib/seo/json-ld';

type Props = {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: raw } = await params;
  const categoryTitle = decodeURIComponent(raw).trim() || 'Services';

  return buildPageMetadata({
    title: `${categoryTitle} — Automotive Services`,
    description: `Book ${categoryTitle} services from verified providers in Uganda. Fast requests, transparent pricing, and reliable support through MyGarage.`,
    path: `/category/services/${encodeURIComponent(categoryTitle)}`,
    keywords: [categoryTitle, 'automotive services Uganda', 'MyGarage services'],
  });
}

export default async function ServiceCategoryLayout({ children, params }: Props) {
  const { category: raw } = await params;
  const categoryTitle = decodeURIComponent(raw).trim();

  return (
    <>
      {categoryTitle ? <JsonLdScript data={categoryServicesJsonLd(categoryTitle)} /> : null}
      {children}
    </>
  );
}
