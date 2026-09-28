import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { getBrandPage, SEO_BRANDS } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_BRANDS.map((brand) => ({ brand: brand.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const page = getBrandPage(brand);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  return metadataFromLanding(page);
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const page = getBrandPage(brand);
  if (!page) notFound();
  return <SeoLandingView page={page} />;
}
