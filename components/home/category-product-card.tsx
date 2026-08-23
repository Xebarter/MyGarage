import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { homeCardTone } from '@/lib/home-card-tones';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

function formatCompareAt(price: number): string {
  return `UGX ${Math.round(price).toLocaleString('en-UG')}`;
}

export function CategoryProductCard({
  product,
  className,
  imagePriority = false,
  toneIndex = 0,
}: {
  product: Product;
  className?: string;
  imagePriority?: boolean;
  /** Position in the local card sequence — adjacent indices get different tints */
  toneIndex?: number;
}) {
  const brand = product.brand?.trim();
  const meta = brand || product.subcategory?.trim() || product.category;
  const compareAt =
    typeof product.compareAtPrice === 'number' &&
    Number.isFinite(product.compareAtPrice) &&
    product.compareAtPrice > product.price
      ? product.compareAtPrice
      : null;
  const tone = homeCardTone(toneIndex);

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl',
        'border border-black/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out',
        'hover:-translate-y-1 hover:border-black/[0.1] hover:shadow-[0_22px_44px_-18px_rgba(15,23,42,0.22)]',
        className,
      )}
      style={{ backgroundColor: tone }}
    >
      <div className="relative aspect-square overflow-hidden lg:aspect-[5/6]">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-3 transition duration-700 ease-out group-hover:scale-[1.04] sm:p-3.5 lg:p-1.5 xl:p-1"
          sizes="(max-width: 768px) 45vw, (max-width: 1200px) 22vw, 18vw"
          priority={imagePriority}
        />

        {product.featured ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-[#0B1220] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
            Featured
          </span>
        ) : null}

        <span
          className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.06] bg-white/80 text-[#0B1220] opacity-0 shadow-sm backdrop-blur-sm transition duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1"
          aria-hidden
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4 lg:px-4 lg:pb-4 lg:pt-3">
        {meta ? (
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-[#64748B]">
            {meta}
          </p>
        ) : (
          <span className="block h-4 lg:hidden" aria-hidden />
        )}

        <h3 className="mt-1.5 line-clamp-2 min-h-[2.6rem] text-[15px] font-semibold leading-snug tracking-tight text-[#0B1220] transition-colors lg:min-h-0 lg:text-[14px]">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold tabular-nums tracking-tight text-[#0B1220] sm:text-base">
              {formatProductPriceLabel(product)}
            </p>
            {compareAt ? (
              <p className="mt-0.5 text-xs tabular-nums text-[#64748B] line-through">
                {formatCompareAt(compareAt)}
              </p>
            ) : null}
          </div>
          <span className="hidden shrink-0 text-xs font-semibold text-primary opacity-0 transition duration-300 group-hover:opacity-100 sm:inline">
            View
          </span>
        </div>
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
        'group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[#0B1220] text-white',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-500 hover:bg-[#0E1628]',
        className,
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,rgba(37,99,235,0.22),transparent_55%)]"
          aria-hidden
        />
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-4 transition duration-700 group-hover:scale-[1.03] sm:p-5"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={imagePriority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-[#070B14]/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 md:p-7">
          {supplierLine ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
              {supplierLine}
            </p>
          ) : null}
          <h3 className="mt-1.5 line-clamp-2 text-lg font-bold leading-tight tracking-tight sm:text-xl md:text-2xl">
            {product.name}
          </h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-lg font-semibold tabular-nums tracking-tight sm:text-xl">
              {formatProductPriceLabel(product)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 transition group-hover:gap-2.5">
              View product
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
