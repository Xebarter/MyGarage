'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ProductImage } from '@/components/product-image';
import { ProductWishlistButton } from '@/components/product-wishlist-button';
import type { HomePromoBanner } from '@/lib/home-initial-data';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

/**
 * Home sponsored carousel — uses admin-uploaded promo banners (1600×450) from
 * `promo_carousel_items`, not the product listing image.
 */
export function PromoBannerSection({
  banners,
  customerId,
  wishlistByProductId,
  onWishlistChange,
}: {
  banners: HomePromoBanner[];
  customerId: string | null;
  wishlistByProductId: Record<string, string>;
  onWishlistChange: (next: { productId: string; wishlistItemId: string | null }) => void;
}) {
  const items = banners.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (items.length <= 1) return;
    const FADE_MS = 350;
    const ROTATE_MS = 7500;

    const timer = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % items.length);
        window.setTimeout(() => setFading(false), 20);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <section
        aria-label="Sponsored placements"
        className="overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/15 px-5 py-10 text-center sm:px-6"
      >
        <p className="text-sm font-semibold text-foreground">Sponsored placements</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No sponsored placements are available right now.
        </p>
      </section>
    );
  }

  const active = items[activeIndex % items.length];
  const product = active.product;
  const headline =
    product.description?.trim() ||
    `Shop ${product.category} from verified vendors on MyGarage.`;

  return (
    <section aria-label="Sponsored product highlights" className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Frame matches 1600×450 promo assets uploaded in Admin → Promotions */}
      <div className="relative aspect-[1600/450] w-full overflow-hidden bg-[#EEF1F6]">
        <ProductImage
          src={active.bannerUrl || product.image}
          alt={`${product.name} promotion`}
          fill
          className={cn(
            'object-cover transition-opacity duration-500 ease-in-out',
            fading ? 'opacity-0' : 'opacity-100',
          )}
          sizes="(max-width: 1500px) 100vw, 1500px"
          priority={activeIndex === 0}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070B14]/75 via-[#070B14]/15 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 md:p-9">
          <h2 className="line-clamp-2 max-w-3xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
            {product.name}
          </h2>
          <p className="mt-2.5 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            {headline}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-black/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 md:px-8 md:py-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold tabular-nums text-foreground sm:text-xl">
              {formatProductPriceLabel(product)}
            </span>
            <span className="text-sm text-muted-foreground">{product.category}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:flex-none"
          >
            View product
          </Link>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent sm:flex-none"
          >
            See details
          </Link>
          <ProductWishlistButton
            product={product}
            customerId={customerId}
            savedWishlistItemId={wishlistByProductId[product.id] ?? null}
            onUpdate={onWishlistChange}
            className="h-10 w-10 shrink-0 border border-border bg-background"
          />
        </div>
      </div>

      {items.length > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] bg-[#F7F8FB] px-5 py-3.5 sm:px-8">
          <p className="text-xs text-muted-foreground">
            Banner {activeIndex + 1} of {items.length}
          </p>
          <div className="flex items-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show banner ${index + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === activeIndex
                    ? 'w-8 bg-primary'
                    : 'w-4 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
