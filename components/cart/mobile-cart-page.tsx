'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { MobileAppPage } from '@/components/mobile-app-chrome';
import { ProductImage } from '@/components/product-image';
import { useCartItems } from '@/hooks/use-cart-items';
import { clearCartItems, removeCartLine, setCartLineQuantity } from '@/lib/cart-client';
import { cartLineKey } from '@/lib/cart-types';
import { formatUgx } from '@/lib/format-ugx';

export function MobileCartPage() {
  const router = useRouter();
  const { items, ready, unitCount } = useCartItems();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <MobileAppPage>
      {!ready ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 pb-8 text-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag className="h-10 w-10" aria-hidden />
          </div>
          <p className="mt-5 text-xl font-bold tracking-tight text-[#0B1220]">Your cart is empty</p>
          <p className="mt-2 text-sm leading-relaxed text-[#475569]">
            Browse the shop and add parts you need — they will show up here with photos and totals.
          </p>
          <Link
            href="/"
            className="mt-6 flex h-12 w-full max-w-sm items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
          >
            Browse shop
          </Link>
        </div>
      ) : (
        <>
          <div className="px-4 pb-4 pt-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#475569]">
                {items.length === 1 ? '1 product' : `${items.length} products`} ·{' '}
                {unitCount === 1 ? '1 item' : `${unitCount} items`}
              </p>
              <button
                type="button"
                className="text-sm font-semibold text-[#B91C1C]"
                onClick={() => {
                  if (window.confirm('Remove all items from your cart.')) {
                    clearCartItems();
                  }
                }}
              >
                Clear
              </button>
            </div>
            <ul className="space-y-3">
              {items.map((item) => {
                const key = cartLineKey(item);
                return (
                  <li key={key}>
                    <article className="rounded-[18px] border border-[#EEF2F7] bg-white p-3 shadow-[0_8px_20px_rgba(11,18,32,0.05)]">
                      <div className="flex items-start gap-3">
                        <Link
                          href={`/products/${item.id}`}
                          className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[14px] bg-[#F8FAFC]"
                        >
                          <ProductImage
                            src={item.image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="88px"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/products/${item.id}`} className="block">
                            <p className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-[#0B1220]">
                              {item.name}
                            </p>
                          </Link>
                          {item.variantLabel ? (
                            <p className="mt-1 text-xs text-[#8B9BB0]">{item.variantLabel}</p>
                          ) : null}
                          <p className="mt-1.5 text-[13px] font-medium text-[#475569]">{formatUgx(item.price)}</p>
                          <p className="mt-2.5 text-base font-bold tracking-tight text-primary">
                            {formatUgx(item.price * item.quantity)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove"
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-[#8B9BB0]"
                          onClick={() => removeCartLine(key)}
                        >
                          <Trash2 className="h-[22px] w-[22px]" aria-hidden />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-border bg-[#F8FAFC]">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="flex h-9 w-9 items-center justify-center text-[#0B1220]"
                            onClick={() => setCartLineQuantity(key, item.quantity - 1)}
                          >
                            <Minus className="h-5 w-5" aria-hidden />
                          </button>
                          <span className="min-w-9 text-center text-[15px] font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            className="flex h-9 w-9 items-center justify-center text-[#0B1220]"
                            onClick={() => setCartLineQuantity(key, item.quantity + 1)}
                          >
                            <Plus className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-[#8B9BB0]">Qty {item.quantity}</p>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-[#EEF2F7] bg-white px-4 pb-3 pt-3.5 shadow-[0_-4px_24px_rgba(11,18,32,0.08)]">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#475569]">Subtotal</p>
                <p className="text-[22px] font-extrabold tracking-tight text-[#0B1220]">{formatUgx(subtotal)}</p>
              </div>
              <p className="text-[13px] font-semibold text-[#8B9BB0]">
                {unitCount === 1 ? '1 item' : `${unitCount} items`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/checkout')}
              className="mt-3.5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
            >
              Checkout
            </button>
            <Link href="/" className="mt-2 flex h-10 w-full items-center justify-center text-sm font-semibold text-primary">
              Continue shopping
            </Link>
          </div>
        </>
      )}

    </MobileAppPage>
  );
}
