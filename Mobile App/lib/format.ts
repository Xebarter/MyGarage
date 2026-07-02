import type { Product } from '@/types';

function getVariantPriceBounds(product: Pick<Product, 'price' | 'variants'>): {
  min: number;
  max: number;
} {
  const variantPrices = (product.variants ?? []).map((v) => v.price).filter((p) => Number.isFinite(p));
  if (variantPrices.length === 0) {
    return { min: product.price, max: product.price };
  }
  return {
    min: Math.min(...variantPrices),
    max: Math.max(...variantPrices),
  };
}

export function formatProductPrice(product: Pick<Product, 'price' | 'variants'>): string {
  const { min, max } = getVariantPriceBounds(product);
  if (!(product.variants?.length ?? 0) || min === max) {
    return `UGX ${min.toLocaleString('en-UG')}`;
  }
  return `UGX ${min.toLocaleString('en-UG')} – ${max.toLocaleString('en-UG')}`;
}

export function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString('en-UG')}`;
}

/** "Emergency Help (I'm Stuck)" → "Emergency Help" */
export function formatServiceCategoryTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
}

export function formatServiceHint(text: string): string {
  return text.replace(/^Use when:\s*/i, '');
}
