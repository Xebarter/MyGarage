'use client';

import { useCallback, useEffect, useState } from 'react';

import { cartUnitCount, readCartItems } from '@/lib/cart-client';
import type { CartLineItem } from '@/lib/cart-types';

export function useCartItems() {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setItems(readCartItems());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('cart:updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cart:updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return { items, ready, unitCount: cartUnitCount(items), refresh };
}
