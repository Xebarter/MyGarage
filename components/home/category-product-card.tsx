import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

const productImageFrameClass =
  'relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-muted/15 via-muted/25 to-muted/40';

const productImageClass =
  'object-contain p-3 transition duration-500 group-hover:scale-[1.02] sm:p-4';

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
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.04] transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
        className,
      )}
    >
      <div className={productImageFrameClass}>
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className={productImageClass}
          sizes="(max-width: 768px) 45vw, (max-width: 1200px) 22vw, 18vw"
          priority={imagePriority}
        />
        {product.featured ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
            Featured
          </span>
        ) : null}
      </div>
      <div className="flex min-h-[4.5rem] flex-1 flex-col justify-center px-3 py-3 sm:px-3.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
        <p className="mt-1.5 text-base font-bold tabular-nums tracking-tight text-foreground">
          {formatProductPriceLabel(product)}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{supplierLine}</p>
      </div>
    </Link>
  );
}

export function FeaturedSpotlightCard({
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
        'group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md ring-1 ring-black/[0.04] transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl',
        className,
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-muted/20 via-muted/30 to-muted/50">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-5 transition duration-500 group-hover:scale-[1.02] sm:p-8 md:p-10"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={imagePriority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
          <span className="inline-flex rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm">
            Spotlight pick
          </span>
          <h3 className="mt-3 line-clamp-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {product.name}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold tabular-nums tracking-tight sm:text-xl">
              {formatProductPriceLabel(product)}
            </span>
            {supplierLine ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                {supplierLine}
              </span>
            ) : null}
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 transition group-hover:text-white">
            View product
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
