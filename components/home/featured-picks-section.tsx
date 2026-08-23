import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { CategoryProductCard } from '@/components/home/category-product-card';
import { HomeSectionHeader } from '@/components/home/home-section-header';
import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { homeCardTone } from '@/lib/home-card-tones';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

function FeaturedWeekSpotlight({
  product,
  index,
  className,
}: {
  product: Product;
  index: number;
  className?: string;
}) {
  const brand = product.brand?.trim() || product.category;
  const label = String(index).padStart(2, '0');

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        'group relative flex aspect-[4/3] max-h-[320px] w-full flex-col overflow-hidden bg-[#0B1220] text-white',
        'ring-1 ring-inset ring-white/10 transition duration-500',
        'hover:ring-white/20 sm:max-h-[360px] lg:max-h-none lg:h-full lg:aspect-auto',
        className,
      )}
    >
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(56,189,248,0.14),transparent_52%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(37,99,235,0.16),transparent_48%)]" />
      </div>

      <div className="absolute left-5 top-5 z-10 sm:left-6 sm:top-6">
        <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-white/40">{label}</p>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-6 pb-2 pt-10 sm:px-8 lg:px-6 lg:pt-8">
        <div className="relative aspect-square w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[min(100%,420px)]">
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)] transition duration-700 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 1024px) 70vw, 40vw"
            priority
          />
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-[#070B14]/55 px-5 py-4 backdrop-blur-[2px] sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {brand ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {brand}
              </p>
            ) : null}
            <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
              {product.name}
            </h3>
            <p className="mt-2 text-base font-semibold tabular-nums tracking-tight text-white/90">
              {formatProductPriceLabel(product)}
            </p>
          </div>
          <span
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition duration-300 group-hover:border-white/30 group-hover:bg-white/10"
            aria-hidden
          >
            <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedWeekSideCard({
  product,
  index,
  toneIndex = 0,
  imagePriority = false,
}: {
  product: Product;
  index: number;
  toneIndex?: number;
  imagePriority?: boolean;
}) {
  const brand = product.brand?.trim() || product.subcategory?.trim() || product.category;
  const label = String(index).padStart(2, '0');
  const tone = homeCardTone(toneIndex);

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        'group relative flex h-full min-h-[148px] overflow-hidden rounded-xl lg:min-h-0',
        'border border-black/[0.07] transition duration-300',
        'hover:border-black/[0.12] hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.28)]',
      )}
      style={{ backgroundColor: tone }}
    >
      <div className="relative w-[42%] shrink-0 self-stretch overflow-hidden sm:w-[44%]">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-3.5 transition duration-700 ease-out group-hover:scale-[1.05] sm:p-4 lg:p-2"
          sizes="(max-width: 1024px) 40vw, 18vw"
          priority={imagePriority}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-medium tracking-[0.16em] text-[#94A3B8]">
              {label}
            </p>
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/[0.06] bg-white/70 text-[#0B1220] opacity-0 transition duration-300 group-hover:opacity-100"
              aria-hidden
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>

          {brand ? (
            <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
              {brand}
            </p>
          ) : null}

          <h3 className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-[#0B1220] sm:text-[15px]">
            {product.name}
          </h3>
        </div>

        <div className="flex items-end justify-between gap-2 border-t border-black/[0.06] pt-3">
          <p className="text-[14px] font-semibold tabular-nums tracking-tight text-[#0B1220] sm:text-[15px]">
            {formatProductPriceLabel(product)}
          </p>
          <span className="text-[11px] font-semibold tracking-wide text-primary opacity-0 transition duration-300 group-hover:opacity-100">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedPicksSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const [spotlight, ...rest] = products;
  const sideProducts = rest.slice(0, 2);

  return (
    <section id="featured-picks" className="scroll-mt-28">
      <HomeSectionHeader
        eyebrow="Selection"
        title="Featured this week"
        description="Hand-picked parts from verified vendors — ready to specify against your vehicle."
        actionHref="#more-featured"
      />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:h-[380px] lg:gap-4">
        <FeaturedWeekSpotlight
          product={spotlight}
          index={1}
          className="rounded-xl sm:rounded-2xl"
        />

        {sideProducts.length > 0 ? (
          <div
            className={cn(
              'grid gap-3 lg:h-full lg:min-h-0 lg:gap-4',
              sideProducts.length === 1 && 'lg:grid-rows-1',
              sideProducts.length >= 2 && 'lg:grid-rows-2',
            )}
          >
            {sideProducts.map((product, index) => (
              <FeaturedWeekSideCard
                key={product.id}
                product={product}
                index={index + 2}
                toneIndex={index + 1}
                imagePriority={index < 2}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MoreFeaturedSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="more-featured" className="scroll-mt-28">
      <HomeSectionHeader
        eyebrow="More picks"
        title="More featured"
        description="Continue browsing curated inventory from the parts desk."
        actionHref="/category/products/all"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {products.slice(0, 12).map((product, index) => (
          <CategoryProductCard key={product.id} product={product} toneIndex={index} />
        ))}
      </div>
    </section>
  );
}
