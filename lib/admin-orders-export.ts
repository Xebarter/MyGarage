import { format } from "date-fns";

import type { AdminUnifiedCommerceItem } from "@/lib/admin-commerce-feed";
import { productOrderStatusLabel } from "@/lib/product-order-status";

export type OrdersExportScope = "all" | "view" | "order";

const HEADERS = [
  "Type",
  "Order ID",
  "Created",
  "Updated",
  "Status",
  "Stage",
  "Customer",
  "Email",
  "Phone",
  "Location",
  "Line",
  "Reference",
  "Qty",
  "Unit price (UGX)",
  "Line total (UGX)",
  "Subtotal (UGX)",
  "Tax (UGX)",
  "Total (UGX)",
  "Checkout ID",
  "Tracking",
  "Carrier",
  "Provider ID",
  "Payment ID",
  "Payment status",
  "Notes",
] as const;

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvLine(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(",");
}

function stamp(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd HH:mm");
}

function stageLabel(stage: AdminUnifiedCommerceItem["pipeline"]): string {
  switch (stage) {
    case "pending":
      return "Pending";
    case "in_flight":
      return "In progress";
    case "completed":
      return "Done";
    case "cancelled":
      return "Cancelled";
    default:
      return stage;
  }
}

function serviceStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

function orderRows(row: AdminUnifiedCommerceItem): string[] {
  const stage = stageLabel(row.pipeline);
  if (row.kind === "product" && row.productOrder) {
    const order = row.productOrder;
    const shared = [
      "Product",
      order.id,
      stamp(order.createdAt),
      stamp(order.updatedAt),
      productOrderStatusLabel(order.status),
      stage,
      order.customerName,
      order.customerEmail,
      "",
      order.shippingAddress,
    ];
    const tail = [
      order.subtotal,
      order.tax,
      order.total,
      order.checkoutId ?? "",
      order.trackingNumber ?? "",
      order.carrier ?? "",
      "",
      "",
      "",
      "",
    ];
    if (order.items.length === 0) {
      return [csvLine([...shared, "", "", "", "", "", ...tail])];
    }
    return order.items.map((item) =>
      csvLine([
        ...shared,
        item.productName,
        item.productId,
        item.quantity,
        item.price,
        item.price * item.quantity,
        ...tail,
      ]),
    );
  }

  const request = row.service?.request;
  const payments = row.service?.payments ?? [];
  const shared = [
    "Service",
    row.id,
    stamp(request?.createdAt ?? row.sortAt),
    stamp(request?.updatedAt ?? row.updatedAt),
    serviceStatusLabel(row.statusKey),
    stage,
    row.customerName,
    row.customerEmail === "—" ? "" : row.customerEmail,
    request?.buyerContactPhone ?? "",
    request?.location ?? "",
    request?.service ?? row.summary,
    request?.category ?? "",
    1,
  ];
  const orderTail = [
    "",
    "",
    row.amountUgx ?? "",
    "",
    "",
    "",
    request?.providerId ?? "",
  ];
  if (payments.length === 0) {
    return [csvLine([...shared, "", "", ...orderTail, "", "", request?.notes ?? ""])];
  }
  return payments.map((payment) =>
    csvLine([
      ...shared,
      payment.amountUgx,
      payment.amountUgx,
      ...orderTail,
      payment.id,
      payment.status,
      request?.notes ?? "",
    ]),
  );
}

export function buildOrdersCsv(rows: AdminUnifiedCommerceItem[]): string {
  return [csvLine([...HEADERS]), ...rows.flatMap(orderRows)].join("\r\n");
}

export function downloadOrdersCsv(rows: AdminUnifiedCommerceItem[], scope: OrdersExportScope): number {
  if (rows.length === 0 || typeof document === "undefined") return 0;
  const csv = `\uFEFF${buildOrdersCsv(rows)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const fileStamp = format(new Date(), "yyyy-MM-dd-HHmm");
  const single = scope === "order" && rows.length === 1 ? rows[0] : null;
  anchor.href = url;
  anchor.download = single
    ? `mygarage-order-${single.kind}-${single.id.slice(0, 8)}-${fileStamp}.csv`
    : scope === "view"
      ? `mygarage-orders-view-${fileStamp}.csv`
      : `mygarage-orders-${fileStamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return rows.length;
}
