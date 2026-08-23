'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

import { MobileAppPage } from '@/components/mobile-app-chrome';
import { ProductImage } from '@/components/product-image';
import type { Product } from '@/lib/db';
import { formatUgx } from '@/lib/format-ugx';
import { cn } from '@/lib/utils';

export function MobileProductDetail({
  product,
  displayPrice,
  canPurchase,
  cartFeedback,
  onAddToCart,
  options,
}: {
  product: Product;
  displayPrice: number | null;
  canPurchase: boolean;
  cartFeedback: boolean;
  onAddToCart: () => void;
  options?: ReactNode;
}) {
  const [snack, setSnack] = useState(false);

  const handleAdd = () => {
    onAddToCart();
    setSnack(true);
    window.setTimeout(() => setSnack(false), 1800);
  };

  return (
    <MobileAppPage>
      <div className="pb-6">
        <div className="relative aspect-[1.2] w-full bg-[#F8FAFC]">
          <ProductImage
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </div>

        <div className="px-5 py-5">
          <h1 className="text-[22px] font-bold leading-snug text-[#0B1220]">{product.name}</h1>
          <p className="mt-2 text-lg font-bold text-primary">
            {displayPrice == null ? '—' : formatUgx(displayPrice)}
          </p>
          {product.brand ? <p className="mt-2 text-sm text-[#8B9BB0]">{product.brand}</p> : null}
          {product.category ? <p className="mt-1 text-[13px] text-[#475569]">{product.category}</p> : null}

          {options ? <div className="mt-5">{options}</div> : null}

          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.45] text-[#0B1220]">
            {product.description?.trim() ? product.description : 'No description available.'}
          </p>

          {cartFeedback || snack ? (
            <p className="mt-4 text-sm font-medium text-primary" role="status">
              Added to cart
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canPurchase}
            onClick={handleAdd}
            className={cn(
              'mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white',
              !canPurchase && 'opacity-50',
            )}
          >
            {!canPurchase ? 'Select an option' : 'Add to cart'}
          </button>
        </div>
      </div>

      {snack ? (
        <div className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex items-center justify-between gap-3 rounded-xl bg-[#0B1220] px-4 py-3 text-sm text-white shadow-lg">
          <p>Added to cart</p>
          <Link href="/cart" className="shrink-0 font-semibold text-[#93C5FD]">
            View
          </Link>
        </div>
      ) : null}

    </MobileAppPage>
  );
}
