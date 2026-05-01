'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type WishlistUpdate = { productId: string; wishlistItemId: string | null };

export function ProductWishlistButton({
  product,
  customerId,
  savedWishlistItemId,
  onUpdate,
  className,
}: {
  product: Product;
  customerId: string | null;
  savedWishlistItemId: string | null;
  onUpdate: (next: WishlistUpdate) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  /** When non-null, drives heart appearance immediately while the request runs. */
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);

  const savedFromProps = Boolean(savedWishlistItemId);
  const saved = optimisticSaved !== null ? optimisticSaved : savedFromProps;

  useEffect(() => {
    setOptimisticSaved(null);
  }, [savedWishlistItemId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!customerId || busy) return;

    const willBeSaved = !saved;
    setOptimisticSaved(willBeSaved);

    try {
      setBusy(true);
      if (!willBeSaved) {
        const res = await fetch(
          `/api/buyer/wishlist?customerId=${encodeURIComponent(customerId)}&productId=${encodeURIComponent(product.id)}`,
          { method: 'DELETE' },
        );
        if (!res.ok) {
          setOptimisticSaved(null);
          return;
        }
        onUpdate({ productId: product.id, wishlistItemId: null });
        return;
      }

      const res = await fetch('/api/buyer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          productId: product.id,
          productName: product.name,
          priceSnapshot: Number(product.price) || 0,
          categorySnapshot: product.category || '',
        }),
      });
      if (!res.ok) {
        setOptimisticSaved(null);
        return;
      }
      const created = (await res.json()) as { id?: string };
      if (created?.id) {
        onUpdate({ productId: product.id, wishlistItemId: created.id });
      } else {
        setOptimisticSaved(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const disabled = !customerId || busy;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      disabled={disabled}
      title={!customerId ? 'Sign in or shop as a buyer to save items' : saved ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'h-9 w-9 shrink-0 rounded-full border border-border/80 bg-background/90 shadow-sm backdrop-blur-sm hover:bg-background',
        saved && 'text-red-600 hover:text-red-700',
        className,
      )}
      onClick={toggle}
    >
      <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
    </Button>
  );
}
