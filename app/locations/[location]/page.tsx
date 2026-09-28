import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { getLocationPage, SEO_LOCATIONS } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_LOCATIONS.map((location) => ({ location: location.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location } = await params;
  const page = getLocationPage(location);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  return metadataFromLanding(page);
}

export default async function LocationPage({ params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  const page = getLocationPage(location);
  if (!page) notFound();
  return <SeoLandingView page={page} />;
}
