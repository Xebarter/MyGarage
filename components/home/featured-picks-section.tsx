import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import {
  FeaturedSpotlightCard,
  FeaturedSupportingCard,
} from '@/components/home/category-product-card';
import type { Product } from '@/lib/db';

export function FeaturedPicksSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const [spotlight, ...rest] = products;
  const gridProducts = rest.slice(0, 4);

  return (
    <section id="featured-picks" aria-label="Featured automotive products">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Featured automotive products</h2>
        <Link
          href="/category/products/all"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <FeaturedSpotlightCard product={spotlight} imagePriority />
        <div className="grid grid-cols-2 gap-3">
          {gridProducts.map((product, index) => (
            <FeaturedSupportingCard key={product.id} product={product} imagePriority={index < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
