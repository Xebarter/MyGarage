'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { formatProductPriceLabel } from '@/lib/product-variants';

export function DesktopHomeHero({
  featuredProduct,
  productCount,
  departmentCount,
}: {
  featuredProduct: Product | null;
  productCount: number;
  departmentCount: number;
}) {
  const categoryLabel = featuredProduct?.category?.trim() || 'Featured';

  return (
    <section
      aria-label="MyGarage marketplace"
      className="relative isolate overflow-hidden bg-[#070B14] text-white"
    >
      {/* Atmospheric plane */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_20%,rgba(37,99,235,0.28),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_85%_30%,rgba(56,189,248,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(7,11,20,0.35)_70%,#070B14_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1500px] items-center gap-10 px-5 py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:px-8 lg:py-16 xl:gap-20 xl:py-20">
        <div className="home-hero-copy max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">
            Kampala · Nationwide
          </p>

          <p className="mt-5 font-extrabold tracking-tight text-white">
            <span className="block text-4xl leading-none sm:text-5xl lg:text-[3.35rem]">MyGarage</span>
          </p>

          <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-white/95 sm:text-3xl lg:text-[2rem] lg:leading-snug">
            Parts and services, specified for your vehicle.
          </h1>

          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60 sm:text-base">
            Quality automotive parts, fluids, and accessories — with verified vendors, fitment
            support, and workshop booking in one desk.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#browse-categories"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#0B1220] transition duration-300 hover:bg-white/92"
            >
              Shop the catalog
              <ArrowRight
                className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="/buyer/services"
              className="inline-flex h-12 items-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition duration-300 hover:border-white/35 hover:bg-white/10"
            >
              Book a service
            </Link>
          </div>

          {productCount > 0 ? (
            <p className="mt-6 text-sm text-white/40">
              {productCount.toLocaleString()} parts across {departmentCount.toLocaleString()}{' '}
              {departmentCount === 1 ? 'department' : 'departments'}.
            </p>
          ) : null}
        </div>

        <div className="home-hero-visual relative min-h-[320px] lg:min-h-[420px]">
          {featuredProduct ? (
            <Link
              href={`/products/${featuredProduct.id}`}
              className="group relative flex h-full min-h-[320px] flex-col justify-end overflow-hidden lg:min-h-[420px]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),transparent_65%)]" />

              <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 pt-6 lg:max-w-none lg:px-8">
                <div className="home-hero-product relative aspect-square w-full max-w-[380px]">
                  <ProductImage
                    src={featuredProduct.image}
                    alt={featuredProduct.name}
                    fill
                    className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)] transition duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width: 1024px) 60vw, 420px"
                    priority
                  />
                </div>
              </div>

              <div className="relative border-t border-white/10 bg-gradient-to-t from-black/50 to-transparent px-5 pb-5 pt-8 sm:px-6 sm:pb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
                  {categoryLabel}
                </p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">
                      {featuredProduct.name}
                    </p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-white/80">
                      {formatProductPriceLabel(featuredProduct)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2.5">
                    View product
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] lg:min-h-[420px]">
              <p className="text-sm text-white/45">Featured parts appear here as inventory grows.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
