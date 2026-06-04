import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { getProduct } from '@/lib/db';
import { buildProductMetadata } from '@/lib/seo/metadata';
import { productPageJsonLd } from '@/lib/seo/json-ld';

import { ProductDetailClient } from './product-detail-client';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: false } };
  }
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <>
      <JsonLdScript data={productPageJsonLd(product)} />
      <ProductDetailClient initialProduct={product} />
    </>
  );
}
