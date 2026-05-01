import { NextRequest, NextResponse } from "next/server";

import {
  getBuyerAddresses,
  getBuyerProviderRatings,
  getBuyerServiceRequests,
  getBuyerSupportTickets,
  getBuyerWishlistItems,
  getCustomer,
  getOrders,
  getPaymentRecords,
} from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customerId = String(id ?? "").trim();
    if (!customerId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const [
      customer,
      orders,
      serviceRequests,
      addresses,
      wishlist,
      supportTickets,
      ratings,
      payments,
    ] = await Promise.all([
      getCustomer(customerId),
      getOrders(),
      getBuyerServiceRequests(customerId),
      getBuyerAddresses(customerId),
      getBuyerWishlistItems(customerId),
      getBuyerSupportTickets(customerId),
      getBuyerProviderRatings(customerId),
      getPaymentRecords(),
    ]);

    if (!customer) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const customerOrders = orders.filter((o) => o.customerId === customerId);
    const customerPayments = payments.filter((p) => p.customerId === customerId);

    return NextResponse.json({
      customer,
      orders: customerOrders,
      serviceRequests,
      addresses,
      wishlist,
      supportTickets,
      ratings,
      payments: customerPayments,
    });
  } catch (error) {
    console.error("admin clients detail GET failed", error);
    return NextResponse.json({ error: "Failed to load client" }, { status: 500 });
  }
}

