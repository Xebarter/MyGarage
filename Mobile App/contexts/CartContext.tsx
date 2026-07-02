import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CartItem } from '@/types';

const STORAGE_KEY = 'mygarage_cart_v1';

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(productId: string, variantId?: string) {
  return `${productId}:${variantId ?? 'default'}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const quantity = item.quantity ?? 1;
    setItems((prev) => {
      const key = itemKey(item.productId, item.variantId);
      const index = prev.findIndex((row) => itemKey(row.productId, row.variantId) === key);
      if (index === -1) {
        return [...prev, { ...item, quantity }];
      }
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + quantity };
      return next;
    });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      setItems((prev) => {
        const key = itemKey(productId, variantId);
        return prev
          .map((row) =>
            itemKey(row.productId, row.variantId) === key ? { ...row, quantity } : row,
          )
          .filter((row) => row.quantity > 0);
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId?: string) => {
    const key = itemKey(productId, variantId);
    setItems((prev) => prev.filter((row) => itemKey(row.productId, row.variantId) !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, row) => sum + row.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, row) => sum + row.price * row.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      hydrated,
    }),
    [addItem, clearCart, hydrated, itemCount, items, removeItem, subtotal, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
