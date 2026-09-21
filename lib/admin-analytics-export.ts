import type { AdminComprehensiveAnalytics } from "@/lib/admin-comprehensive-analytics";

function cell(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return String(value);
}

function pct(fraction: number | null | undefined, digits = 2): string {
  if (fraction == null || Number.isNaN(fraction)) return "";
  return (fraction * 100).toFixed(digits);
}

function alreadyPct(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(digits);
}

function csvEscape(value: unknown): string {
  const s = cell(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function blank(): string[] {
  return [];
}

function heading(title: string): string[] {
  return [title];
}

function kv(label: string, value: unknown, extra?: unknown[]): string[] {
  return extra ? [label, cell(value), ...extra.map(cell)] : [label, cell(value)];
}

function table(headers: string[], rows: unknown[][]): string[][] {
  if (rows.length === 0) return [headers, ["(none in this window)"]];
  return [headers, ...rows.map((row) => row.map(cell))];
}

/** Full UTF-8 CSV covering every analytics domain in the current filter window. */
export function buildAdminAnalyticsCsv(data: AdminComprehensiveAnalytics): string {
  const c = data.services.cancellations;
  const lines: string[][] = [
    heading("MyGarage — comprehensive platform analytics export"),
    kv("Generated at", data.meta.generatedAt),
    kv("Window from", data.meta.from),
    kv("Window to", data.meta.to),
    kv("Previous window from", data.meta.previousFrom),
    kv("Previous window to", data.meta.previousTo),
    kv("Vendor filter", data.filters.vendorId || "All vendors"),
    kv("Product category filter", data.filters.productCategory || "All product categories"),
    kv("Service category filter", data.filters.serviceCategory || "All service categories"),
    kv("Paytota collection rows", data.paytotaRowCount),
    blank(),
    heading("Data assumptions and limits"),
    ...(data.meta.dataNotes.length > 0 ? data.meta.dataNotes.map((n) => [n]) : [["(none)"]]),

    blank(),
    heading("1. Overview"),
    kv("Total revenue", data.overview.revenueTotal),
    kv("Previous-period revenue", data.overview.revenuePreviousPeriod),
    kv("Revenue MoM %", alreadyPct(data.overview.revenueMomPct)),
    kv("Revenue YoY %", alreadyPct(data.overview.revenueYoyPct)),
    kv("Product order revenue", data.overview.productOrderRevenue),
    kv("Service revenue", data.overview.serviceRevenue),
    kv("Product orders count", data.overview.productOrdersCount),
    kv("Service payments count", data.overview.servicePaymentsCount),
    kv("Gross profit (est.)", data.overview.grossProfitEstimate),
    kv("Net profit (est.)", data.overview.netProfitEstimate),
    kv("Platform commission (est.)", data.overview.platformCommissionEstimate),
    kv("Active buyers", data.overview.activeBuyers),
    kv("Active vendors", data.overview.activeVendors),
    kv("Active service providers", data.overview.activeServiceProviders),
    kv("Paying customers", data.overview.payingCustomersCount),
    kv("Average order value", data.overview.averageOrderValue),
    kv("Conversion rate %", alreadyPct(data.overview.conversionRate)),
    kv("Conversion note", data.overview.conversionNote),

    blank(),
    heading("2. Sales — revenue by category"),
    ...table(
      ["Category", "Revenue"],
      data.sales.revenueByCategory.map((r) => [r.name, r.revenue]),
    ),
    blank(),
    heading("2. Sales — revenue by vendor"),
    ...table(
      ["Vendor ID", "Vendor name", "Revenue"],
      data.sales.revenueByVendor.map((v) => [v.vendorId, v.vendorName, v.revenue]),
    ),
    blank(),
    heading("2. Sales — top products"),
    ...table(
      ["Product ID", "Name", "Units", "Revenue"],
      data.sales.topProducts.map((p) => [p.id, p.name, p.units, p.revenue]),
    ),
    blank(),
    heading("2. Sales — top services"),
    ...table(
      ["Service", "Bookings", "Revenue"],
      data.sales.topServices.map((s) => [s.name, s.bookings, s.revenue]),
    ),
    blank(),
    heading("2. Sales — seasonal revenue by month"),
    ...table(
      ["Month", "Revenue"],
      data.sales.seasonalByMonth.map((m) => [m.month, m.revenue]),
    ),
    blank(),
    heading("2. Sales — payment method performance"),
    ...table(
      ["Method", "Count", "Amount", "Success rate %"],
      data.sales.paymentMethodPerformance.map((p) => [p.method, p.count, p.amount, pct(p.successRate)]),
    ),
    blank(),
    heading("2. Sales — revenue by location"),
    ...table(
      ["Region", "Orders", "Revenue"],
      data.sales.revenueByLocation.map((r) => [r.region, r.orders, r.revenue]),
    ),

    blank(),
    heading("3. Inventory — fast movers"),
    ...table(
      ["Product ID", "Name", "Units", "Revenue"],
      data.inventory.fastMovers.map((p) => [p.id, p.name, p.units, p.revenue]),
    ),
    blank(),
    heading("3. Inventory — slow movers"),
    ...table(
      ["Product ID", "Name", "Units", "Revenue"],
      data.inventory.slowMovers.map((p) => [p.id, p.name, p.units, p.revenue]),
    ),
    blank(),
    heading("3. Inventory — idle published listings (no sales in window)"),
    ...table(
      ["Product ID", "Name", "Category"],
      data.inventory.deadStockCandidates.map((p) => [p.id, p.name, p.category]),
    ),
    blank(),
    heading("3. Inventory — shelf pricing"),
    ...table(
      ["Product ID", "Name", "Price", "Compare at", "Discount %"],
      data.inventory.pricingInsights.map((p) => [p.id, p.name, p.price, p.compareAt, alreadyPct(p.discountPct)]),
    ),
    kv("Stock note", data.inventory.stockNote),

    blank(),
    heading("4. Services"),
    kv("Completion rate %", pct(data.services.completionRate)),
    kv("Cancellation rate %", pct(data.services.cancellationRate)),
    kv("Avg completion minutes", data.services.avgCompletionMinutes),
    blank(),
    heading("4. Services — bookings by category"),
    ...table(
      ["Category", "Count"],
      data.services.bookingsByCategory.map((r) => [r.category, r.count]),
    ),
    blank(),
    heading("4. Services — bookings by service"),
    ...table(
      ["Service", "Count"],
      data.services.bookingsByService.map((r) => [r.service, r.count]),
    ),
    blank(),
    heading("4. Services — ratings by provider"),
    ...table(
      ["Provider ID", "Avg stars", "Review count"],
      data.services.ratingsByProvider.map((r) => [r.providerId, r.avgStars, r.count]),
    ),
    blank(),
    heading("4. Services — revenue by provider"),
    ...table(
      ["Provider ID", "Payments", "Revenue"],
      data.services.revenueByProvider.map((r) => [r.providerId, r.payments, r.revenue]),
    ),

    blank(),
    heading("4. Services — cancellations summary"),
    kv("Total cancelled", c.total),
    kv("While searching", c.searching),
    kv("After match (en route)", c.enRoute),
    kv("With reason", c.withReason),
    kv("No reason given", c.unspecified),
    kv("Buyer initiated", c.buyerInitiated),
    kv("Provider initiated", c.providerInitiated),
    kv("Admin initiated", c.adminInitiated),
    kv("System initiated", c.systemInitiated),
    kv("Safety-related", c.safetyCount),
    kv("Top reason", c.topReason ? `${c.topReason.label} (${c.topReason.count})` : ""),
    blank(),
    heading("4. Services — cancel reasons"),
    ...table(
      ["Reason ID", "Label", "Count", "Searching", "After match", "Share %"],
      c.byReason.map((r) => [r.id, r.label, r.count, r.searching, r.enRoute, pct(r.sharePct)]),
    ),
    blank(),
    heading("4. Services — cancellations by actor"),
    ...table(
      ["Actor", "Label", "Count"],
      c.byActor.map((r) => [r.actor, r.label, r.count]),
    ),
    blank(),
    heading("4. Services — cancellation rate by category"),
    ...table(
      ["Category", "Cancelled", "Bookings", "Rate %"],
      c.byCategory.map((r) => [r.category, r.cancelled, r.total, pct(r.rate)]),
    ),
    blank(),
    heading("4. Services — cancellation rate by service"),
    ...table(
      ["Service", "Cancelled", "Bookings", "Rate %"],
      c.byService.map((r) => [r.service, r.cancelled, r.total, pct(r.rate)]),
    ),
    blank(),
    heading("4. Services — free-text cancel notes"),
    ...table(
      ["Cancelled at", "Stage", "Category", "Service", "Note"],
      c.recentNotes.map((n) => [n.cancelledAt, n.stage, n.category, n.service, n.note]),
    ),

    blank(),
    heading("5. Customers"),
    kv("New in period", data.customers.newInPeriod),
    kv("Returning in period", data.customers.returningInPeriod),
    kv("Average CLV", data.customers.avgClv),
    kv("Median CLV", data.customers.medianClv),
    kv("Retention rate % (approx)", alreadyPct(data.customers.retentionRateApprox)),
    kv("Churn rate % (approx)", alreadyPct(data.customers.churnRateApprox)),
    kv("CAC note", data.customers.cacNote),
    blank(),
    heading("5. Customers — funnel"),
    ...table(
      ["Stage", "Count", "% of prior"],
      data.customers.funnel.map((f) => [f.stage, f.count, alreadyPct(f.pctOfPrior)]),
    ),

    blank(),
    heading("6. Vendors"),
    kv("Average rating", data.vendors.avgRating),
    kv("Churn-risk count", data.vendors.churnRiskCount),
    blank(),
    heading("6. Vendors — leaderboard"),
    ...table(
      ["Vendor ID", "Name", "Revenue", "Orders", "Fulfillment rate %"],
      data.vendors.leaderboard.map((v) => [v.vendorId, v.name, v.revenue, v.orders, pct(v.fulfillmentRate)]),
    ),

    blank(),
    heading("7. Orders"),
    kv("Total orders", data.orders.total),
    kv("Successful payment rate %", pct(data.orders.successPaymentRate)),
    kv("Failed payment rate %", pct(data.orders.failurePaymentRate)),
    kv("Avg processing hours", data.orders.avgProcessingHours),
    blank(),
    heading("7. Orders — status mix"),
    ...table(
      ["Status", "Count"],
      Object.entries(data.orders.statusMix).map(([status, count]) => [status, count]),
    ),

    blank(),
    heading("8. Marketing"),
    kv("Traffic note", data.marketing.trafficNote),
    kv("CPA note", data.marketing.cpaNote),
    kv("Search terms note", data.marketing.searchTermsNote),
    blank(),
    heading("8. Marketing — campaigns"),
    ...table(
      ["Code", "Uses", "Max uses", "Discount type", "Active"],
      data.marketing.campaigns.map((c0) => [c0.code, c0.uses, c0.maxUses, c0.discountType, c0.active ? "yes" : "no"]),
    ),
    blank(),
    heading("8. Marketing — proxy most viewed"),
    ...table(
      ["ID", "Name", "Score"],
      data.marketing.proxyMostViewed.map((p) => [p.id, p.name, p.score]),
    ),

    blank(),
    heading("9. Finance"),
    kv("Platform fees from disbursements", data.finance.platformFeesFromDisbursements),
    kv("Payouts pending", data.finance.payoutsPending),
    kv("Payouts paid", data.finance.payoutsPaid),
    kv("Outstanding vendor balance (est.)", data.finance.outstandingVendorBalanceEstimate),
    kv("Tax note", data.finance.taxNote),
    blank(),
    heading("9. Finance — margin by category"),
    ...table(
      ["Category", "Revenue", "Margin %"],
      data.finance.marginByCategory.map((m) => [m.category, m.revenue, alreadyPct(m.marginPct)]),
    ),

    blank(),
    heading("10. Operations"),
    kv("Support tickets open", data.operations.supportTicketsOpen),
    kv("Support tickets resolved", data.operations.supportTicketsResolved),
    kv("Avg resolution hours", data.operations.avgResolutionHours),
    kv("Failed transactions", data.operations.failedTransactions),
    kv("Succeeded transactions", data.operations.succeededTransactions),
    blank(),
    heading("10. Operations — common ticket subjects"),
    ...table(
      ["Subject", "Count"],
      data.operations.commonTicketSubjects.map((t) => [t.subject, t.count]),
    ),

    blank(),
    heading("11. Insights / predictive"),
    kv("Revenue forecast next 30d", data.predictive.revenueForecastNext30d),
    kv("Demand trend", data.predictive.demandTrendLabel),
    blank(),
    heading("11. Insights — restock suggestions"),
    ...table(
      ["Product ID", "Name", "Reason"],
      data.predictive.restockSuggestions.map((s) => [s.productId, s.name, s.reason]),
    ),
    blank(),
    heading("11. Insights — price optimization hints"),
    ...table(
      ["Product ID", "Name", "Hint"],
      data.predictive.priceOptimizationHints.map((s) => [s.productId, s.name, s.hint]),
    ),

    blank(),
    heading("12. Alerts"),
    ...table(
      ["Severity", "Title", "Detail"],
      data.alerts.map((a) => [a.severity, a.title, a.detail]),
    ),

    blank(),
    heading("13. Activity heatmap (weekday)"),
    ...table(
      ["Weekday", "Product orders", "Service bookings"],
      data.heatmapWeekday.map((h) => [h.weekday, h.productOrders, h.serviceBookings]),
    ),

    blank(),
    heading("14. Catalog — vendors in filter options"),
    ...table(
      ["Vendor ID", "Name"],
      data.filterOptions.vendors.map((v) => [v.id, v.name]),
    ),
    blank(),
    heading("14. Catalog — product categories"),
    ...table(
      ["Product category"],
      data.filterOptions.productCategories.map((c0) => [c0]),
    ),
    blank(),
    heading("14. Catalog — service categories"),
    ...table(
      ["Service category"],
      data.filterOptions.serviceCategories.map((c0) => [c0]),
    ),
  ];

  return `\uFEFF${lines.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
}

export function formatExportUgx(n: number): string {
  return `UGX ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatExportPct(fraction: number | null | undefined, digits = 1): string {
  if (fraction == null || Number.isNaN(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function formatAlreadyPct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}
