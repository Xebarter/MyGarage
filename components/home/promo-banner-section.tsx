'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

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
    <section aria-label="Sponsored product highlights" className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {/* Frame matches 1600×450 promo assets uploaded in Admin → Promotions */}
      <div className="relative aspect-[1600/450] w-full overflow-hidden bg-muted/30">
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              Featured ad
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Verified vendors
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
            {product.name}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
            {headline}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 md:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold tabular-nums text-foreground sm:text-xl">
              {formatProductPriceLabel(product)}
            </span>
            <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              {product.category}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:flex-none"
          >
            View product
          </Link>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent sm:flex-none"
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
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
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
