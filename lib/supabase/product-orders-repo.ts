import { createAdminClient } from '@/lib/supabase/admin';
import {
  canVendorTransition,
  parseProductOrderStatus,
  type ProductOrderStatus,
} from '@/lib/product-order-status';

export type ProductOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vendorId: string;
  category?: string;
};

export type ProductOrder = {
  id: string;
  checkoutId: string | null;
  customerId: string;
  items: ProductOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: ProductOrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  trackingNumber: string | null;
  carrier: string | null;
  notes: string | null;
  paidAt: Date | null;
  processingAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type OrderRow = {
  id: string;
  checkout_id: string | null;
  customer_id: string;
  status: string;
  subtotal_amount: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  delivery_address: string | null;
  notes: string | null;
  tracking_number: string | null;
  carrier: string | null;
  paid_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  vendor_id: string | null;
  product_name_snapshot: string;
  category_snapshot: string | null;
  quantity: number;
  unit_amount: number | string;
};

type CustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function money(value: number | string | null | undefined): number {
  return Math.round(Number(value) || 0);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asStatus(value: string): ProductOrderStatus {
  return parseProductOrderStatus(value) ?? 'pending_fulfillment';
}

function rowToItem(row: ItemRow): ProductOrderItem {
  return {
    id: row.id,
    productId: row.product_id ?? '',
    productName: row.product_name_snapshot || 'Item',
    quantity: Number(row.quantity) || 1,
    price: money(row.unit_amount),
    vendorId: row.vendor_id ?? '',
    category: row.category_snapshot ?? undefined,
  };
}

function assemble(
  order: OrderRow,
  items: ItemRow[],
  customer: CustomerRow | undefined,
): ProductOrder {
  return {
    id: order.id,
    checkoutId: order.checkout_id,
    customerId: order.customer_id,
    items: items.map(rowToItem),
    subtotal: money(order.subtotal_amount),
    tax: money(order.tax_amount),
    total: money(order.total_amount),
    status: asStatus(order.status),
    customerName: customer?.name?.trim() || 'Customer',
    customerEmail: customer?.email?.trim() || '',
    customerPhone: customer?.phone?.trim() || '',
    shippingAddress: order.delivery_address?.trim() || '',
    trackingNumber: order.tracking_number,
    carrier: order.carrier,
    notes: order.notes,
    paidAt: parseDate(order.paid_at),
    processingAt: parseDate(order.processing_at),
    shippedAt: parseDate(order.shipped_at),
    deliveredAt: parseDate(order.delivered_at),
    fulfilledAt: parseDate(order.fulfilled_at),
    cancelledAt: parseDate(order.cancelled_at),
    createdAt: parseDate(order.created_at) ?? new Date(),
    updatedAt: parseDate(order.updated_at) ?? new Date(),
  };
}

async function hydrateOrders(orderRows: OrderRow[]): Promise<ProductOrder[]> {
  if (orderRows.length === 0) return [];
  const supabase = createAdminClient();
  const orderIds = orderRows.map((row) => row.id);
  const customerIds = [...new Set(orderRows.map((row) => row.customer_id))];

  const [itemsRes, customersRes] = await Promise.all([
    supabase.from('product_order_items').select('*').in('order_id', orderIds),
    supabase.from('customers').select('id,name,email,phone').in('id', customerIds),
  ]);

  if (itemsRes.error) throw new Error(`Supabase list product order items failed: ${itemsRes.error.message}`);
  if (customersRes.error) throw new Error(`Supabase list order customers failed: ${customersRes.error.message}`);

  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const row of (itemsRes.data ?? []) as ItemRow[]) {
    const list = itemsByOrder.get(row.order_id) ?? [];
    list.push(row);
    itemsByOrder.set(row.order_id, list);
  }

  const customerById = new Map<string, CustomerRow>();
  for (const row of (customersRes.data ?? []) as CustomerRow[]) {
    customerById.set(row.id, row);
  }

  return orderRows.map((row) => assemble(row, itemsByOrder.get(row.id) ?? [], customerById.get(row.customer_id)));
}

const ORDER_SELECT =
  'id, checkout_id, customer_id, status, subtotal_amount, tax_amount, total_amount, delivery_address, notes, tracking_number, carrier, paid_at, processing_at, shipped_at, delivered_at, fulfilled_at, cancelled_at, created_at, updated_at';

export async function listAllProductOrders(): Promise<ProductOrder[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('product_orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Supabase list product orders failed: ${error.message}`);
  return hydrateOrders((data ?? []) as OrderRow[]);
}

export async function listProductOrdersByCustomerId(customerId: string): Promise<ProductOrder[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('product_orders')
    .select(ORDER_SELECT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Supabase list buyer product orders failed: ${error.message}`);
  return hydrateOrders((data ?? []) as OrderRow[]);
}

export async function listProductOrdersByCustomerEmail(email: string): Promise<ProductOrder[]> {
  const lookup = email.trim().toLowerCase();
  if (!lookup) return [];
  const supabase = createAdminClient();
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .ilike('email', lookup)
    .maybeSingle();
  if (customerError) throw new Error(`Supabase lookup customer email failed: ${customerError.message}`);
  if (!customer?.id) return [];
  return listProductOrdersByCustomerId(String(customer.id));
}

export async function listProductOrdersByVendorId(vendorId: string): Promise<ProductOrder[]> {
  const supabase = createAdminClient();
  const { data: itemRows, error: itemsError } = await supabase
    .from('product_order_items')
    .select('order_id')
    .eq('vendor_id', vendorId);
  if (itemsError) throw new Error(`Supabase list vendor order items failed: ${itemsError.message}`);
  const orderIds = [...new Set((itemRows ?? []).map((row) => String(row.order_id)).filter(Boolean))];
  if (orderIds.length === 0) return [];

  const { data, error } = await supabase
    .from('product_orders')
    .select(ORDER_SELECT)
    .in('id', orderIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Supabase list vendor product orders failed: ${error.message}`);
  return hydrateOrders((data ?? []) as OrderRow[]);
}

export async function getProductOrderById(id: string): Promise<ProductOrder | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('product_orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Supabase get product order failed: ${error.message}`);
  if (!data) return null;
  const [order] = await hydrateOrders([data as OrderRow]);
  return order ?? null;
}

export async function getProductOrderByCheckoutId(checkoutId: string): Promise<ProductOrder | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('product_orders')
    .select(ORDER_SELECT)
    .eq('checkout_id', checkoutId)
    .maybeSingle();
  if (error) throw new Error(`Supabase get product order by checkout failed: ${error.message}`);
  if (!data) {
    const fallback = await getProductOrderById(`ord-${checkoutId}`);
    return fallback;
  }
  const [order] = await hydrateOrders([data as OrderRow]);
  return order ?? null;
}

export async function vendorOwnsOrderLine(orderId: string, vendorId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('product_order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('vendor_id', vendorId)
    .limit(1);
  if (error) throw new Error(`Supabase vendor order ownership failed: ${error.message}`);
  return Boolean(data && data.length > 0);
}

type StatusPatch = {
  status: ProductOrderStatus;
  trackingNumber?: string | null;
  carrier?: string | null;
  enforceTransition?: boolean;
};

export async function updateProductOrderStatus(
  id: string,
  patch: StatusPatch,
): Promise<ProductOrder | null> {
  const current = await getProductOrderById(id);
  if (!current) return null;

  if (patch.enforceTransition && !canVendorTransition(current.status, patch.status)) {
    throw new Error(`Cannot move this order from ${current.status} to ${patch.status}`);
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: patch.status,
    updated_at: now,
  };

  if (patch.status === 'processing' && !current.processingAt) update.processing_at = now;
  if (patch.status === 'shipped') {
    if (!current.shippedAt) update.shipped_at = now;
    if (patch.trackingNumber !== undefined) update.tracking_number = patch.trackingNumber?.trim() || null;
    if (patch.carrier !== undefined) update.carrier = patch.carrier?.trim() || null;
  }
  if (patch.status === 'delivered') {
    if (!current.deliveredAt) update.delivered_at = now;
    update.fulfilled_at = current.fulfilledAt?.toISOString() ?? now;
  }
  if (patch.status === 'cancelled' || patch.status === 'refunded') {
    update.cancelled_at = current.cancelledAt?.toISOString() ?? now;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('product_orders').update(update).eq('id', id).select(ORDER_SELECT).maybeSingle();
  if (error) throw new Error(`Supabase update product order failed: ${error.message}`);
  if (!data) return null;
  const [order] = await hydrateOrders([data as OrderRow]);
  return order ?? null;
}
