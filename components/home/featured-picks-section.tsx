import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

import { CategoryProductCard, FeaturedSpotlightCard } from '@/components/home/category-product-card';
import type { Product } from '@/lib/db';

export function FeaturedPicksSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const [spotlight, ...rest] = products;
  const gridProducts = rest.slice(0, 4);

  return (
    <section
      id="featured-picks"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.03]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Curated for you</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Featured picks</h2>
          </div>
        </div>
        <Link
          href="#more-featured"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 md:grid-cols-4 md:grid-rows-2 md:gap-4 lg:gap-5">
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
