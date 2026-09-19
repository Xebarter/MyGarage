import { createBuyerServiceRequest, getBuyerVehicle, getCustomer } from "@/lib/db";
import { startDispatchForNewRequest } from "@/lib/service-dispatch";
import { serializeBuyerServiceRequest } from "@/lib/supabase/buyer-services-repo";
import { resolveConciergeService, resolveQuoteLines } from "@/lib/concierge/catalog";
import type { ConciergeActResult, ConciergePendingAction } from "@/lib/concierge/types";

function countPhoneDigits(value: string): number {
  return (value || "").replace(/\D/g, "").length;
}

export async function executeConciergeAction(input: {
  customerId?: string | null;
  action: ConciergePendingAction;
  locationOverride?: string | null;
  phoneOverride?: string | null;
}): Promise<ConciergeActResult> {
  if (input.action.type === "quote") {
    const lines = await resolveQuoteLines(
      input.action.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    );
    if (lines.length === 0) {
      return { ok: false, error: "Those products are no longer available.", code: "QUOTE_EMPTY" };
    }
    return { ok: true, type: "quote", lines };
  }

  const customerId = input.customerId?.trim() || "";
  if (!customerId) {
    return { ok: false, error: "Sign in to book a service.", code: "SIGN_IN_REQUIRED", field: "sign_in" };
  }

  const resolved = resolveConciergeService({
    categoryId: input.action.categoryId,
    category: input.action.category,
    service: input.action.service,
  });
  if (!resolved) {
    return { ok: false, error: "That service is not in the catalog.", code: "SERVICE_INVALID", field: "service" };
  }

  const location = (input.locationOverride || input.action.location || "").trim();
  if (!location) {
    return { ok: false, error: "Add an area or address to send the provider.", code: "LOCATION_REQUIRED", field: "location" };
  }

  const customer = await getCustomer(customerId);
  if (!customer) {
    return { ok: false, error: "Customer not found.", code: "CUSTOMER_NOT_FOUND" };
  }

  const phoneOverride = input.phoneOverride?.trim() || "";
  const contactPhone = countPhoneDigits(customer.phone) >= 9 ? customer.phone.trim() : phoneOverride;
  if (countPhoneDigits(contactPhone) < 9) {
    return {
      ok: false,
      error: "A valid mobile number is required to request service.",
      code: "PHONE_REQUIRED",
      field: "phone",
    };
  }

  let vehicleId = input.action.vehicleId?.trim() || null;
  if (vehicleId) {
    const vehicle = await getBuyerVehicle(vehicleId);
    if (!vehicle) {
      return { ok: false, error: "Vehicle not found.", code: "VEHICLE_NOT_FOUND" };
    }
    if (vehicle.customerId !== customerId) {
      return { ok: false, error: "Forbidden", code: "FORBIDDEN" };
    }
  }

  const created = await createBuyerServiceRequest({
    customerId,
    category: resolved.categoryTitle,
    service: resolved.name,
    location,
    status: "pending",
    buyerContactPhone: contactPhone,
    buyerContactName: (customer.name || "").trim() || "Buyer",
    ...(input.action.notes ? { notes: input.action.notes } : {}),
    ...(vehicleId ? { vehicleId } : {}),
  });

  try {
    await startDispatchForNewRequest(created.id);
  } catch (error) {
    console.error("concierge startDispatchForNewRequest failed:", error);
  }

  const serialized = serializeBuyerServiceRequest(created);
  return {
    ok: true,
    type: "book",
    requestId: serialized.id,
    trackPath: `/buyer/services/track/${encodeURIComponent(serialized.id)}`,
  };
}
