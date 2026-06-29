'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { HomePromoBanner } from '@/lib/home-initial-data';
import {
  formatCategoryLabel,
  getVehicleCompatibility,
  getProductSupplierName,
} from '@/lib/home-product-display';
import { formatProductPriceLabel } from '@/lib/product-variants';
import { cn } from '@/lib/utils';

export function PromoBannerSection({ banners }: { banners: HomePromoBanner[] }) {
  const items = banners.slice(0, 8);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <section aria-label="Sponsored deals" className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">No sponsored deals available right now.</p>
      </section>
    );
  }

  const active = items[activeIndex % items.length];
  const product = active.product;
  const compatibility = getVehicleCompatibility(product);
  const supplier = getProductSupplierName(product);
  const promoMessage =
    product.description?.trim().slice(0, 120) ||
    `Quality ${formatCategoryLabel(product.category)} from verified suppliers on MyGarage.`;

  return (
    <section aria-label="Sponsored deals and promotions">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">Sponsored deals</h2>
        {items.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            {activeIndex + 1} / {items.length}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="relative flex flex-col sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted/30 sm:aspect-auto sm:h-auto sm:w-44 md:w-52 lg:w-56">
            <ProductImage
              src={active.bannerUrl || product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 224px"
              priority={activeIndex === 0}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Sponsored
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified
                </span>
              </div>

              <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground sm:text-lg">{product.name}</h3>

              {compatibility ? (
                <p className="line-clamp-1 text-xs text-muted-foreground">{compatibility}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold tabular-nums text-foreground">{formatProductPriceLabel(product)}</span>
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {formatCategoryLabel(product.category)}
                </span>
                <span className="text-[11px] text-muted-foreground">{supplier}</span>
              </div>

              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{promoMessage}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/products/${product.id}`}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                View product
              </Link>
              <Link
                href={`/products/${product.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted/50"
              >
                See details
              </Link>
            </div>
          </div>
        </div>

        {items.length > 1 ? (
          <div className="flex items-center justify-center gap-1.5 border-t border-border/60 bg-muted/15 px-4 py-2.5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show sponsored deal ${index + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === activeIndex ? 'w-7 bg-primary' : 'w-3.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
