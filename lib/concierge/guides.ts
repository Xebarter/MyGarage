import {
  isVehicleFuelType,
  isVehicleTransmission,
  vehicleSpecUpdatesFromBody,
  type VehicleFuelType,
  type VehicleTransmission,
} from "@/lib/garage";
import { listBuyerServiceRequests } from "@/lib/supabase/buyer-services-repo";
import { listProductOrdersByCustomerId } from "@/lib/supabase/product-orders-repo";
import type {
  ConciergeBookingCard,
  ConciergeOrderCard,
  ConciergePendingAddressCreate,
  ConciergePendingAuth,
  ConciergePendingNavigate,
  ConciergePendingProfileUpdate,
  ConciergePendingVehicleCreate,
  ConciergePendingVehicleUpdate,
  ConciergeVehicleDraft,
} from "@/lib/concierge/types";

export type ConciergeDestination = {
  id: string;
  title: string;
  description: string;
  href: string;
  hrefMobile: string;
  guestOk: boolean;
};

export const CONCIERGE_DESTINATIONS: ConciergeDestination[] = [
  { id: "home", title: "Home", description: "The MyGarage storefront.", href: "/", hrefMobile: "/", guestOk: true },
  { id: "shop", title: "Shop", description: "Browse parts and accessories.", href: "/shop", hrefMobile: "/shop", guestOk: true },
  { id: "cart", title: "Cart", description: "Review items before checkout.", href: "/cart", hrefMobile: "/cart", guestOk: true },
  { id: "checkout", title: "Checkout", description: "Pay for parts in your cart.", href: "/checkout", hrefMobile: "/checkout", guestOk: true },
  {
    id: "auth",
    title: "Sign in",
    description: "Create an account or sign in to save cars, orders, and bookings.",
    href: "/auth?role=buyer",
    hrefMobile: "/login",
    guestOk: true,
  },
  { id: "dashboard", title: "Dashboard", description: "Your buyer overview.", href: "/buyer", hrefMobile: "/", guestOk: false },
  { id: "garage", title: "My Garage", description: "Add and update your cars.", href: "/buyer/garage", hrefMobile: "/garage", guestOk: false },
  { id: "orders", title: "Orders", description: "Track parts orders and receipts.", href: "/buyer/orders", hrefMobile: "/orders", guestOk: false },
  { id: "services", title: "Services", description: "Roadside and workshop bookings.", href: "/buyer/services", hrefMobile: "/", guestOk: false },
  { id: "wishlist", title: "Wishlist", description: "Saved parts.", href: "/buyer/wishlist", hrefMobile: "/wishlist", guestOk: false },
  { id: "addresses", title: "Addresses", description: "Delivery and service locations.", href: "/buyer/addresses", hrefMobile: "/addresses", guestOk: false },
  { id: "profile", title: "Profile", description: "Name, phone, and contact details.", href: "/buyer/profile", hrefMobile: "/profile", guestOk: false },
  { id: "support", title: "Support", description: "Help tickets and order questions.", href: "/buyer/support", hrefMobile: "/support", guestOk: false },
];

const DESTINATION_ALIASES: Record<string, string> = {
  store: "shop",
  parts: "shop",
  catalog: "shop",
  basket: "cart",
  pay: "checkout",
  payment: "checkout",
  login: "auth",
  signup: "auth",
  register: "auth",
  account: "auth",
  "sign in": "auth",
  "sign up": "auth",
  "create account": "auth",
  cars: "garage",
  car: "garage",
  vehicles: "garage",
  "my cars": "garage",
  "add car": "garage",
  "add a car": "garage",
  orders: "orders",
  "my orders": "orders",
  tracking: "orders",
  bookings: "services",
  service: "services",
  mechanic: "services",
  address: "addresses",
  location: "addresses",
  settings: "profile",
  help: "support",
};

export function resolveConciergeDestination(raw: string): ConciergeDestination | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const aliased = DESTINATION_ALIASES[key] || key.replace(/\s+/g, "_");
  return CONCIERGE_DESTINATIONS.find((row) => row.id === aliased || row.title.toLowerCase() === key) ?? null;
}

export function authHref(next = "/buyer"): ConciergePendingAuth {
  const safeNext = next.startsWith("/") ? next : "/buyer";
  return {
    type: "auth",
    next: safeNext,
    href: `/auth?role=buyer&next=${encodeURIComponent(safeNext)}`,
    hrefMobile: `/login?next=${encodeURIComponent(safeNext)}`,
    title: "Create an account",
    description: "I will open sign in. Continue with Google or email to save your garage, orders, and bookings.",
  };
}

export function navigateAction(destination: ConciergeDestination, extra?: { href?: string; hrefMobile?: string }): ConciergePendingNavigate {
  return {
    type: "navigate",
    destination: destination.id,
    href: extra?.href || destination.href,
    hrefMobile: extra?.hrefMobile || destination.hrefMobile,
    title: destination.title,
    description: destination.description,
  };
}

function optionalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalYear(value: unknown): number | null {
  const year = Number(value);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
  return Math.round(year);
}

function optionalMileage(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export function optionalImageUrl(value: unknown): string {
  const raw = optionalText(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return raw;
  } catch {
    return "";
  }
}

export function vehicleDraftFromArgs(args: Record<string, unknown>, fallback?: Partial<ConciergeVehicleDraft>): ConciergeVehicleDraft {
  const fuel = optionalText(args.fuelType).toLowerCase();
  const transmission = optionalText(args.transmission).toLowerCase();
  return {
    make: optionalText(args.make) || fallback?.make || "",
    model: optionalText(args.model) || fallback?.model || "",
    year: optionalYear(args.year) ?? fallback?.year ?? 0,
    licensePlate: optionalText(args.licensePlate || args.plate) || fallback?.licensePlate || "",
    nickname: optionalText(args.nickname) || fallback?.nickname || "",
    color: optionalText(args.color) || fallback?.color || "",
    vin: optionalText(args.vin) || fallback?.vin || "",
    mileageKm: optionalMileage(args.mileageKm ?? args.mileage) ?? fallback?.mileageKm ?? null,
    fuelType: isVehicleFuelType(fuel) ? fuel : fallback?.fuelType || "",
    transmission: isVehicleTransmission(transmission) ? transmission : fallback?.transmission || "",
    isPrimary: args.isPrimary === true || fallback?.isPrimary === true,
    imageUrl: optionalImageUrl(args.imageUrl || args.photoUrl || args.photo) || fallback?.imageUrl || "",
  };
}

export function vehicleDraftSummary(draft: Partial<ConciergeVehicleDraft>, label?: string): string {
  const bits = [
    label,
    [draft.year, draft.make, draft.model].filter(Boolean).join(" "),
    draft.nickname,
    draft.licensePlate ? `plate ${draft.licensePlate}` : "",
    draft.color,
    draft.mileageKm != null ? `${draft.mileageKm} km` : "",
    draft.fuelType,
    draft.transmission,
    draft.imageUrl ? "photo attached" : "",
  ].filter((row) => typeof row === "string" && row.trim());
  return bits.join(" · ");
}

export function vehicleCreateAction(draft: ConciergeVehicleDraft): ConciergePendingVehicleCreate | { error: string } {
  if (!draft.make || !draft.model || !draft.year) {
    return { error: "Ask for make, model, and year before adding a car." };
  }
  return { type: "vehicle_create", ...draft };
}

export function vehicleUpdateAction(input: {
  vehicleId: string;
  label: string;
  current?: Partial<ConciergeVehicleDraft>;
  args: Record<string, unknown>;
}): ConciergePendingVehicleUpdate | { error: string } {
  const next = vehicleDraftFromArgs(input.args, input.current);
  const updates: ConciergePendingVehicleUpdate["updates"] = {};
  const keys: (keyof ConciergeVehicleDraft)[] = [
    "make",
    "model",
    "year",
    "licensePlate",
    "nickname",
    "color",
    "vin",
    "mileageKm",
    "fuelType",
    "transmission",
    "isPrimary",
    "imageUrl",
  ];
  for (const key of keys) {
    const value = next[key];
    const prev = input.current?.[key];
    if (value === undefined || value === "") continue;
    if (key === "year" && value === 0) continue;
    if (value === prev) continue;
    if (key === "year" && optionalYear(value) == null) continue;
    (updates as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(updates).length === 0) {
    return { error: "No vehicle fields to change. Ask which detail to update." };
  }
  return {
    type: "vehicle_update",
    vehicleId: input.vehicleId,
    label: input.label,
    updates,
    summary: vehicleDraftSummary({ ...input.current, ...updates }, input.label),
  };
}

export function profileUpdateAction(args: Record<string, unknown>): ConciergePendingProfileUpdate | { error: string } {
  const name = optionalText(args.name);
  const phone = optionalText(args.phone);
  const address = optionalText(args.address);
  if (!name && !phone && !address) {
    return { error: "Ask which profile field to change: name, phone, or address." };
  }
  return { type: "profile_update", name, phone, address };
}

export function addressCreateAction(args: Record<string, unknown>): ConciergePendingAddressCreate | { error: string } {
  const fullAddress = optionalText(args.fullAddress || args.address || args.location);
  if (!fullAddress) return { error: "Ask for the street or area before saving an address." };
  return {
    type: "address_create",
    label: optionalText(args.label) || "Home",
    fullAddress,
    isDefault: args.isDefault !== false,
  };
}

export function vehicleWritePayload(draft: Partial<ConciergeVehicleDraft>) {
  const fuelType: VehicleFuelType | undefined =
    draft.fuelType && isVehicleFuelType(draft.fuelType) ? draft.fuelType : undefined;
  const transmission: VehicleTransmission | undefined =
    draft.transmission && isVehicleTransmission(draft.transmission) ? draft.transmission : undefined;
  return {
    ...(draft.make ? { make: draft.make } : {}),
    ...(draft.model ? { model: draft.model } : {}),
    ...(draft.year ? { year: draft.year } : {}),
    ...(draft.licensePlate !== undefined ? { licensePlate: draft.licensePlate || null } : {}),
    ...(draft.nickname !== undefined ? { nickname: draft.nickname || null } : {}),
    ...(draft.color !== undefined ? { color: draft.color || null } : {}),
    ...(draft.vin !== undefined ? { vin: draft.vin || null } : {}),
    ...(draft.mileageKm !== undefined ? { mileageKm: draft.mileageKm } : {}),
    ...(fuelType ? { fuelType } : {}),
    ...(transmission ? { transmission } : {}),
    ...(draft.isPrimary !== undefined ? { isPrimary: draft.isPrimary } : {}),
    ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
    ...vehicleSpecUpdatesFromBody(draft as Record<string, unknown>),
  };
}

export async function listConciergeOrders(customerId: string, limit = 8): Promise<ConciergeOrderCard[]> {
  const orders = await listProductOrdersByCustomerId(customerId);
  return orders.slice(0, limit).map((order) => {
    const names = order.items.map((item) => item.productName).filter(Boolean);
    return {
      id: order.id,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      itemSummary: names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : ""),
      href: `/buyer/orders/${encodeURIComponent(order.id)}`,
      hrefMobile: `/orders/${encodeURIComponent(order.id)}`,
    };
  });
}

export async function listConciergeBookings(customerId: string, limit = 8): Promise<ConciergeBookingCard[]> {
  const requests = await listBuyerServiceRequests(customerId);
  return requests.slice(0, limit).map((row) => ({
    id: row.id,
    status: row.status,
    service: row.service,
    location: row.location,
    createdAt: row.createdAt.toISOString(),
    href: `/buyer/services/track/${encodeURIComponent(row.id)}`,
    hrefMobile: `/service/requesting?requestId=${encodeURIComponent(row.id)}`,
  }));
}

export function matchVehicleId(
  vehicles: Array<{ id: string; make?: string; model?: string; nickname?: string | null; licensePlate?: string | null }>,
  hint: string,
  fallbackId?: string | null,
): string | null {
  const q = hint.trim().toLowerCase();
  if (!q) return fallbackId ?? vehicles[0]?.id ?? null;
  const exact = vehicles.find((row) => row.id === hint);
  if (exact) return exact.id;
  const scored = vehicles.find((row) => {
    const hay = [row.nickname, row.make, row.model, row.licensePlate].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
  return scored?.id ?? fallbackId ?? null;
}
