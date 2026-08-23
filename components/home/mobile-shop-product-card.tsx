'use client';

import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { homeCardTone } from '@/lib/home-card-tones';
import { cn } from '@/lib/utils';

function formatPrice(price: number): string {
  return `UGX ${Math.round(Number(price) || 0).toLocaleString('en-UG')}`;
}

export function MobileShopProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  imagePriority = false,
  toneIndex = 0,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  imagePriority?: boolean;
  toneIndex?: number;
}) {
  const inCart = quantity > 0;
  const tone = homeCardTone(toneIndex);

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-[14px] border border-black/[0.06]"
      style={{ backgroundColor: tone }}
    >
      <Link href={`/products/${product.id}`} className="flex min-h-0 flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden">
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="50vw"
            priority={imagePriority}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-black/10 to-transparent"
            aria-hidden
          />
          <div className="absolute bottom-2 right-2 z-10">
            <div
              className={cn(
                'flex h-[34px] items-center rounded-full border shadow-[0_3px_10px_rgba(11,18,32,0.12)]',
                inCart ? 'border-primary bg-primary' : 'border-border bg-white',
              )}
            >
              {inCart ? (
                <>
                  <button
                    type="button"
                    aria-label="Remove one"
                    className="flex h-[34px] w-8 items-center justify-center text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove();
                    }}
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="min-w-[22px] text-center text-[13px] font-bold text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Add one"
                    className="flex h-[34px] w-8 items-center justify-center text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAdd();
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  aria-label="Add to cart"
                  className="flex h-[34px] w-[34px] items-center justify-center text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAdd();
                  }}
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="px-2.5 pb-[11px] pt-2.5">
          <p className="line-clamp-2 text-[13px] font-semibold leading-[1.25] text-[#0B1220]">
            {product.name}
          </p>
          <p className="mt-1.5 text-[13px] font-bold text-primary">{formatPrice(product.price)}</p>
        </div>
      </Link>
    </article>
  );
}
