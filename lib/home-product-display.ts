import type { Product } from '@/lib/db';

const VEHICLE_TAG_PATTERN =
  /\b(toyota|honda|nissan|bmw|mercedes|ford|volkswagen|vw|audi|hyundai|kia|mazda|subaru|lexus|mitsubishi|suzuki|isuzu|universal|all vehicles|fits|compatible|model|year)\b/i;

const SERVICE_CATEGORY_PATTERN = /\b(service|garage|repair|installation|maintenance)\b/i;

const NEW_PRODUCT_DAYS = 30;

export type ProductCardBadge = 'featured' | 'new' | 'service' | 'verified';

export function getProductSupplierName(product: Product): string {
  return product.brand?.trim() || 'Verified supplier';
}

export function getVehicleCompatibility(product: Product): string | null {
  const sub = product.subcategory?.trim();
  if (sub && VEHICLE_TAG_PATTERN.test(sub)) return sub;

  const tagMatch = (product.tags ?? []).find((tag) => VEHICLE_TAG_PATTERN.test(tag));
  if (tagMatch) return tagMatch;

  const desc = product.description?.trim();
  if (desc) {
    const fitSentence = desc
      .split(/[.!?\n]/)
      .map((s) => s.trim())
      .find((s) => s.length > 0 && VEHICLE_TAG_PATTERN.test(s));
    if (fitSentence && fitSentence.length <= 80) return fitSentence;
  }

  return null;
}

export function isServiceProduct(product: Product): boolean {
  const category = product.category?.trim() ?? '';
  return SERVICE_CATEGORY_PATTERN.test(category) || (product.tags ?? []).some((t) => SERVICE_CATEGORY_PATTERN.test(t));
}

export function isNewProduct(product: Product): boolean {
  const created = product.createdAt instanceof Date ? product.createdAt : new Date(product.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const ageMs = Date.now() - created.getTime();
  return ageMs >= 0 && ageMs < NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
}

export function getProductCardBadge(product: Product): ProductCardBadge | null {
  if (product.featured) return 'featured';
  if (isServiceProduct(product)) return 'service';
  if (isNewProduct(product)) return 'new';
  return 'verified';
}

export function formatCategoryLabel(category: string): string {
  if (category === 'all') return 'All';
  return category.charAt(0).toUpperCase() + category.slice(1);
}
