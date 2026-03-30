// Data layer for MyGarage — products, customers, vendors, promotions, and ad applications are stored in Supabase; orders remain in-memory until migrated.
import * as productsRepo from "@/lib/supabase/products-repo";
import * as customersRepo from "@/lib/supabase/customers-repo";
import * as vendorsRepo from "@/lib/supabase/vendors-repo";
import * as promotionsRepo from "@/lib/supabase/promotions-repo";
import * as adApplicationsRepo from "@/lib/supabase/ad-applications-repo";
import * as buyerAddressesRepo from "@/lib/supabase/buyer-addresses-repo";
import * as buyerWishlistRepo from "@/lib/supabase/buyer-wishlist-repo";
import * as buyerSupportTicketsRepo from "@/lib/supabase/buyer-support-tickets-repo";
import * as buyerServicesRepo from "@/lib/supabase/buyer-services-repo";
import * as recommendationsRepo from "@/lib/supabase/recommendations-repo";

/** One value within a variant axis (e.g. “4L”). */
export type ProductVariantOptionValue = {
  id: string;
  label: string;
};

/** A variant dimension: name + list of mutually exclusive values (e.g. “Volume” → 1L, 4L). */
export type ProductVariantOption = {
  id: string;
  name: string;
  values: ProductVariantOptionValue[];
};

/**
 * One sellable SKU. Use either:
 * - `variantOptions` empty: `label` is free text (single dropdown of finished choices).
 * - `variantOptions` non-empty: `selections` maps each option id → value id; `label` is a display summary.
 */
export type ProductVariant = {
  id: string;
  label: string;
  selections: Record<string, string>;
  price: number;
};

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images: string[];
  featured: boolean;
  featuredRequestPending: boolean;
  published: boolean;
  category: string;
  subcategory: string;
  brand: string;
  sku: string;
  slug: string;
  tags: string[];
  weightKg: number | null;
  /** Named axes (size, volume, …). Empty = variants are flat `label`-only rows. */
  variantOptions: ProductVariantOption[];
  /** When non-empty, buyers pick one variant; prices are per variant. */
  variants: ProductVariant[];
  vendorId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload for creating a product; extended catalog fields are optional and get DB defaults. */
export type ProductInsert = Required<Pick<Product, "name" | "description" | "price" | "vendorId">> &
  Partial<
    Omit<Product, "id" | "createdAt" | "updatedAt" | "name" | "description" | "price" | "vendorId">
  > & { id?: string };

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  vendorId: string;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  lastRestocked: Date;
  warehouseLocation: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
}

export type CustomerInsert = Omit<Customer, "id" | "createdAt"> & { id?: string };

export interface Promotion {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  validFrom: Date;
  validUntil: Date;
  active: boolean;
}

export interface PromoCarouselItem {
  id: string;
  productId: string;
  bannerUrl: string;
  sortOrder: number;
  source: "admin" | "vendor_application";
  adApplicationId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdApplication {
  id: string;
  vendorId: string;
  scope: 'single' | 'all';
  productId?: string;
  productName?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  totalProducts: number;
  /** Keywords this provider serves; empty = generalist (eligible for all dispatch categories). */
  serviceOfferings: string[];
  createdAt: Date;
}

export type VendorInsert = Omit<Vendor, "id" | "createdAt"> & { id?: string };

export type PayoutFrequency = "instant" | "daily" | "weekly" | "biweekly" | "monthly";

export interface VendorPayoutPreference {
  vendorId: string;
  payoutMethod: "mobile_money" | "bank_account";
  payoutAccountName: string;
  payoutAccountNumber: string;
  network: string;
  currency: "UGX";
  frequency: PayoutFrequency;
  minimumPayoutAmount: number;
  autoDisburseEnabled: boolean;
  nextPayoutDate: Date | null;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  checkoutType: "product" | "service";
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: "UGX";
  provider: "paytota";
  providerReference: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  createdAt: Date;
  paidAt?: Date;
}

export interface DisbursementRecord {
  id: string;
  vendorId: string;
  vendorName: string;
  sourceType: "product_checkout" | "service_payment";
  sourceReference: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: "UGX";
  status: "pending_approval" | "approved" | "processing" | "paid" | "failed" | "rejected" | "reversed";
  payoutReference?: string;
  scheduledFor?: Date;
  paidOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BuyerAddress = buyerAddressesRepo.BuyerAddress;
export type BuyerWishlistItem = buyerWishlistRepo.BuyerWishlistItem;
export type BuyerSupportTicket = buyerSupportTicketsRepo.BuyerSupportTicket;
export type BuyerServiceRequest = buyerServicesRepo.BuyerServiceRequest;
export type BuyerProviderRating = buyerServicesRepo.BuyerProviderRating;
export type RecommendedProduct = recommendationsRepo.RecommendedProduct;

const DEFAULT_TAX_RATE = 0.08;

const mockOrders: Order[] = [
  {
    id: '1',
    customerId: '1',
    items: [
      { id: '1', productId: '1', productName: 'Premium Oil Filter', quantity: 2, price: 12.99, vendorId: '1' },
      { id: '2', productId: '2', productName: 'Brake Pads Set', quantity: 1, price: 45.99, vendorId: '2' },
    ],
    subtotal: 71.97,
    tax: 5.76,
    total: 77.73,
    status: 'delivered',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    shippingAddress: '123 Main St, Anytown',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-25'),
  },
  {
    id: '2',
    customerId: '2',
    items: [
      { id: '1', productId: '6', productName: 'Car Battery 12V 100Ah', quantity: 1, price: 129.99, vendorId: '2' },
    ],
    subtotal: 129.99,
    tax: 10.40,
    total: 140.39,
    status: 'shipped',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah@example.com',
    shippingAddress: '456 Oak Ave, Somewhere',
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2024-03-18'),
  },
];

// In-memory storage for non-migrated entities
let orders = [...mockOrders];

let paymentRecords: PaymentRecord[] = [
  {
    id: "pay-1001",
    checkoutType: "product",
    customerId: "1",
    customerName: "John Smith",
    vendorId: "1",
    vendorName: "FilterPro Inc",
    amount: 25.98,
    currency: "UGX",
    provider: "paytota",
    providerReference: "PT-REF-1001",
    status: "succeeded",
    createdAt: new Date("2026-03-20T08:10:00Z"),
    paidAt: new Date("2026-03-20T08:12:00Z"),
  },
  {
    id: "pay-1002",
    checkoutType: "product",
    customerId: "2",
    customerName: "Sarah Johnson",
    vendorId: "2",
    vendorName: "BrakeMaster Corp",
    amount: 129.99,
    currency: "UGX",
    provider: "paytota",
    providerReference: "PT-REF-1002",
    status: "processing",
    createdAt: new Date("2026-03-22T10:30:00Z"),
  },
  {
    id: "pay-2001",
    checkoutType: "service",
    customerId: "3",
    customerName: "Mike Wilson",
    vendorId: "2",
    vendorName: "BrakeMaster Corp",
    amount: 85000,
    currency: "UGX",
    provider: "paytota",
    providerReference: "PT-SVC-2001",
    status: "succeeded",
    createdAt: new Date("2026-03-23T07:40:00Z"),
    paidAt: new Date("2026-03-23T07:45:00Z"),
  },
];

let disbursementRecords: DisbursementRecord[] = [
  {
    id: "disb-3001",
    vendorId: "1",
    vendorName: "FilterPro Inc",
    sourceType: "product_checkout",
    sourceReference: "ord-1",
    grossAmount: 25.98,
    feeAmount: 1.30,
    netAmount: 24.68,
    currency: "UGX",
    status: "pending_approval",
    createdAt: new Date("2026-03-20T09:00:00Z"),
    updatedAt: new Date("2026-03-20T09:00:00Z"),
  },
  {
    id: "disb-3002",
    vendorId: "2",
    vendorName: "BrakeMaster Corp",
    sourceType: "service_payment",
    sourceReference: "srv-44",
    grossAmount: 85000,
    feeAmount: 4250,
    netAmount: 80750,
    currency: "UGX",
    status: "processing",
    payoutReference: "PT-DISB-3002",
    scheduledFor: new Date("2026-03-25T09:00:00Z"),
    createdAt: new Date("2026-03-23T10:00:00Z"),
    updatedAt: new Date("2026-03-24T08:00:00Z"),
  },
];

let payoutPreferences: VendorPayoutPreference[] = [
  {
    vendorId: "1",
    payoutMethod: "mobile_money",
    payoutAccountName: "FilterPro Finance",
    payoutAccountNumber: "256772000111",
    network: "MTN",
    currency: "UGX",
    frequency: "weekly",
    minimumPayoutAmount: 50000,
    autoDisburseEnabled: true,
    nextPayoutDate: new Date("2026-03-28T08:00:00Z"),
    updatedAt: new Date("2026-03-24T08:30:00Z"),
  },
  {
    vendorId: "2",
    payoutMethod: "bank_account",
    payoutAccountName: "BrakeMaster Ops",
    payoutAccountNumber: "010120003453",
    network: "Stanbic",
    currency: "UGX",
    frequency: "daily",
    minimumPayoutAmount: 25000,
    autoDisburseEnabled: false,
    nextPayoutDate: new Date("2026-03-25T08:00:00Z"),
    updatedAt: new Date("2026-03-24T09:00:00Z"),
  },
];

// Product operations (Supabase)
export const getProducts = async () => productsRepo.listProducts();
export const getProductsByCategories = async (categories: string[]) =>
  productsRepo.listProductsByCategories(categories);
export const getHomeFeed = async (
  customerId?: string,
  limit = 80,
  options?: { forceRefresh?: boolean },
) => recommendationsRepo.listRecommendedHomeFeed(customerId, limit, options);
export const refreshHomeFeedsForAllCustomers = async (limit = 120) =>
  recommendationsRepo.refreshAllCustomerHomeFeeds(limit);

export const getProduct = async (id: string) => {
  const product = await productsRepo.getProductById(id);
  return product;
};

export const createProduct = async (product: ProductInsert) => {
  return productsRepo.insertProduct({
    ...product,
    featured: product.featured ?? false,
    featuredRequestPending: product.featuredRequestPending ?? false,
  });
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const existing = await productsRepo.getProductById(id);
  if (!existing) return null;

  const nextUpdates: Partial<Product> = { ...updates };
  if (typeof updates.featured === 'boolean') {
    nextUpdates.featuredRequestPending = updates.featured
      ? false
      : existing.featuredRequestPending;
  }

  return productsRepo.updateProductById(id, nextUpdates);
};

export const deleteProduct = async (id: string) => productsRepo.deleteProductById(id);

// Order operations
export const getOrders = async () => orders;
export const getOrder = async (id: string) => orders.find(o => o.id === id);
export const createOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
  const newOrder: Order = {
    ...order,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  orders.push(newOrder);
  return newOrder;
};

export const updateOrder = async (id: string, updates: Partial<Order>) => {
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...updates, updatedAt: new Date() };
  return orders[index];
};

// Customer operations
export const getCustomers = async () => customersRepo.listCustomers();
export const getCustomer = async (id: string) => customersRepo.getCustomerById(id);
export const createCustomer = async (customer: CustomerInsert) => customersRepo.insertCustomer(customer);
export const updateCustomer = async (id: string, updates: Partial<Customer>) => {
  return customersRepo.updateCustomerById(id, updates);
};

export const getCustomerByEmail = async (email: string) => {
  const all = await customersRepo.listCustomers();
  const lookup = email.trim().toLowerCase();
  return all.find((c) => c.email.toLowerCase() === lookup);
};

// Promotion operations
export const getPromotions = async () => promotionsRepo.listPromotions();
export const getPromotion = async (id: string) => promotionsRepo.getPromotionById(id);
export const createPromotion = async (promotion: Omit<Promotion, 'id'>) => {
  return promotionsRepo.insertPromotion(promotion);
};
export const updatePromotion = async (id: string, updates: Partial<Promotion>) => {
  return promotionsRepo.updatePromotionById(id, updates);
};
export const deletePromotion = async (id: string) => promotionsRepo.deletePromotionById(id);

// Promo carousel operations
export const getPromoCarouselItems = async () => promotionsRepo.listPromoCarouselItems();
export const createPromoCarouselItem = async (
  payload: Omit<PromoCarouselItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
) => promotionsRepo.insertPromoCarouselItem(payload);
export const updatePromoCarouselItem = async (id: string, updates: Partial<PromoCarouselItem>) =>
  promotionsRepo.updatePromoCarouselItemById(id, updates);
export const deletePromoCarouselItem = async (id: string) => promotionsRepo.deletePromoCarouselItemById(id);

// Ad application operations
export const getAdApplications = async () => adApplicationsRepo.listAdApplications();
export const getAdApplication = async (id: string) => adApplicationsRepo.getAdApplicationById(id);
export const createAdApplication = async (
  application: Omit<AdApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'>
) => {
  return adApplicationsRepo.insertAdApplication(application);
};

export const updateAdApplication = async (id: string, updates: Partial<AdApplication>) => {
  return adApplicationsRepo.updateAdApplicationById(id, updates);
};

// Buyer addresses
export const getBuyerAddresses = async (customerId: string) => buyerAddressesRepo.listBuyerAddresses(customerId);
export const createBuyerAddress = async (payload: buyerAddressesRepo.BuyerAddressInsert) => {
  return buyerAddressesRepo.insertBuyerAddress(payload);
};
export const updateBuyerAddress = async (id: string, updates: Partial<BuyerAddress>) => {
  return buyerAddressesRepo.updateBuyerAddressById(id, updates);
};
export const deleteBuyerAddress = async (id: string) => buyerAddressesRepo.deleteBuyerAddressById(id);

// Buyer wishlist
export const getBuyerWishlistItems = async (customerId: string) => buyerWishlistRepo.listBuyerWishlistItems(customerId);
export const createBuyerWishlistItem = async (payload: buyerWishlistRepo.BuyerWishlistInsert) => {
  return buyerWishlistRepo.insertBuyerWishlistItem(payload);
};
export const deleteBuyerWishlistItem = async (id: string) => buyerWishlistRepo.deleteBuyerWishlistItemById(id);

// Buyer support tickets
export const getBuyerSupportTickets = async (customerId: string) => buyerSupportTicketsRepo.listBuyerSupportTickets(customerId);
export const createBuyerSupportTicket = async (payload: buyerSupportTicketsRepo.BuyerSupportTicketInsert) => {
  return buyerSupportTicketsRepo.insertBuyerSupportTicket(payload);
};

// Buyer services
export const getBuyerServiceRequests = async (customerId: string) => buyerServicesRepo.listBuyerServiceRequests(customerId);
export const getBuyerServiceRequestForCustomer = async (id: string, customerId: string) =>
  buyerServicesRepo.getBuyerServiceRequestByIdForCustomer(id, customerId);
export const getAllBuyerServiceRequests = async () => buyerServicesRepo.listAllBuyerServiceRequests();
export const createBuyerServiceRequest = async (payload: buyerServicesRepo.BuyerServiceRequestInsert) => {
  return buyerServicesRepo.insertBuyerServiceRequest(payload);
};
export const updateBuyerServiceRequestStatus = async (id: string, status: buyerServicesRepo.BuyerServiceRequest["status"]) => {
  return buyerServicesRepo.updateBuyerServiceRequestStatusById(id, status);
};
export const getBuyerServiceRequestById = async (id: string) => buyerServicesRepo.getBuyerServiceRequestById(id);
export const updateBuyerServiceRequestProviderLocation = async (id: string, lat: number, lng: number) =>
  buyerServicesRepo.updateBuyerServiceRequestProviderLocation(id, lat, lng);
export const updateBuyerServiceRequestDestinationCoords = async (id: string, lat: number, lng: number) =>
  buyerServicesRepo.updateBuyerServiceRequestDestinationCoords(id, lat, lng);
export const vendorAcceptServiceRequest = async (id: string, providerId: string) =>
  buyerServicesRepo.vendorAcceptServiceRequest(id, providerId);
export const assignProviderToUnassignedServiceRequest = async (id: string, providerId: string) =>
  buyerServicesRepo.assignProviderToUnassignedServiceRequest(id, providerId);
export const getBuyerProviderRatings = async (customerId: string) => buyerServicesRepo.listBuyerProviderRatings(customerId);
export const upsertBuyerProviderRating = async (payload: buyerServicesRepo.BuyerProviderRatingUpsert) => {
  return buyerServicesRepo.upsertBuyerProviderRating(payload);
};

// Vendor operations
export const getVendors = async () => {
  const allVendors = await vendorsRepo.listVendors();
  const allProducts = await productsRepo.listProducts();
  return allVendors.map((vendor) => ({
    ...vendor,
    totalProducts: allProducts.filter((product) => product.vendorId === vendor.id).length,
  }));
};

export const getVendor = async (id: string) => {
  const vendor = await vendorsRepo.getVendorById(id);
  if (!vendor) return undefined;

  const allProducts = await productsRepo.listProducts();
  return {
    ...vendor,
    totalProducts: allProducts.filter((product) => product.vendorId === vendor.id).length,
  };
};
export const createVendor = async (vendor: VendorInsert) => {
  const newVendor = await vendorsRepo.insertVendor({
    ...vendor,
    totalProducts: 0,
    serviceOfferings: vendor.serviceOfferings ?? [],
  });
  return newVendor;
};

export const updateVendor = async (id: string, updates: Partial<Vendor>) => {
  return vendorsRepo.updateVendorById(id, updates);
};

export const deleteVendor = async (id: string) => {
  // 1. Delete products + their storage images (must happen before vendor row is removed
  //    so we can still query products by vendor_id).
  await productsRepo.deleteProductsByVendorId(id);

  // 2. Delete orphaned rows in tables that have no FK to vendors — Postgres cannot
  //    cascade these automatically, so we handle them explicitly.
  await vendorsRepo.deleteVendorAdApplications(id);
  await vendorsRepo.deleteVendorProviderRatings(id);

  // 3. Delete the vendor row. Postgres FK cascades fire here and remove:
  //    vendor_payout_accounts, admin_disbursements, product_vendor_settlements,
  //    service_request_assignments, service_request_quotes, service_provider_payouts.
  //    Columns with ON DELETE SET NULL (checkout_line_items, paytota_transactions,
  //    product_order_items, refund_requests, buyer_service_requests, service_payments)
  //    are nulled automatically.
  const deleted = await vendorsRepo.deleteVendorById(id);
  if (!deleted) return false;

  // 4. Delete the Supabase Auth account last — after all DB rows are gone — so the
  //    vendor can no longer sign in.
  await vendorsRepo.deleteVendorAuthUser(id);

  // 5. Clean up in-memory order cache (mock data layer).
  orders = orders
    .map((order) => {
      const filteredItems = order.items.filter((item) => item.vendorId !== id);
      if (filteredItems.length === 0) return null;

      const subtotal = filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = Number((subtotal * DEFAULT_TAX_RATE).toFixed(0));
      const total = Number((subtotal + tax).toFixed(0));

      return {
        ...order,
        items: filteredItems,
        subtotal,
        tax,
        total,
        updatedAt: new Date(),
      };
    })
    .filter((order): order is Order => order !== null);

  return true;
};

// Vendor-specific queries
export const getVendorProducts = async (vendorId: string) => {
  return productsRepo.listProductsByVendor(vendorId);
};

export const getVendorOrders = async (vendorId: string) => {
  return orders.filter(order => 
    order.items.some(item => item.vendorId === vendorId)
  );
};

export const getVendorAnalytics = async (vendorId: string) => {
  const vendorProducts = await productsRepo.listProductsByVendor(vendorId);
  const vendorOrders = orders.filter(order => 
    order.items.some(item => item.vendorId === vendorId)
  );

  const totalRevenue = vendorOrders.reduce((sum, order) => {
    const vendorOrderValue = order.items
      .filter(item => item.vendorId === vendorId)
      .reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    return sum + vendorOrderValue;
  }, 0);

  const totalOrders = vendorOrders.length;
  const totalProducts = vendorProducts.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const now = new Date();
  const monthlyBuckets = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
      orders: 0,
    };
  });

  vendorOrders.forEach((order) => {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = monthlyBuckets.find((item) => item.key === key);
    if (!bucket) return;
    const orderRevenue = order.items
      .filter((item) => item.vendorId === vendorId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
    bucket.revenue += orderRevenue;
    bucket.orders += 1;
  });

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    averageOrderValue,
    revenueTrend: monthlyBuckets.map((bucket) => ({ label: bucket.label, revenue: Number(bucket.revenue.toFixed(0)) })),
    orderTrend: monthlyBuckets.map((bucket) => ({ label: bucket.label, orders: bucket.orders })),
    topProducts: vendorProducts
      .map(p => ({
        ...p,
        sales: vendorOrders.reduce((sum, order) => {
          const item = order.items.find(i => i.productId === p.id);
          return sum + (item?.quantity || 0);
        }, 0),
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5),
    ordersByStatus: {
      pending: vendorOrders.filter(o => o.status === 'pending').length,
      processing: vendorOrders.filter(o => o.status === 'processing').length,
      shipped: vendorOrders.filter(o => o.status === 'shipped').length,
      delivered: vendorOrders.filter(o => o.status === 'delivered').length,
      cancelled: vendorOrders.filter(o => o.status === 'cancelled').length,
    },
  };
};

// Payments and disbursements
export const getPaymentRecords = async () => paymentRecords;
export const getDisbursementRecords = async () => disbursementRecords;

export const updateDisbursementStatus = async (
  id: string,
  status: DisbursementRecord["status"],
  payoutReference?: string,
) => {
  const idx = disbursementRecords.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  const now = new Date();
  const current = disbursementRecords[idx];
  disbursementRecords[idx] = {
    ...current,
    status,
    payoutReference: payoutReference ?? current.payoutReference,
    paidOutAt: status === "paid" ? now : current.paidOutAt,
    updatedAt: now,
  };
  return disbursementRecords[idx];
};

export const scheduleDisbursement = async (id: string, scheduledFor: Date) => {
  const idx = disbursementRecords.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  disbursementRecords[idx] = {
    ...disbursementRecords[idx],
    scheduledFor,
    updatedAt: new Date(),
  };
  return disbursementRecords[idx];
};

export const getPayoutPreference = async (vendorId: string) => {
  return payoutPreferences.find((p) => p.vendorId === vendorId) ?? null;
};

export const upsertPayoutPreference = async (
  vendorId: string,
  payload: Omit<VendorPayoutPreference, "vendorId" | "updatedAt">,
) => {
  const next: VendorPayoutPreference = {
    vendorId,
    ...payload,
    nextPayoutDate: payload.nextPayoutDate ? new Date(payload.nextPayoutDate) : null,
    updatedAt: new Date(),
  };
  const idx = payoutPreferences.findIndex((p) => p.vendorId === vendorId);
  if (idx === -1) {
    payoutPreferences.push(next);
    return next;
  }
  payoutPreferences[idx] = next;
  return next;
};

export const getVendorFunds = async (vendorId: string) => {
  const vendor = await vendorsRepo.getVendorById(vendorId);
  const vendorOrders = orders.filter((order) =>
    order.items.some((item) => item.vendorId === vendorId),
  );

  const productGross = vendorOrders.reduce((sum, order) => {
    const subtotal = order.items
      .filter((item) => item.vendorId === vendorId)
      .reduce((acc, item) => acc + item.price * item.quantity, 0);
    return sum + subtotal;
  }, 0);

  const vendorPayments = paymentRecords.filter((p) => p.vendorId === vendorId);
  const serviceGross = vendorPayments
    .filter((p) => p.checkoutType === "service" && p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalGross = productGross + serviceGross;
  const estimatedFees = totalGross * 0.05;
  const netEarnings = totalGross - estimatedFees;

  const vendorDisbursements = disbursementRecords.filter((d) => d.vendorId === vendorId);
  const paidOut = vendorDisbursements
    .filter((d) => d.status === "paid")
    .reduce((sum, d) => sum + d.netAmount, 0);
  const pendingDisbursement = vendorDisbursements
    .filter((d) => ["pending_approval", "approved", "processing"].includes(d.status))
    .reduce((sum, d) => sum + d.netAmount, 0);

  const availableBalance = Math.max(0, netEarnings - paidOut - pendingDisbursement);
  const preference = await getPayoutPreference(vendorId);

  return {
    vendorId,
    vendorName: vendor?.name ?? "Vendor",
    summary: {
      productGross,
      serviceGross,
      totalGross,
      estimatedFees,
      netEarnings,
      paidOut,
      pendingDisbursement,
      availableBalance,
    },
    paymentHistory: vendorPayments,
    disbursements: vendorDisbursements,
    preference,
  };
};

// Analytics
export const getAnalytics = async () => {
  const products = await productsRepo.listProducts();
  const customers = await customersRepo.listCustomers();
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const totalCustomers = customers.length;
  const totalProducts = products.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const now = new Date();
  const monthlyBuckets = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
      orders: 0,
    };
  });

  orders.forEach((order) => {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = monthlyBuckets.find((item) => item.key === key);
    if (!bucket) return;
    bucket.revenue += order.total;
    bucket.orders += 1;
  });

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    averageOrderValue,
    revenueTrend: monthlyBuckets.map((bucket) => ({ label: bucket.label, revenue: Number(bucket.revenue.toFixed(0)) })),
    orderTrend: monthlyBuckets.map((bucket) => ({ label: bucket.label, orders: bucket.orders })),
    ordersByStatus: {
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    },
    topProducts: products
      .map(p => ({
        ...p,
        sales: orders.reduce((sum, order) => {
          const item = order.items.find(i => i.productId === p.id);
          return sum + (item?.quantity || 0);
        }, 0),
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5),
  };
};
