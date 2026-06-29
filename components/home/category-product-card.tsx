import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import {
  formatCategoryLabel,
  getProductCardBadge,
  getProductSupplierName,
  getVehicleCompatibility,
} from '@/lib/home-product-display';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

const BADGE_STYLES: Record<NonNullable<ReturnType<typeof getProductCardBadge>>, string> = {
  featured: 'bg-primary text-primary-foreground',
  new: 'bg-emerald-600 text-white',
  service: 'bg-violet-600 text-white',
  verified: 'bg-slate-700/90 text-white',
};

const BADGE_LABELS: Record<NonNullable<ReturnType<typeof getProductCardBadge>>, string> = {
  featured: 'Featured',
  new: 'New',
  service: 'Service',
  verified: 'Verified',
};

function ProductCardBadge({ product }: { product: Product }) {
  const badge = getProductCardBadge(product);
  if (!badge) return null;

  return (
    <span
      className={cn(
        'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm',
        BADGE_STYLES[badge],
      )}
    >
      {BADGE_LABELS[badge]}
    </span>
  );
}

export function CategoryProductCard({
  product,
  className,
  imagePriority = false,
  compact = false,
}: {
  product: Product;
  className?: string;
  imagePriority?: boolean;
  compact?: boolean;
}) {
  const compatibility = getVehicleCompatibility(product);
  const supplier = getProductSupplierName(product);

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        'group flex h-full min-w-[9rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md sm:min-w-[10.5rem]',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 40vw, 180px"
          priority={imagePriority}
        />
        <ProductCardBadge product={product} />
      </div>
      <div className={cn('flex flex-1 flex-col', compact ? 'p-2.5' : 'p-3')}>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
        {compatibility ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{compatibility}</p>
        ) : null}
        <p className="mt-1.5 text-base font-bold tabular-nums text-foreground">{formatProductPriceLabel(product)}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{supplier}</p>
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
  const compatibility = getVehicleCompatibility(product);
  const supplier = getProductSupplierName(product);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md">
      <Link href={`/products/${product.id}`} className="relative flex min-h-[16rem] flex-1 flex-col overflow-hidden md:min-h-[20rem]">
        <div className="relative flex-1 overflow-hidden bg-muted/30">
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={imagePriority}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute left-4 top-4">
            <span className="inline-flex rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
              Featured
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <h3 className="line-clamp-2 text-lg font-bold leading-tight text-white sm:text-xl">{product.name}</h3>
            {compatibility ? (
              <p className="mt-1.5 line-clamp-1 text-xs text-white/85 sm:text-sm">{compatibility}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-white">{formatProductPriceLabel(product)}</span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {formatCategoryLabel(product.category)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-white/80">{supplier}</p>
          </div>
        </div>
      </Link>
      <Link
        href={`/products/${product.id}`}
        className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-muted/30"
      >
        View product
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}

export function FeaturedSupportingCard({
  product,
  imagePriority = false,
}: {
  product: Product;
  imagePriority?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 45vw, 220px"
          priority={imagePriority}
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{product.name}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{formatCategoryLabel(product.category)}</p>
        <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">{formatProductPriceLabel(product)}</p>
      </div>
    </Link>
  );
}
