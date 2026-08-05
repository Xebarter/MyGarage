import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

const productImageFrameClass =
  'relative aspect-square w-full overflow-hidden bg-muted/40';

const productImageClass =
  'object-contain p-3 transition duration-300 group-hover:scale-[1.03] sm:p-4';

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
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition duration-200 hover:border-primary/40 hover:shadow-sm',
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
          <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Featured
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-3 pt-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-foreground">{product.name}</p>
        <p className="text-base font-bold tabular-nums tracking-tight text-foreground">
          {formatProductPriceLabel(product)}
        </p>
        {supplierLine ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{supplierLine}</p>
        ) : (
          <span className="block h-4" aria-hidden />
        )}

        <span className="mt-auto inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background text-sm font-semibold text-foreground transition group-hover:border-primary/40 group-hover:bg-primary group-hover:text-primary-foreground">
          View
          <ArrowRight
            className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
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
        'group relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition duration-200 hover:border-primary/40 hover:shadow-sm',
        className,
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden bg-muted/40">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-5 transition duration-300 group-hover:scale-[1.03] sm:p-8 md:p-10"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={imagePriority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5 md:p-6">
          <span className="inline-flex rounded bg-white/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
            Featured
          </span>
          <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-tight tracking-tight sm:text-xl md:text-2xl">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold tabular-nums tracking-tight sm:text-xl">
              {formatProductPriceLabel(product)}
            </span>
            {supplierLine ? (
              <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                {supplierLine}
              </span>
            ) : null}
          </div>
          <span className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-white/15 px-3 text-sm font-semibold text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-foreground">
            View product
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
