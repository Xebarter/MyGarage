import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SeoLandingView } from '@/components/seo/seo-landing-page';
import { getAcademyPage, SEO_ACADEMY } from '@/lib/seo/landing';
import { metadataFromLanding } from '@/lib/seo/landing/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_ACADEMY.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getAcademyPage(slug);
  if (!page) return { title: 'Not found', robots: { index: false, follow: false } };
  return metadataFromLanding(page);
}

export default async function AcademyArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getAcademyPage(slug);
  if (!page) notFound();
  return <SeoLandingView page={page} />;
}
