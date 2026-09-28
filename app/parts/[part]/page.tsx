import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { getPartPage, SEO_PARTS } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PARTS.map((part) => ({ part: part.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ part: string }>;
}): Promise<Metadata> {
  const { part } = await params;
  const page = getPartPage(part);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  return metadataFromLanding(page);
}

export default async function PartPage({ params }: { params: Promise<{ part: string }> }) {
  const { part } = await params;
  const page = getPartPage(part);
  if (!page) notFound();
  return <SeoLandingView page={page} />;
}
