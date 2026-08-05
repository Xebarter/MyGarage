import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CategoryProductCard, FeaturedSpotlightCard } from '@/components/home/category-product-card';
import type { Product } from '@/lib/db';

export function FeaturedPicksSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const [spotlight, ...rest] = products;
  const gridProducts = rest.slice(0, 4);

  return (
    <section id="featured-picks">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Featured</h2>
        <Link
          href="#more-featured"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          See all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:grid-rows-2 lg:gap-5">
        <FeaturedSpotlightCard
          product={spotlight}
          imagePriority
          className="col-span-2 aspect-[16/10] md:aspect-auto md:row-span-2"
        />
        {gridProducts.map((product, index) => (
          <CategoryProductCard key={product.id} product={product} imagePriority={index < 2} />
        ))}
      </div>
    </section>
  );
}

export function MoreFeaturedSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="more-featured">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">More featured</h2>
        <Link
          href="/category/products/all"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          See all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
        {products.slice(0, 12).map((product) => (
          <CategoryProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
