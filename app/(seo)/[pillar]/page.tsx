import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { getPillar, SEO_PILLARS } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PILLARS.map((pillar) => ({ pillar: pillar.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pillar: string }>;
}): Promise<Metadata> {
  const { pillar } = await params;
  const page = getPillar(pillar);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  return metadataFromLanding(page);
}

export default async function PillarPage({ params }: { params: Promise<{ pillar: string }> }) {
  const { pillar } = await params;
  const page = getPillar(pillar);
  if (!page) notFound();
  return <SeoLandingView page={page} />;
}
