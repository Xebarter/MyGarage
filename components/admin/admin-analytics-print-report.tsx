import type { AdminComprehensiveAnalytics } from "@/lib/admin-comprehensive-analytics";
import {
  formatAlreadyPct,
  formatExportPct,
  formatExportUgx,
} from "@/lib/admin-analytics-export";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function dash(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function PrintKpis({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="print-kpis">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PrintTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="print-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="print-empty">None in this window.</p>
      ) : (
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${title}-${i}`}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminAnalyticsPrintReport({ data }: { data: AdminComprehensiveAnalytics }) {
  const vendorName =
    data.filterOptions.vendors.find((v) => v.id === data.filters.vendorId)?.name ||
    data.filters.vendorId ||
    "All vendors";
  const c = data.services.cancellations;
  const statusMix = Object.entries(data.orders.statusMix).sort((a, b) => b[1] - a[1]);

  return (
    <article className="admin-analytics-print hidden print:block" aria-hidden>
      <header className="print-cover">
        <p className="print-brand">MyGarage · Operations</p>
        <h1>Platform analytics briefing</h1>
        <p className="print-lede">
          Full snapshot of commerce, services, vendors, finance, and operations for the selected
          window. Currency is Ugandan shilling. Estimates are labeled as such.
        </p>
        <dl className="print-meta">
          <div>
            <dt>Generated</dt>
            <dd>{fmtWhen(data.meta.generatedAt)}</dd>
          </div>
          <div>
            <dt>Window</dt>
            <dd>
              {fmtWhen(data.meta.from)} — {fmtWhen(data.meta.to)}
            </dd>
          </div>
          <div>
            <dt>Previous window</dt>
            <dd>
              {fmtWhen(data.meta.previousFrom)} — {fmtWhen(data.meta.previousTo)}
            </dd>
          </div>
          <div>
            <dt>Vendor</dt>
            <dd>{vendorName}</dd>
          </div>
          <div>
            <dt>Product category</dt>
            <dd>{data.filters.productCategory || "All"}</dd>
          </div>
          <div>
            <dt>Service category</dt>
            <dd>{data.filters.serviceCategory || "All"}</dd>
          </div>
          <div>
            <dt>Paytota collection rows</dt>
            <dd>{data.paytotaRowCount.toLocaleString()}</dd>
          </div>
        </dl>
      </header>

      {data.meta.dataNotes.length > 0 ? (
        <section className="print-section">
          <h2>Data assumptions and limits</h2>
          <ul className="print-notes">
            {data.meta.dataNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="print-section">
        <h2>1. Overview</h2>
        <PrintKpis
          items={[
            { label: "Total revenue", value: formatExportUgx(data.overview.revenueTotal) },
            { label: "Previous-period revenue", value: formatExportUgx(data.overview.revenuePreviousPeriod) },
            { label: "Revenue MoM", value: formatAlreadyPct(data.overview.revenueMomPct) },
            { label: "Revenue YoY", value: formatAlreadyPct(data.overview.revenueYoyPct) },
            { label: "Product order revenue", value: formatExportUgx(data.overview.productOrderRevenue) },
            { label: "Service revenue", value: formatExportUgx(data.overview.serviceRevenue) },
            { label: "Product orders", value: data.overview.productOrdersCount.toLocaleString() },
            { label: "Service payments", value: data.overview.servicePaymentsCount.toLocaleString() },
            { label: "Gross profit (est.)", value: formatExportUgx(data.overview.grossProfitEstimate) },
            { label: "Net profit (est.)", value: formatExportUgx(data.overview.netProfitEstimate) },
            { label: "Platform commission (est.)", value: formatExportUgx(data.overview.platformCommissionEstimate) },
            { label: "Average order value", value: formatExportUgx(data.overview.averageOrderValue) },
            { label: "Active buyers", value: data.overview.activeBuyers.toLocaleString() },
            { label: "Active vendors", value: data.overview.activeVendors.toLocaleString() },
            { label: "Active service providers", value: data.overview.activeServiceProviders.toLocaleString() },
            { label: "Paying customers", value: data.overview.payingCustomersCount.toLocaleString() },
            { label: "Conversion rate", value: formatAlreadyPct(data.overview.conversionRate) },
          ]}
        />
        <p className="print-note">{data.overview.conversionNote}</p>
      </section>

      <section className="print-section">
        <h2>2. Sales</h2>
        <PrintTable
          title="Revenue by category"
          headers={["Category", "Revenue"]}
          rows={data.sales.revenueByCategory.map((r) => [r.name, formatExportUgx(r.revenue)])}
        />
        <PrintTable
          title="Revenue by vendor"
          headers={["Vendor", "Vendor ID", "Revenue"]}
          rows={data.sales.revenueByVendor.map((v) => [v.vendorName, v.vendorId, formatExportUgx(v.revenue)])}
        />
        <PrintTable
          title="Top products"
          headers={["Product", "Product ID", "Units", "Revenue"]}
          rows={data.sales.topProducts.map((p) => [p.name, p.id, p.units, formatExportUgx(p.revenue)])}
        />
        <PrintTable
          title="Top services"
          headers={["Service", "Bookings", "Revenue"]}
          rows={data.sales.topServices.map((s) => [s.name, s.bookings, formatExportUgx(s.revenue)])}
        />
        <PrintTable
          title="Seasonal revenue by month"
          headers={["Month", "Revenue"]}
          rows={data.sales.seasonalByMonth.map((m) => [m.month, formatExportUgx(m.revenue)])}
        />
        <PrintTable
          title="Payment method performance"
          headers={["Method", "Count", "Amount", "Success rate"]}
          rows={data.sales.paymentMethodPerformance.map((p) => [
            p.method,
            p.count,
            formatExportUgx(p.amount),
            formatExportPct(p.successRate),
          ])}
        />
        <PrintTable
          title="Revenue by location"
          headers={["Region", "Orders", "Revenue"]}
          rows={data.sales.revenueByLocation.map((r) => [r.region, r.orders, formatExportUgx(r.revenue)])}
        />
      </section>

      <section className="print-section">
        <h2>3. Inventory</h2>
        <p className="print-note">{data.inventory.stockNote}</p>
        <PrintTable
          title="Fast movers"
          headers={["Product", "Product ID", "Units", "Revenue"]}
          rows={data.inventory.fastMovers.map((p) => [p.name, p.id, p.units, formatExportUgx(p.revenue)])}
        />
        <PrintTable
          title="Slow movers"
          headers={["Product", "Product ID", "Units", "Revenue"]}
          rows={data.inventory.slowMovers.map((p) => [p.name, p.id, p.units, formatExportUgx(p.revenue)])}
        />
        <PrintTable
          title="Idle published listings (no sales in window)"
          headers={["Product", "Product ID", "Category"]}
          rows={data.inventory.deadStockCandidates.map((p) => [p.name, p.id, p.category])}
        />
        <PrintTable
          title="Shelf pricing"
          headers={["Product", "Product ID", "Price", "Compare at", "Discount"]}
          rows={data.inventory.pricingInsights.map((p) => [
            p.name,
            p.id,
            formatExportUgx(p.price),
            p.compareAt == null ? "—" : formatExportUgx(p.compareAt),
            formatAlreadyPct(p.discountPct),
          ])}
        />
      </section>

      <section className="print-section">
        <h2>4. Services</h2>
        <PrintKpis
          items={[
            { label: "Completion rate", value: formatExportPct(data.services.completionRate) },
            { label: "Cancellation rate", value: formatExportPct(data.services.cancellationRate) },
            {
              label: "Avg completion minutes",
              value: data.services.avgCompletionMinutes == null ? "—" : data.services.avgCompletionMinutes.toFixed(1),
            },
          ]}
        />
        <PrintTable
          title="Bookings by category"
          headers={["Category", "Count"]}
          rows={data.services.bookingsByCategory.map((r) => [r.category, r.count])}
        />
        <PrintTable
          title="Bookings by service"
          headers={["Service", "Count"]}
          rows={data.services.bookingsByService.map((r) => [r.service, r.count])}
        />
        <PrintTable
          title="Ratings by provider"
          headers={["Provider ID", "Avg stars", "Reviews"]}
          rows={data.services.ratingsByProvider.map((r) => [r.providerId, r.avgStars.toFixed(2), r.count])}
        />
        <PrintTable
          title="Revenue by provider"
          headers={["Provider ID", "Payments", "Revenue"]}
          rows={data.services.revenueByProvider.map((r) => [r.providerId, r.payments, formatExportUgx(r.revenue)])}
        />

        <h3>Cancellations</h3>
        <PrintKpis
          items={[
            { label: "Total cancelled", value: String(c.total) },
            { label: "While searching", value: String(c.searching) },
            { label: "After match (en route)", value: String(c.enRoute) },
            { label: "With reason", value: String(c.withReason) },
            { label: "No reason given", value: String(c.unspecified) },
            { label: "Buyer initiated", value: String(c.buyerInitiated) },
            { label: "Provider initiated", value: String(c.providerInitiated) },
            { label: "Admin initiated", value: String(c.adminInitiated) },
            { label: "System initiated", value: String(c.systemInitiated) },
            { label: "Safety-related", value: String(c.safetyCount) },
            {
              label: "Top reason",
              value: c.topReason ? `${c.topReason.label} (${c.topReason.count})` : "—",
            },
          ]}
        />
        <PrintTable
          title="Cancel reasons"
          headers={["Reason", "Count", "Searching", "After match", "Share"]}
          rows={c.byReason.map((r) => [r.label, r.count, r.searching, r.enRoute, formatExportPct(r.sharePct)])}
        />
        <PrintTable
          title="Cancellations by actor"
          headers={["Actor", "Count"]}
          rows={c.byActor.map((r) => [r.label, r.count])}
        />
        <PrintTable
          title="Cancellation rate by category"
          headers={["Category", "Cancelled", "Bookings", "Rate"]}
          rows={c.byCategory.map((r) => [r.category, r.cancelled, r.total, formatExportPct(r.rate)])}
        />
        <PrintTable
          title="Cancellation rate by service"
          headers={["Service", "Cancelled", "Bookings", "Rate"]}
          rows={c.byService.map((r) => [r.service, r.cancelled, r.total, formatExportPct(r.rate)])}
        />
        <PrintTable
          title="Free-text cancel notes"
          headers={["When", "Stage", "Category", "Service", "Note"]}
          rows={c.recentNotes.map((n) => [fmtWhen(n.cancelledAt), n.stage, n.category, n.service, n.note])}
        />
      </section>

      <section className="print-section">
        <h2>5. Customers</h2>
        <PrintKpis
          items={[
            { label: "New in period", value: data.customers.newInPeriod.toLocaleString() },
            { label: "Returning in period", value: data.customers.returningInPeriod.toLocaleString() },
            { label: "Average CLV", value: formatExportUgx(data.customers.avgClv) },
            { label: "Median CLV", value: formatExportUgx(data.customers.medianClv) },
            { label: "Retention (approx)", value: formatAlreadyPct(data.customers.retentionRateApprox) },
            { label: "Churn (approx)", value: formatAlreadyPct(data.customers.churnRateApprox) },
          ]}
        />
        <p className="print-note">{data.customers.cacNote}</p>
        <PrintTable
          title="Funnel"
          headers={["Stage", "Count", "% of prior"]}
          rows={data.customers.funnel.map((f) => [f.stage, f.count, formatAlreadyPct(f.pctOfPrior)])}
        />
      </section>

      <section className="print-section">
        <h2>6. Vendors</h2>
        <PrintKpis
          items={[
            { label: "Average rating", value: data.vendors.avgRating.toFixed(2) },
            { label: "Churn-risk count", value: data.vendors.churnRiskCount.toLocaleString() },
          ]}
        />
        <PrintTable
          title="Vendor leaderboard"
          headers={["Vendor", "Vendor ID", "Revenue", "Orders", "Fulfillment"]}
          rows={data.vendors.leaderboard.map((v) => [
            v.name,
            v.vendorId,
            formatExportUgx(v.revenue),
            v.orders,
            formatExportPct(v.fulfillmentRate),
          ])}
        />
      </section>

      <section className="print-section">
        <h2>7. Orders</h2>
        <PrintKpis
          items={[
            { label: "Total orders", value: data.orders.total.toLocaleString() },
            { label: "Successful payment rate", value: formatExportPct(data.orders.successPaymentRate) },
            { label: "Failed payment rate", value: formatExportPct(data.orders.failurePaymentRate) },
            {
              label: "Avg processing hours",
              value: data.orders.avgProcessingHours == null ? "—" : data.orders.avgProcessingHours.toFixed(1),
            },
          ]}
        />
        <PrintTable
          title="Status mix"
          headers={["Status", "Count"]}
          rows={statusMix.map(([status, count]) => [status, count])}
        />
      </section>

      <section className="print-section">
        <h2>8. Marketing</h2>
        <p className="print-note">{data.marketing.trafficNote}</p>
        <p className="print-note">{data.marketing.cpaNote}</p>
        <p className="print-note">{data.marketing.searchTermsNote}</p>
        <PrintTable
          title="Campaigns / promotions"
          headers={["Code", "Uses", "Max uses", "Discount type", "Active"]}
          rows={data.marketing.campaigns.map((camp) => [
            camp.code,
            camp.uses,
            camp.maxUses,
            camp.discountType,
            camp.active ? "Yes" : "No",
          ])}
        />
        <PrintTable
          title="Proxy most viewed"
          headers={["Listing", "ID", "Score"]}
          rows={data.marketing.proxyMostViewed.map((p) => [p.name, p.id, p.score])}
        />
      </section>

      <section className="print-section">
        <h2>9. Finance</h2>
        <PrintKpis
          items={[
            {
              label: "Platform fees from disbursements",
              value: formatExportUgx(data.finance.platformFeesFromDisbursements),
            },
            { label: "Payouts pending", value: formatExportUgx(data.finance.payoutsPending) },
            { label: "Payouts paid", value: formatExportUgx(data.finance.payoutsPaid) },
            {
              label: "Outstanding vendor balance (est.)",
              value: formatExportUgx(data.finance.outstandingVendorBalanceEstimate),
            },
          ]}
        />
        <p className="print-note">{data.finance.taxNote}</p>
        <PrintTable
          title="Margin by category"
          headers={["Category", "Revenue", "Margin"]}
          rows={data.finance.marginByCategory.map((m) => [
            m.category,
            formatExportUgx(m.revenue),
            formatAlreadyPct(m.marginPct),
          ])}
        />
      </section>

      <section className="print-section">
        <h2>10. Operations</h2>
        <PrintKpis
          items={[
            { label: "Support tickets open", value: data.operations.supportTicketsOpen.toLocaleString() },
            { label: "Support tickets resolved", value: data.operations.supportTicketsResolved.toLocaleString() },
            {
              label: "Avg resolution hours",
              value: data.operations.avgResolutionHours == null ? "—" : data.operations.avgResolutionHours.toFixed(1),
            },
            { label: "Failed transactions", value: data.operations.failedTransactions.toLocaleString() },
            { label: "Succeeded transactions", value: data.operations.succeededTransactions.toLocaleString() },
          ]}
        />
        <PrintTable
          title="Common ticket subjects"
          headers={["Subject", "Count"]}
          rows={data.operations.commonTicketSubjects.map((t) => [t.subject, t.count])}
        />
      </section>

      <section className="print-section">
        <h2>11. Insights / predictive</h2>
        <PrintKpis
          items={[
            {
              label: "Revenue forecast next 30d",
              value: formatExportUgx(data.predictive.revenueForecastNext30d),
            },
            { label: "Demand trend", value: data.predictive.demandTrendLabel },
          ]}
        />
        <PrintTable
          title="Restock suggestions"
          headers={["Product", "Product ID", "Reason"]}
          rows={data.predictive.restockSuggestions.map((s) => [s.name, s.productId, s.reason])}
        />
        <PrintTable
          title="Price optimization hints"
          headers={["Product", "Product ID", "Hint"]}
          rows={data.predictive.priceOptimizationHints.map((s) => [s.name, s.productId, s.hint])}
        />
      </section>

      <section className="print-section">
        <h2>12. Alerts</h2>
        <PrintTable
          title="Current alerts"
          headers={["Severity", "Title", "Detail"]}
          rows={data.alerts.map((a) => [a.severity, a.title, a.detail])}
        />
      </section>

      <section className="print-section">
        <h2>13. Activity heatmap</h2>
        <PrintTable
          title="Weekday mix"
          headers={["Weekday", "Product orders", "Service bookings"]}
          rows={data.heatmapWeekday.map((h) => [h.weekday, h.productOrders, h.serviceBookings])}
        />
      </section>

      <section className="print-section">
        <h2>14. Catalog appendix</h2>
        <PrintTable
          title="Vendors in filter options"
          headers={["Vendor", "Vendor ID"]}
          rows={data.filterOptions.vendors.map((v) => [v.name, v.id])}
        />
        <PrintTable
          title="Product categories"
          headers={["Category"]}
          rows={data.filterOptions.productCategories.map((cat) => [cat])}
        />
        <PrintTable
          title="Service categories"
          headers={["Category"]}
          rows={data.filterOptions.serviceCategories.map((cat) => [cat])}
        />
      </section>

      <footer className="print-footer">
        MyGarage platform analytics · Confidential · {dash(vendorName)} · generated {fmtWhen(data.meta.generatedAt)}
      </footer>
    </article>
  );
}
