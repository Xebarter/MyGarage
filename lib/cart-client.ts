import { cartLineKey, type CartLineItem } from '@/lib/cart-types';
import type { Product } from '@/lib/db';

const CART_KEY = 'cartItems';

export function readCartItems(): CartLineItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY) || '[]';
    const items = JSON.parse(raw) as CartLineItem[];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function writeCartItems(items: CartLineItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart:updated'));
}

export function quantityOfProduct(items: CartLineItem[], productId: string): number {
  return items
    .filter((item) => item.id === productId)
    .reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
}

export function addProductToCart(product: Product, quantity = 1): CartLineItem[] {
  const items = readCartItems();
  const idx = items.findIndex((item) => item.id === product.id && !item.variantId);
  if (idx >= 0) {
    items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
  } else {
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
      vendorId: product.vendorId,
    });
  }
  writeCartItems(items);
  return items;
}

export function setProductCartQuantity(productId: string, quantity: number): CartLineItem[] {
  let items = readCartItems();
  const idx = items.findIndex((item) => item.id === productId && !item.variantId);
  if (quantity <= 0) {
    items = items.filter((item) => !(item.id === productId && !item.variantId));
  } else if (idx >= 0) {
    items[idx] = { ...items[idx], quantity };
  }
  writeCartItems(items);
  return items;
}

export function cartUnitCount(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
}

export function setCartLineQuantity(lineKey: string, quantity: number): CartLineItem[] {
  let items = readCartItems();
  if (quantity <= 0) {
    items = items.filter((item) => cartLineKey(item) !== lineKey);
  } else {
    items = items.map((item) => (cartLineKey(item) === lineKey ? { ...item, quantity } : item));
  }
  writeCartItems(items);
  return items;
}

export function removeCartLine(lineKey: string): CartLineItem[] {
  const items = readCartItems().filter((item) => cartLineKey(item) !== lineKey);
  writeCartItems(items);
  return items;
}

export function clearCartItems(): CartLineItem[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event('cart:updated'));
  }
  return [];
}
