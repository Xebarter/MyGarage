import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CategoryProductCard, FeaturedSpotlightCard } from '@/components/home/category-product-card';
import type { Product } from '@/lib/db';

export function FeaturedPicksSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const [spotlight, ...rest] = products;
  const gridProducts = rest.slice(0, 4);

  return (
    <section id="featured-picks" className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Shop</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Featured picks</h2>
        </div>
        <Link
          href="#more-featured"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
        <FeaturedSpotlightCard product={spotlight} imagePriority />
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {gridProducts.map((product, index) => (
            <CategoryProductCard key={product.id} product={product} imagePriority={index < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MoreFeaturedSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="more-featured" className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">More featured</h2>
        <Link
          href="/category/products/all"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6 lg:grid-cols-4">
        {products.slice(0, 12).map((product) => (
          <CategoryProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
