export const PRODUCT_ORDER_STATUSES = [
  'pending_fulfillment',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export type ProductOrderStatus = (typeof PRODUCT_ORDER_STATUSES)[number];

const STATUS_SET = new Set<string>(PRODUCT_ORDER_STATUSES);

export function isProductOrderStatus(value: string): value is ProductOrderStatus {
  return STATUS_SET.has(value);
}

/** Accept UI aliases such as `pending` from older admin/vendor forms. */
export function parseProductOrderStatus(value: unknown): ProductOrderStatus | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'pending') return 'pending_fulfillment';
  if (raw === 'in transit' || raw === 'in_transit') return 'shipped';
  if (isProductOrderStatus(raw)) return raw;
  return null;
}

export function productOrderStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
    case 'pending_fulfillment':
      return 'Paid';
    case 'processing':
      return 'Processing';
    case 'shipped':
      return 'In transit';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function isPaidLike(status: string): boolean {
  return status === 'pending' || status === 'pending_fulfillment';
}

export function allowedVendorTransitions(current: ProductOrderStatus): ProductOrderStatus[] {
  switch (current) {
    case 'pending_fulfillment':
      return ['processing', 'cancelled'];
    case 'processing':
      return ['shipped', 'cancelled'];
    case 'shipped':
      return ['delivered'];
    default:
      return [];
  }
}

export function canVendorTransition(from: ProductOrderStatus, to: ProductOrderStatus): boolean {
  return allowedVendorTransitions(from).includes(to);
}
