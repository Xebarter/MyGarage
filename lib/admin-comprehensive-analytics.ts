import type { Customer, Order, OrderItem, Product, Vendor } from "@/lib/db";
import type { BuyerServiceRequest } from "@/lib/supabase/buyer-services-repo";
import type { BuyerSupportTicket } from "@/lib/supabase/buyer-support-tickets-repo";
import {
  getDisbursementRecords,
  getOrders,
  getPaymentRecords,
} from "@/lib/db";
import * as buyerServicesRepo from "@/lib/supabase/buyer-services-repo";
import * as buyerSupportTicketsRepo from "@/lib/supabase/buyer-support-tickets-repo";
import * as customersRepo from "@/lib/supabase/customers-repo";
import * as productsRepo from "@/lib/supabase/products-repo";
import * as promotionsRepo from "@/lib/supabase/promotions-repo";
import { createAdminClient } from "@/lib/supabase/admin";
import * as vendorsRepo from "@/lib/supabase/vendors-repo";

export type AdminAnalyticsFilters = {
  from: Date;
  to: Date;
  vendorId?: string;
  productCategory?: string;
  serviceCategory?: string;
};

export type AdminComprehensiveAnalytics = {
  meta: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    generatedAt: string;
    dataNotes: string[];
  };
  filters: {
    vendorId?: string;
    productCategory?: string;
    serviceCategory?: string;
  };
  overview: {
    revenueTotal: number;
    revenuePreviousPeriod: number;
    revenueMomPct: number | null;
    revenueYoyPct: number | null;
    productOrderRevenue: number;
    serviceRevenue: number;
    productOrdersCount: number;
    servicePaymentsCount: number;
    grossProfitEstimate: number;
    netProfitEstimate: number;
    platformCommissionEstimate: number;
    activeBuyers: number;
    activeVendors: number;
    activeServiceProviders: number;
    conversionRate: number | null;
    conversionNote: string;
    averageOrderValue: number;
    payingCustomersCount: number;
  };
  sales: {
    revenueByCategory: { name: string; revenue: number }[];
    revenueByVendor: { vendorId: string; vendorName: string; revenue: number }[];
    topProducts: { id: string; name: string; revenue: number; units: number }[];
    topServices: { name: string; bookings: number; revenue: number }[];
    seasonalByMonth: { month: string; revenue: number }[];
    paymentMethodPerformance: { method: string; count: number; amount: number; successRate: number }[];
    revenueByLocation: { region: string; revenue: number; orders: number }[];
  };
  inventory: {
    fastMovers: { id: string; name: string; units: number; revenue: number }[];
    slowMovers: { id: string; name: string; units: number; revenue: number }[];
    deadStockCandidates: { id: string; name: string; category: string }[];
    pricingInsights: { id: string; name: string; price: number; compareAt: number | null; discountPct: number | null }[];
    stockNote: string;
  };
  services: {
    bookingsByCategory: { category: string; count: number }[];
    bookingsByService: { service: string; count: number }[];
    completionRate: number;
    cancellationRate: number;
    avgCompletionMinutes: number | null;
    ratingsByProvider: { providerId: string; avgStars: number; count: number }[];
    revenueByProvider: { providerId: string; revenue: number; payments: number }[];
  };
  customers: {
    newInPeriod: number;
    returningInPeriod: number;
    avgClv: number;
    medianClv: number;
    cacNote: string;
    funnel: { stage: string; count: number; pctOfPrior: number | null }[];
    retentionRateApprox: number | null;
    churnRateApprox: number | null;
  };
  vendors: {
    leaderboard: { vendorId: string; name: string; revenue: number; orders: number; fulfillmentRate: number }[];
    avgRating: number;
    churnRiskCount: number;
  };
  orders: {
    total: number;
    successPaymentRate: number;
    failurePaymentRate: number;
    avgProcessingHours: number | null;
    statusMix: Record<string, number>;
  };
  marketing: {
    trafficNote: string;
    campaigns: { code: string; uses: number; maxUses: number; discountType: string; active: boolean }[];
    cpaNote: string;
    searchTermsNote: string;
    proxyMostViewed: { id: string; name: string; score: number }[];
  };
  finance: {
    platformFeesFromDisbursements: number;
    payoutsPending: number;
    payoutsPaid: number;
    outstandingVendorBalanceEstimate: number;
    marginByCategory: { category: string; marginPct: number; revenue: number }[];
    taxNote: string;
  };
  operations: {
    supportTicketsOpen: number;
    supportTicketsResolved: number;
    avgResolutionHours: number | null;
    failedTransactions: number;
    succeededTransactions: number;
    commonTicketSubjects: { subject: string; count: number }[];
  };
  predictive: {
    revenueForecastNext30d: number;
    restockSuggestions: { productId: string; name: string; reason: string }[];
    priceOptimizationHints: { productId: string; name: string; hint: string }[];
    demandTrendLabel: string;
  };
  alerts: {
    severity: "info" | "warning" | "critical";
    title: string;
    detail: string;
  }[];
  heatmapWeekday: { weekday: string; productOrders: number; serviceBookings: number }[];
  paytotaRowCount: number;
  filterOptions: {
    vendors: { id: string; name: string }[];
    productCategories: string[];
    serviceCategories: string[];
  };
};

const MS_DAY = 86400000;
const ESTIMATED_GROSS_MARGIN = 0.36;
const DEFAULT_PLATFORM_FEE_RATE = 0.05;

function noteOptionalLoadFailure(dataNotes: string[], label: string, err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err);
  dataNotes.push(`${label} could not be loaded: ${detail}`);
  console.warn(`[getComprehensiveAdminAnalytics] ${label}`, err);
}

function inRange(d: Date, from: Date, to: Date): boolean {
  const t = d.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function bucketPlatformCategory(category: string): string {
  const c = category.toLowerCase();
  if (/\bservice\b|roadside|towing|repair\s*on-?site/i.test(c)) return "Services";
  if (/equipment|tool|lift|compressor|diagnostic/i.test(c)) return "Equipment";
  if (/part|filter|oil|brake|battery|tire|tyre/i.test(c)) return "Spare parts";
  return category.trim() || "Uncategorized";
}

function regionFromAddress(address: string): string {
  const t = address.trim();
  if (!t) return "Unknown";
  const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || parts[0] || "Unknown";
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const len = to.getTime() - from.getTime() + 1;
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - len + 1);
  return { from: prevFrom, to: prevTo };
}

async function fetchPaytotaCollections(from: Date, to: Date) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("paytota_transactions")
      .select(
        "id,created_at,status,currency,amount,transaction_type,direction,checkout_id,service_payment_id,vendor_id,customer_id",
      )
      .eq("transaction_type", "collection")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) return { rows: [] as Record<string, unknown>[], error: error.message };
    return { rows: (data ?? []) as Record<string, unknown>[], error: null };
  } catch (e) {
    return { rows: [] as Record<string, unknown>[], error: String(e) };
  }
}

function orderItemMatchesFilters(
  item: OrderItem,
  product: Product | undefined,
  filters: AdminAnalyticsFilters,
): boolean {
  if (filters.vendorId && item.vendorId !== filters.vendorId) return false;
  if (filters.productCategory && product) {
    if (!product.category.toLowerCase().includes(filters.productCategory.toLowerCase())) return false;
  }
  return true;
}

function filterOrderForProductRevenue(
  order: Order,
  productById: Map<string, Product>,
  filters: AdminAnalyticsFilters,
): { revenue: number; items: OrderItem[] } {
  let revenue = 0;
  const items: OrderItem[] = [];
  for (const item of order.items) {
    const p = productById.get(item.productId);
    if (!orderItemMatchesFilters(item, p, filters)) continue;
    revenue += item.price * item.quantity;
    items.push(item);
  }
  return { revenue, items };
}

export async function getComprehensiveAdminAnalytics(
  filters: AdminAnalyticsFilters,
): Promise<AdminComprehensiveAnalytics> {
  const { from, to } = filters;
  const prev = previousPeriod(from, to);
  const dataNotes: string[] = [];

  const [
    products,
    customers,
    vendorsRaw,
    orders,
    serviceRequestsAll,
    paymentRecords,
    disbursements,
    supportTickets,
    providerRatings,
    promotions,
    paytotaCurrent,
    paytotaPrev,
  ] = await Promise.all([
    productsRepo.listProducts().catch((err) => {
      noteOptionalLoadFailure(dataNotes, "Product catalog", err);
      return [] as Product[];
    }),
    customersRepo.listCustomers().catch((err) => {
      noteOptionalLoadFailure(dataNotes, "Customers", err);
      return [] as Customer[];
    }),
    vendorsRepo.listVendors().catch((err) => {
      noteOptionalLoadFailure(dataNotes, "Vendors", err);
      return [] as Vendor[];
    }),
    getOrders(),
    buyerServicesRepo.listAllBuyerServiceRequests().catch((err) => {
      noteOptionalLoadFailure(dataNotes, "Service requests", err);
      return [] as BuyerServiceRequest[];
    }),
    getPaymentRecords(),
    getDisbursementRecords(),
    buyerSupportTicketsRepo.listAllBuyerSupportTickets().catch((err) => {
      noteOptionalLoadFailure(dataNotes, "Support tickets", err);
      return [] as BuyerSupportTicket[];
    }),
    buyerServicesRepo.listAllBuyerProviderRatings().catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : String(err);
      dataNotes.push(`Provider ratings could not be loaded: ${detail}`);
      console.warn("[getComprehensiveAdminAnalytics] listAllBuyerProviderRatings failed", err);
      return [];
    }),
    promotionsRepo.listPromotions().catch((err: unknown) => {
      const detail = err instanceof Error ? err.message : String(err);
      dataNotes.push(`Promotions could not be loaded: ${detail}`);
      console.warn("[getComprehensiveAdminAnalytics] listPromotions failed", err);
      return [];
    }),
    fetchPaytotaCollections(from, to),
    fetchPaytotaCollections(prev.from, prev.to),
  ]);

  if (paytotaCurrent.error) dataNotes.push(`Paytota collections unavailable: ${paytotaCurrent.error}`);
  if (paytotaPrev.error) dataNotes.push(`Paytota prior period unavailable: ${paytotaPrev.error}`);

  const vendors: Vendor[] = vendorsRaw.map((v) => ({
    ...v,
    totalProducts: products.filter((p) => p.vendorId === v.id).length,
  }));

  const productById = new Map(products.map((p) => [p.id, p]));

  const ordersInRange = orders.filter((o) => inRange(new Date(o.createdAt), from, to));
  const ordersPrev = orders.filter((o) => inRange(new Date(o.createdAt), prev.from, prev.to));

  let productOrderRevenue = 0;
  let productOrdersCount = 0;
  const revenueByCategoryMap = new Map<string, number>();
  const revenueByVendorMap = new Map<string, { name: string; revenue: number }>();
  const productUnitsMap = new Map<string, { name: string; units: number; revenue: number }>();
  const locationMap = new Map<string, { revenue: number; orders: number }>();

  for (const order of ordersInRange) {
    const { revenue, items } = filterOrderForProductRevenue(order, productById, filters);
    if (items.length === 0) continue;
    productOrderRevenue += revenue;
    productOrdersCount += 1;

    const region = regionFromAddress(order.shippingAddress);
    const loc = locationMap.get(region) ?? { revenue: 0, orders: 0 };
    loc.revenue += revenue;
    loc.orders += 1;
    locationMap.set(region, loc);

    for (const item of items) {
      const p = productById.get(item.productId);
      const cat = bucketPlatformCategory(p?.category ?? "");
      revenueByCategoryMap.set(cat, (revenueByCategoryMap.get(cat) ?? 0) + item.price * item.quantity);

      const vName = vendors.find((v) => v.id === item.vendorId)?.name ?? "Vendor";
      const ve = revenueByVendorMap.get(item.vendorId) ?? { name: vName, revenue: 0 };
      ve.revenue += item.price * item.quantity;
      revenueByVendorMap.set(item.vendorId, ve);

      const agg = productUnitsMap.get(item.productId) ?? {
        name: item.productName,
        units: 0,
        revenue: 0,
      };
      agg.units += item.quantity;
      agg.revenue += item.price * item.quantity;
      productUnitsMap.set(item.productId, agg);
    }
  }

  const paymentsInRange = paymentRecords.filter((p) => inRange(new Date(p.createdAt), from, to));
  let serviceRevenue = 0;
  let servicePaymentsCount = 0;
  let paytotaServiceAmount = 0;
  let paytotaServiceCount = 0;
  let paytotaFailed = 0;
  let paytotaSucceededTotal = 0;

  for (const row of paytotaCurrent.rows) {
    const status = String(row.status ?? "");
    const amount = Number(row.amount ?? 0);
    const created = row.created_at ? new Date(String(row.created_at)) : null;
    if (!created || !inRange(created, from, to)) continue;
    const vendorId = row.vendor_id ? String(row.vendor_id) : "";
    if (filters.vendorId && vendorId && vendorId !== filters.vendorId) continue;

    if (status === "failed" || status === "cancelled") {
      paytotaFailed += 1;
      continue;
    }
    const ok = status === "succeeded" || status === "processing";
    if (ok) paytotaSucceededTotal += 1;

    if (status === "succeeded" && row.service_payment_id) {
      paytotaServiceAmount += amount;
      paytotaServiceCount += 1;
    }
  }

  for (const p of paymentsInRange) {
    if (filters.vendorId && p.vendorId !== filters.vendorId) continue;
    if (p.checkoutType !== "service") continue;
    if (p.status !== "succeeded") continue;
    serviceRevenue += p.amount;
    servicePaymentsCount += 1;
  }

  if (paytotaServiceCount > 0) {
    serviceRevenue = paytotaServiceAmount;
    servicePaymentsCount = paytotaServiceCount;
  }

  const serviceRequests = serviceRequestsAll.filter((r) => inRange(new Date(r.createdAt), from, to));
  const serviceFiltered = filters.serviceCategory
    ? serviceRequests.filter((r) =>
        r.category.toLowerCase().includes(filters.serviceCategory!.toLowerCase()),
      )
    : serviceRequests;

  const bookingsByCategoryMap = new Map<string, number>();
  const bookingsByServiceMap = new Map<string, number>();
  for (const r of serviceFiltered) {
    bookingsByCategoryMap.set(r.category, (bookingsByCategoryMap.get(r.category) ?? 0) + 1);
    bookingsByServiceMap.set(r.service, (bookingsByServiceMap.get(r.service) ?? 0) + 1);
  }

  const completed = serviceFiltered.filter((r) => r.status === "completed").length;
  const cancelled = serviceFiltered.filter((r) => r.status === "cancelled").length;
  const denom = serviceFiltered.length || 1;
  const completionRate = completed / denom;
  const cancellationRate = cancelled / denom;

  const completionDurations: number[] = [];
  for (const r of serviceFiltered) {
    if (r.status !== "completed" || !r.startedAt || !r.completedAt) continue;
    completionDurations.push(
      (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 60000,
    );
  }
  const avgCompletionMinutes =
    completionDurations.length > 0
      ? completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length
      : null;

  const ratingsByProviderMap = new Map<string, { sum: number; count: number }>();
  for (const r of providerRatings) {
    const created = new Date(r.createdAt);
    if (!inRange(created, from, to)) continue;
    if (filters.vendorId && r.providerId !== filters.vendorId) continue;
    const agg = ratingsByProviderMap.get(r.providerId) ?? { sum: 0, count: 0 };
    agg.sum += r.stars;
    agg.count += 1;
    ratingsByProviderMap.set(r.providerId, agg);
  }

  const revenueByProviderMap = new Map<string, { revenue: number; payments: number }>();
  for (const p of paymentsInRange) {
    if (p.checkoutType !== "service" || p.status !== "succeeded") continue;
    if (filters.vendorId && p.vendorId !== filters.vendorId) continue;
    const agg = revenueByProviderMap.get(p.vendorId) ?? { revenue: 0, payments: 0 };
    agg.revenue += p.amount;
    agg.payments += 1;
    revenueByProviderMap.set(p.vendorId, agg);
  }

  const revenueTotal = productOrderRevenue + serviceRevenue;

  if (serviceRevenue > 0) {
    const k = "Services & roadside (payments)";
    revenueByCategoryMap.set(k, (revenueByCategoryMap.get(k) ?? 0) + serviceRevenue);
  }

  let productOrderRevenuePrev = 0;
  for (const order of ordersPrev) {
    const { revenue, items } = filterOrderForProductRevenue(order, productById, filters);
    if (items.length === 0) continue;
    productOrderRevenuePrev += revenue;
  }

  let serviceRevenuePrevFromMemory = 0;
  const paymentsPrev = paymentRecords.filter((p) => inRange(new Date(p.createdAt), prev.from, prev.to));
  for (const p of paymentsPrev) {
    if (filters.vendorId && p.vendorId !== filters.vendorId) continue;
    if (p.checkoutType === "service" && p.status === "succeeded") serviceRevenuePrevFromMemory += p.amount;
  }
  let serviceRevenuePrevPaytota = 0;
  for (const row of paytotaPrev.rows) {
    const status = String(row.status ?? "");
    if (status !== "succeeded") continue;
    if (!row.service_payment_id) continue;
    const vendorId = row.vendor_id ? String(row.vendor_id) : "";
    if (filters.vendorId && vendorId && vendorId !== filters.vendorId) continue;
    serviceRevenuePrevPaytota += Number(row.amount ?? 0);
  }
  const serviceRevenuePrev =
    serviceRevenuePrevPaytota > 0 ? serviceRevenuePrevPaytota : serviceRevenuePrevFromMemory;

  const revenuePreviousPeriod = productOrderRevenuePrev + serviceRevenuePrev;
  const revenueMomPct =
    revenuePreviousPeriod > 0
      ? ((revenueTotal - revenuePreviousPeriod) / revenuePreviousPeriod) * 100
      : null;

  const yearAgoFrom = new Date(from);
  yearAgoFrom.setFullYear(yearAgoFrom.getFullYear() - 1);
  const yearAgoTo = new Date(to);
  yearAgoTo.setFullYear(yearAgoTo.getFullYear() - 1);
  const paytotaYoy = await fetchPaytotaCollections(yearAgoFrom, yearAgoTo);
  let revenueYoyBase = 0;
  for (const order of orders) {
    const d = new Date(order.createdAt);
    if (!inRange(d, yearAgoFrom, yearAgoTo)) continue;
    const { revenue, items } = filterOrderForProductRevenue(order, productById, filters);
    if (items.length === 0) continue;
    revenueYoyBase += revenue;
  }
  for (const p of paymentRecords) {
    if (!inRange(new Date(p.createdAt), yearAgoFrom, yearAgoTo)) continue;
    if (filters.vendorId && p.vendorId !== filters.vendorId) continue;
    if (p.checkoutType === "service" && p.status === "succeeded") revenueYoyBase += p.amount;
  }
  for (const row of paytotaYoy.rows) {
    if (String(row.status) !== "succeeded") continue;
    if (!row.service_payment_id) continue;
    const vendorId = row.vendor_id ? String(row.vendor_id) : "";
    if (filters.vendorId && vendorId && vendorId !== filters.vendorId) continue;
    revenueYoyBase += Number(row.amount ?? 0);
  }
  const revenueYoyPct =
    revenueYoyBase > 0 ? ((revenueTotal - revenueYoyBase) / revenueYoyBase) * 100 : null;

  const feesInRange = disbursements.filter((d) => inRange(new Date(d.createdAt), from, to));
  const platformFeesFromDisbursements = feesInRange.reduce((s, d) => s + d.feeAmount, 0);
  const platformCommissionEstimate =
    platformFeesFromDisbursements > 0
      ? platformFeesFromDisbursements
      : revenueTotal * DEFAULT_PLATFORM_FEE_RATE;

  const grossProfitEstimate = revenueTotal * ESTIMATED_GROSS_MARGIN;
  const netProfitEstimate = grossProfitEstimate - platformCommissionEstimate;

  const payingCustomerIds = new Set<string>();
  for (const o of ordersInRange) {
    const { items } = filterOrderForProductRevenue(o, productById, filters);
    if (items.length > 0) payingCustomerIds.add(o.customerId);
  }
  for (const p of paymentsInRange) {
    if (p.status === "succeeded") payingCustomerIds.add(p.customerId);
  }

  const vendorIdsWithSales = new Set<string>();
  for (const o of ordersInRange) {
    for (const i of o.items) {
      if (!orderItemMatchesFilters(i, productById.get(i.productId), filters)) continue;
      vendorIdsWithSales.add(i.vendorId);
    }
  }
  for (const p of paymentsInRange) {
    if (p.status === "succeeded") vendorIdsWithSales.add(p.vendorId);
  }

  const providerIdsActive = new Set<string>();
  for (const r of serviceFiltered) {
    if (r.providerId) providerIdsActive.add(r.providerId);
  }

  const conversionRate =
    customers.length > 0 ? (payingCustomerIds.size / customers.length) * 100 : null;
  const conversionNote =
    "Share of registered customers who paid in this period (web visitor funnel requires analytics integration).";

  const averageOrderValue = productOrdersCount + servicePaymentsCount > 0
    ? revenueTotal / (productOrdersCount + servicePaymentsCount)
    : 0;

  const revenueByCategory = [...revenueByCategoryMap.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByVendor = [...revenueByVendorMap.entries()]
    .map(([vendorId, v]) => ({ vendorId, vendorName: v.name, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const topProducts = [...productUnitsMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, revenue: v.revenue, units: v.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  const topServices = [...bookingsByServiceMap.entries()]
    .map(([name, bookings]) => ({
      name,
      bookings,
      revenue: Math.round(serviceRevenue / Math.max(bookingsByServiceMap.size, 1)),
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 12);

  const seasonalByMonth: { month: string; revenue: number }[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const key = cursor.toLocaleString("en-US", { month: "short", year: "2-digit" });
    let rev = 0;
    for (const o of ordersInRange) {
      const d = new Date(o.createdAt);
      if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth()) continue;
      const { revenue, items } = filterOrderForProductRevenue(o, productById, filters);
      if (items.length === 0) continue;
      rev += revenue;
    }
    for (const p of paymentsInRange) {
      const d = new Date(p.createdAt);
      if (d.getFullYear() !== cursor.getFullYear() || d.getMonth() !== cursor.getMonth()) continue;
      if (p.status !== "succeeded") continue;
      if (filters.vendorId && p.vendorId !== filters.vendorId) continue;
      if (p.checkoutType === "service") rev += p.amount;
    }
    seasonalByMonth.push({ month: key, revenue: rev });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const payMethods = paymentsInRange.filter((p) => !filters.vendorId || p.vendorId === filters.vendorId);
  const methodGroups = new Map<string, { count: number; amount: number; ok: number }>();
  for (const p of payMethods) {
    const m = "Paytota";
    const g = methodGroups.get(m) ?? { count: 0, amount: 0, ok: 0 };
    g.count += 1;
    if (p.status === "succeeded") {
      g.amount += p.amount;
      g.ok += 1;
    }
    methodGroups.set(m, g);
  }
  const paymentMethodPerformance = [...methodGroups.entries()].map(([method, g]) => ({
    method,
    count: g.count,
    amount: g.amount,
    successRate: g.count > 0 ? g.ok / g.count : 0,
  }));

  const revenueByLocation = [...locationMap.entries()]
    .map(([region, v]) => ({ region, revenue: v.revenue, orders: v.orders }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const sortedByUnits = [...productUnitsMap.entries()].sort((a, b) => b[1].units - a[1].units);
  const fastMovers = sortedByUnits.slice(0, 8).map(([id, v]) => ({ id, name: v.name, units: v.units, revenue: v.revenue }));
  const slowMovers = sortedByUnits.slice(-8).reverse().map(([id, v]) => ({ id, name: v.name, units: v.units, revenue: v.revenue }));

  const soldIds = new Set(productUnitsMap.keys());
  const deadStockCandidates = products
    .filter((p) => p.published && !soldIds.has(p.id))
    .slice(0, 20)
    .map((p) => ({ id: p.id, name: p.name, category: p.category }));

  const pricingInsights = products
    .filter((p) => p.compareAtPrice && p.compareAtPrice > p.price)
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      compareAt: p.compareAtPrice,
      discountPct: p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : null,
    }));

  const ratingsByProvider = [...ratingsByProviderMap.entries()]
    .map(([providerId, v]) => ({
      providerId,
      avgStars: v.count ? v.sum / v.count : 0,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);

  const revenueByProvider = [...revenueByProviderMap.entries()]
    .map(([providerId, v]) => ({ providerId, revenue: v.revenue, payments: v.payments }))
    .sort((a, b) => b.revenue - a.revenue);

  const customersInPeriod = new Set<string>();
  for (const o of ordersInRange) {
    const { items } = filterOrderForProductRevenue(o, productById, filters);
    if (items.length > 0) customersInPeriod.add(o.customerId);
  }
  for (const p of paymentsInRange) {
    if (p.status === "succeeded") customersInPeriod.add(p.customerId);
  }

  let newInPeriod = 0;
  let returningInPeriod = 0;
  const clvs: number[] = [];
  for (const c of customers) {
    clvs.push(c.totalSpent);
    if (!customersInPeriod.has(c.id)) continue;
    if (inRange(new Date(c.createdAt), from, to)) newInPeriod += 1;
    else returningInPeriod += 1;
  }

  const avgClv = clvs.length ? clvs.reduce((a, b) => a + b, 0) / clvs.length : 0;
  const medianClv = median(clvs);

  const browseApprox = customers.length;
  const cartApprox = ordersInRange.length + serviceFiltered.length;
  const purchaseApprox = payingCustomerIds.size;
  const funnel = [
    { stage: "Registered customers", count: browseApprox, pctOfPrior: null as number | null },
    {
      stage: "Ordered / booked (period)",
      count: cartApprox,
      pctOfPrior: browseApprox ? (cartApprox / browseApprox) * 100 : null,
    },
    {
      stage: "Paying (succeeded)",
      count: purchaseApprox,
      pctOfPrior: cartApprox ? (purchaseApprox / cartApprox) * 100 : null,
    },
  ];

  const retentionRateApprox =
    customersInPeriod.size > 0 ? (returningInPeriod / customersInPeriod.size) * 100 : null;
  const churnRateApprox =
    customersInPeriod.size > 0 ? (newInPeriod / customersInPeriod.size) * 100 : null;

  const vendorLeaderboard = vendors.map((v) => {
    const revEntry = revenueByVendorMap.get(v.id);
    const revenue = revEntry?.revenue ?? 0;
    const vendorOrdersList = ordersInRange.filter((o) =>
      o.items.some(
        (i) =>
          i.vendorId === v.id && orderItemMatchesFilters(i, productById.get(i.productId), filters),
      ),
    );
    const fulfilled = vendorOrdersList.filter((o) => o.status === "delivered" || o.status === "shipped").length;
    const fulfillmentRate = vendorOrdersList.length ? fulfilled / vendorOrdersList.length : 0;
    return {
      vendorId: v.id,
      name: v.name,
      revenue,
      orders: vendorOrdersList.length,
      fulfillmentRate,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const starVals = vendors.map((v) => v.rating).filter((n) => n > 0);
  const avgRating = starVals.length ? starVals.reduce((a, b) => a + b, 0) / starVals.length : 0;
  const churnRiskCount = vendorLeaderboard.filter((v) => v.revenue === 0 && v.orders === 0).length;

  const ordersTotal = productOrdersCount + servicePaymentsCount;
  const paySucceeded = paymentsInRange.filter((p) => p.status === "succeeded").length;
  const payFailed = paymentsInRange.filter((p) => p.status === "failed").length;
  const payTotal = paySucceeded + payFailed || 1;
  const statusMix: Record<string, number> = {};
  for (const o of ordersInRange) {
    const { items } = filterOrderForProductRevenue(o, productById, filters);
    if (items.length === 0) continue;
    statusMix[o.status] = (statusMix[o.status] ?? 0) + 1;
  }

  const processingHours: number[] = [];
  for (const o of ordersInRange) {
    const { items } = filterOrderForProductRevenue(o, productById, filters);
    if (items.length === 0) continue;
    processingHours.push(
      (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 3600000,
    );
  }
  const avgProcessingHours =
    processingHours.length > 0
      ? processingHours.reduce((a, b) => a + b, 0) / processingHours.length
      : null;

  const campaigns = promotions.slice(0, 12).map((p) => ({
    code: p.code,
    uses: p.currentUses,
    maxUses: p.maxUses,
    discountType: p.discountType,
    active: p.active,
  }));

  const featuredScore = products
    .map((p) => {
      const sales = productUnitsMap.get(p.id)?.units ?? 0;
      return { id: p.id, name: p.name, score: (p.featured ? 50 : 0) + sales * 10 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const payoutsPending = disbursements
    .filter((d) => ["pending_approval", "approved", "processing"].includes(d.status))
    .reduce((s, d) => s + d.netAmount, 0);
  const payoutsPaid = disbursements
    .filter((d) => d.status === "paid")
    .reduce((s, d) => s + d.netAmount, 0);
  const outstandingVendorBalanceEstimate = Math.max(0, revenueTotal - payoutsPaid - platformCommissionEstimate);

  const marginByCategory = revenueByCategory.map((c) => ({
    category: c.name,
    marginPct: ESTIMATED_GROSS_MARGIN * 100,
    revenue: c.revenue,
  }));

  const ticketsInRange = supportTickets.filter((t) => inRange(new Date(t.createdAt), from, to));
  const supportTicketsOpen = ticketsInRange.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const resolvedTickets = ticketsInRange.filter((t) => t.status === "resolved" || t.status === "closed");
  const supportTicketsResolved = resolvedTickets.length;
  const resolutionHrs: number[] = [];
  for (const t of resolvedTickets) {
    resolutionHrs.push(
      (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000,
    );
  }
  const avgResolutionHours =
    resolutionHrs.length > 0 ? resolutionHrs.reduce((a, b) => a + b, 0) / resolutionHrs.length : null;

  const subjectCounts = new Map<string, number>();
  for (const t of ticketsInRange) {
    const k = t.subject.slice(0, 80);
    subjectCounts.set(k, (subjectCounts.get(k) ?? 0) + 1);
  }
  const commonTicketSubjects = [...subjectCounts.entries()]
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const usePaytotaForTxStats = paytotaCurrent.rows.length > 0;
  const failedTransactions = usePaytotaForTxStats ? paytotaFailed : payFailed;
  const succeededTransactions = usePaytotaForTxStats ? paytotaSucceededTotal : paySucceeded;

  const dailySlope =
    seasonalByMonth.length >= 2
      ? (seasonalByMonth[seasonalByMonth.length - 1].revenue -
          seasonalByMonth[seasonalByMonth.length - 2].revenue) /
        30
      : 0;
  const revenueForecastNext30d = Math.max(0, revenueTotal + dailySlope * 30);

  const restockSuggestions = fastMovers.slice(0, 5).map((p) => ({
    productId: p.id,
    name: p.name,
    reason: "High velocity in selected period — review warehouse stock.",
  }));

  const priceOptimizationHints = pricingInsights.slice(0, 5).map((p) => ({
    productId: p.id,
    name: p.name,
    hint:
      p.discountPct && p.discountPct > 25
        ? "Deep discount; test a smaller promotion to protect margin."
        : "Compare-at pricing is active; monitor conversion vs. margin.",
  }));

  const demandTrendLabel =
    revenueMomPct == null
      ? "Insufficient prior-period revenue to trend."
      : revenueMomPct >= 0
        ? `Demand up ~${revenueMomPct.toFixed(1)}% vs. prior window.`
        : `Demand down ~${Math.abs(revenueMomPct).toFixed(1)}% vs. prior window.`;

  const alerts: AdminComprehensiveAnalytics["alerts"] = [];
  if (revenueMomPct != null && revenueMomPct < -15) {
    alerts.push({
      severity: "warning",
      title: "Revenue drop vs. prior period",
      detail: `Revenue changed ${revenueMomPct.toFixed(1)}% compared to the previous period of equal length.`,
    });
  }
  if (cancellationRate > 0.2) {
    alerts.push({
      severity: "warning",
      title: "High service cancellation rate",
      detail: `${(cancellationRate * 100).toFixed(0)}% of service requests in this window were cancelled.`,
    });
  }
  if (failedTransactions > 0 && failedTransactions / (failedTransactions + succeededTransactions) > 0.2) {
    alerts.push({
      severity: "critical",
      title: "Elevated payment failures",
      detail: "Over 20% of tracked payment attempts failed — review Paytota logs and buyer flows.",
    });
  }
  for (const p of deadStockCandidates.slice(0, 3)) {
    alerts.push({
      severity: "info",
      title: "Listing with no sales in period",
      detail: `${p.name} had zero matching sales — consider merchandising or promotions.`,
    });
  }
  const bottomVendors = vendorLeaderboard.filter((v) => v.revenue === 0).slice(0, 3);
  for (const v of bottomVendors) {
    alerts.push({
      severity: "info",
      title: "Vendor with no revenue in period",
      detail: `${v.name} has no attributed product revenue in this filter window.`,
    });
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const heatmapWeekday = weekdays.map((weekday) => ({ weekday, productOrders: 0, serviceBookings: 0 }));
  for (const o of ordersInRange) {
    const { items } = filterOrderForProductRevenue(o, productById, filters);
    if (items.length === 0) continue;
    const wd = heatmapWeekday[new Date(o.createdAt).getDay()];
    if (wd) wd.productOrders += 1;
  }
  for (const r of serviceFiltered) {
    const wd = heatmapWeekday[new Date(r.createdAt).getDay()];
    if (wd) wd.serviceBookings += 1;
  }

  dataNotes.push(
    "Product orders use in-memory order data until migrated; align amounts with Paytota for accounting.",
  );
  dataNotes.push(
    `Gross margin assumed at ${(ESTIMATED_GROSS_MARGIN * 100).toFixed(0)}% for estimates (no COGS table).`,
  );

  const productCategories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const serviceCategories = [...new Set(serviceRequestsAll.map((r) => r.category).filter(Boolean))].sort();
  const filterOptions = {
    vendors: vendors.map((v) => ({ id: v.id, name: v.name })),
    productCategories,
    serviceCategories,
  };

  return {
    meta: {
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: prev.from.toISOString(),
      previousTo: prev.to.toISOString(),
      generatedAt: new Date().toISOString(),
      dataNotes,
    },
    filters: {
      vendorId: filters.vendorId,
      productCategory: filters.productCategory,
      serviceCategory: filters.serviceCategory,
    },
    overview: {
      revenueTotal,
      revenuePreviousPeriod,
      revenueMomPct,
      revenueYoyPct,
      productOrderRevenue,
      serviceRevenue,
      productOrdersCount,
      servicePaymentsCount,
      grossProfitEstimate,
      netProfitEstimate,
      platformCommissionEstimate,
      activeBuyers: payingCustomerIds.size,
      activeVendors: vendorIdsWithSales.size,
      activeServiceProviders: providerIdsActive.size,
      conversionRate,
      conversionNote,
      averageOrderValue,
      payingCustomersCount: payingCustomerIds.size,
    },
    sales: {
      revenueByCategory,
      revenueByVendor,
      topProducts,
      topServices,
      seasonalByMonth,
      paymentMethodPerformance,
      revenueByLocation,
    },
    inventory: {
      fastMovers,
      slowMovers,
      deadStockCandidates,
      pricingInsights,
      stockNote:
        "Warehouse quantities are not in the database yet; velocity and dead-stock views are derived from order lines.",
    },
    services: {
      bookingsByCategory: [...bookingsByCategoryMap.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      bookingsByService: [...bookingsByServiceMap.entries()]
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count),
      completionRate,
      cancellationRate,
      avgCompletionMinutes,
      ratingsByProvider,
      revenueByProvider,
    },
    customers: {
      newInPeriod,
      returningInPeriod,
      avgClv,
      medianClv,
      cacNote: "CAC requires ad spend data — connect marketing costs to unlock.",
      funnel,
      retentionRateApprox,
      churnRateApprox,
    },
    vendors: {
      leaderboard: vendorLeaderboard.slice(0, 25),
      avgRating,
      churnRiskCount,
    },
    orders: {
      total: ordersTotal,
      successPaymentRate: paySucceeded / payTotal,
      failurePaymentRate: payFailed / payTotal,
      avgProcessingHours,
      statusMix,
    },
    marketing: {
      trafficNote:
        "Traffic sources, CTR, and on-site search require analytics pixels or event logging.",
      campaigns,
      cpaNote: "CPA = spend / conversions; add campaign spend to compute automatically.",
      searchTermsNote: "Search terms can be populated from query logs when available.",
      proxyMostViewed: featuredScore,
    },
    finance: {
      platformFeesFromDisbursements,
      payoutsPending,
      payoutsPaid,
      outstandingVendorBalanceEstimate,
      marginByCategory,
      taxNote: "Tax is estimated from order tax fields where present; validate with your accountant.",
    },
    operations: {
      supportTicketsOpen,
      supportTicketsResolved,
      avgResolutionHours,
      failedTransactions,
      succeededTransactions,
      commonTicketSubjects,
    },
    predictive: {
      revenueForecastNext30d,
      restockSuggestions,
      priceOptimizationHints,
      demandTrendLabel,
    },
    alerts,
    heatmapWeekday,
    paytotaRowCount: paytotaCurrent.rows.length,
    filterOptions,
  };
}
