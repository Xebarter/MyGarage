import type { Metadata } from 'next';

import { JsonLdScript } from '@/components/seo/json-ld-script';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { categoryProductsJsonLd } from '@/lib/seo/json-ld';

type Props = {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: raw } = await params;
  const categoryName = decodeURIComponent(raw).trim() || 'Category';

  return buildPageMetadata({
    title: `${categoryName} Car Parts`,
    description: `Shop ${categoryName} parts and accessories for your vehicle. Compare prices, brands, and availability on MyGarage Uganda.`,
    path: `/category/products/${encodeURIComponent(categoryName)}`,
    keywords: [categoryName, 'car parts', 'auto parts Uganda', 'MyGarage'],
  });
}

export default async function ProductCategoryLayout({ children, params }: Props) {
  const { category: raw } = await params;
  const categoryName = decodeURIComponent(raw).trim();

  return (
    <>
      {categoryName ? <JsonLdScript data={categoryProductsJsonLd(categoryName)} /> : null}
      {children}
    </>
  );
}
