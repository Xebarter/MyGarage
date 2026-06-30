import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

export function CategoryProductCard({
  product,
  className,
  imagePriority = false,
}: {
  product: Product;
  className?: string;
  imagePriority?: boolean;
}) {
  const supplierLine = product.brand?.trim() || product.subcategory?.trim() || product.category;

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 50vw, 20vw"
          priority={imagePriority}
        />
        {product.featured ? (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Featured
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
        <p className="mt-1.5 text-base font-bold tabular-nums text-foreground">{formatProductPriceLabel(product)}</p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{supplierLine}</p>
      </div>
    </Link>
  );
}

export function FeaturedSpotlightCard({
  product,
  imagePriority = false,
}: {
  product: Product;
  imagePriority?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md md:min-h-[22rem]"
    >
      <div className="relative flex-1 overflow-hidden bg-muted/30">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={imagePriority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            Spotlight
          </span>
          <h3 className="mt-3 line-clamp-2 text-xl font-bold leading-tight">{product.name}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold tabular-nums">{formatProductPriceLabel(product)}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              {product.category}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm font-medium text-primary">
        View product
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}
