import {
  createBuyerAddress,
  createBuyerServiceRequest,
  createBuyerVehicle,
  getBuyerVehicle,
  getCustomer,
  updateBuyerVehicle,
  updateCustomer,
} from "@/lib/db";
import { startDispatchForNewRequest, processStaleOffersBestEffort } from "@/lib/service-dispatch";
import {
  ActiveBuyerServiceExistsError,
  serializeBuyerServiceRequest,
} from "@/lib/supabase/buyer-services-repo";
import { resolveConciergeService, resolveQuoteLines } from "@/lib/concierge/catalog";
import { resolveServiceDestination } from "@/lib/geocode/address-suggestions";
import {
  authHref,
  CONCIERGE_DESTINATIONS,
  navigateAction,
  resolveConciergeDestination,
  vehicleWritePayload,
} from "@/lib/concierge/guides";
import type { ConciergeActResult, ConciergePendingAction } from "@/lib/concierge/types";

function countPhoneDigits(value: string): number {
  return (value || "").replace(/\D/g, "").length;
}

function signInRequired(message = "Sign in to continue."): ConciergeActResult {
  const auth = authHref("/buyer");
  return { ok: false, error: message, code: "SIGN_IN_REQUIRED", field: "sign_in", trackPath: auth.href };
}

export async function executeConciergeAction(input: {
  customerId?: string | null;
  action: ConciergePendingAction;
  locationOverride?: string | null;
  phoneOverride?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
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

  if (input.action.type === "navigate") {
    const pending = input.action;
    const dest =
      resolveConciergeDestination(pending.destination) ??
      CONCIERGE_DESTINATIONS.find((row) => row.href === pending.href);
    const action = dest
      ? navigateAction(dest, { href: pending.href, hrefMobile: pending.hrefMobile })
      : pending;
    return {
      ok: true,
      type: "navigate",
      href: action.href,
      hrefMobile: action.hrefMobile,
      message: `Opening ${action.title}.`,
    };
  }

  if (input.action.type === "auth") {
    const action = authHref(input.action.next || "/buyer");
    return {
      ok: true,
      type: "auth",
      href: action.href,
      hrefMobile: action.hrefMobile,
      message: "Opening sign in so you can create or use your account.",
    };
  }

  const customerId = input.customerId?.trim() || "";
  if (!customerId) {
    return signInRequired(
      input.action.type === "book"
        ? "Sign in to book a service."
        : "Sign in to continue with your garage and orders.",
    );
  }

  if (input.action.type === "vehicle_create") {
    const created = await createBuyerVehicle({
      customerId,
      make: input.action.make,
      model: input.action.model,
      year: input.action.year,
      licensePlate: input.action.licensePlate || null,
      nickname: input.action.nickname || null,
      imageUrl: input.action.imageUrl || null,
      color: input.action.color || null,
      vin: input.action.vin || null,
      mileageKm: input.action.mileageKm,
      isPrimary: input.action.isPrimary,
      ...vehicleWritePayload(input.action),
    });
    return {
      ok: true,
      type: "vehicle_create",
      vehicleId: created.id,
      href: `/buyer/garage/${encodeURIComponent(created.id)}`,
      hrefMobile: `/garage/${encodeURIComponent(created.id)}`,
      message: `Saved your ${created.year} ${created.make} ${created.model}.`,
    };
  }

  if (input.action.type === "vehicle_update") {
    const vehicle = await getBuyerVehicle(input.action.vehicleId);
    if (!vehicle) return { ok: false, error: "Vehicle not found.", code: "VEHICLE_NOT_FOUND" };
    if (vehicle.customerId !== customerId) return { ok: false, error: "Forbidden", code: "FORBIDDEN" };
    const updated = await updateBuyerVehicle(vehicle.id, vehicleWritePayload(input.action.updates));
    if (!updated) return { ok: false, error: "Vehicle not found.", code: "VEHICLE_NOT_FOUND" };
    return {
      ok: true,
      type: "vehicle_update",
      vehicleId: updated.id,
      href: `/buyer/garage/${encodeURIComponent(updated.id)}`,
      hrefMobile: `/garage/${encodeURIComponent(updated.id)}`,
      message: `Updated ${updated.nickname || `${updated.year} ${updated.make} ${updated.model}`}.`,
    };
  }

  if (input.action.type === "profile_update") {
    const patch: Record<string, string> = {};
    if (input.action.name) patch.name = input.action.name;
    if (input.action.phone) patch.phone = input.action.phone;
    if (input.action.address) patch.address = input.action.address;
    const updated = await updateCustomer(customerId, patch);
    if (!updated) return { ok: false, error: "Customer not found.", code: "CUSTOMER_NOT_FOUND" };
    return {
      ok: true,
      type: "profile_update",
      href: "/buyer/profile",
      hrefMobile: "/profile",
      message: "Your profile is updated.",
    };
  }

  if (input.action.type === "address_create") {
    const created = await createBuyerAddress({
      customerId,
      label: input.action.label || "Home",
      fullAddress: input.action.fullAddress,
      isDefault: input.action.isDefault,
    });
    return {
      ok: true,
      type: "address_create",
      addressId: created.id,
      href: "/buyer/addresses",
      hrefMobile: "/addresses",
      message: `Saved ${created.label}.`,
    };
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

  const dest = await resolveServiceDestination({
    lat: input.destinationLat,
    lng: input.destinationLng,
    location,
  });
  await processStaleOffersBestEffort();
  let created;
  try {
    created = await createBuyerServiceRequest({
      customerId,
      category: resolved.categoryTitle,
      service: resolved.name,
      location,
      status: "pending",
      buyerContactPhone: contactPhone,
      buyerContactName: (customer.name || "").trim() || "Buyer",
      ...(input.action.notes ? { notes: input.action.notes } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(dest ? { destinationLat: dest.lat, destinationLng: dest.lng } : {}),
    });
  } catch (error) {
    if (error instanceof ActiveBuyerServiceExistsError) {
      return {
        ok: false,
        error: error.message,
        code: error.code,
        requestId: error.requestId,
        trackPath: `/buyer/services/track/${encodeURIComponent(error.requestId)}`,
      };
    }
    throw error;
  }

  try {
    await startDispatchForNewRequest(created.id);
  } catch (error) {
    console.error("concierge startDispatchForNewRequest failed:", error);
  }

  const { notifyLoggedInAdminsBestEffort } = await import("@/lib/push/notify-admins");
  void notifyLoggedInAdminsBestEffort({
    kind: "service_request",
    title: "New service request",
    body: `${resolved.name} — ${location}`,
    url: "/admin",
  });

  const serialized = serializeBuyerServiceRequest(created);
  return {
    ok: true,
    type: "book",
    requestId: serialized.id,
    trackPath: `/buyer/services/track/${encodeURIComponent(serialized.id)}`,
  };
}
