import type { BuyerVehicle } from "@/lib/supabase/buyer-vehicles-repo";
import type { BuyerServiceRequest } from "@/lib/supabase/buyer-services-repo";
import type { BuyerVehicleDocument, ServiceProviderRecommendation } from "@/lib/buyer-control-center";
import {
  getBuyerServiceRequests,
  getBuyerVehicle,
  getBuyerVehicles,
  getVehicleServiceHistory,
  listBuyerServiceRecommendationsForVehicle,
  listBuyerVehicleDocuments,
} from "@/lib/db";
import { serializeVehicleServiceHistory } from "@/lib/supabase/vehicle-service-history-repo";

const HISTORY_LIMIT = 12;
const REQUEST_LIMIT = 20;
const EXPIRING_SOON_MS = 30 * 24 * 60 * 60 * 1000;
const OPEN_REQUEST_STATUSES = new Set(["pending", "matched", "in_progress"]);

export type DocumentExpiryStatus = "none" | "valid" | "expiring_soon" | "expired";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function serializeBuyerVehicle(vehicle: BuyerVehicle) {
  return {
    id: vehicle.id,
    customerId: vehicle.customerId,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    licensePlate: vehicle.licensePlate,
    imageUrl: vehicle.imageUrl?.trim() || null,
    nickname: vehicle.nickname,
    isPrimary: vehicle.isPrimary,
    vin: vehicle.vin,
    color: vehicle.color,
    mileageKm: vehicle.mileageKm,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    trim: vehicle.trim,
    engine: vehicle.engine,
    driveType: vehicle.driveType,
    bodyType: vehicle.bodyType,
    tyreSize: vehicle.tyreSize,
    vehicleStatus: vehicle.vehicleStatus,
    nextServiceDate: iso(vehicle.nextServiceDate),
    statusUpdatedByProviderId: vehicle.statusUpdatedByProviderId,
    statusUpdatedAt: iso(vehicle.statusUpdatedAt),
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export function serializeVehicleSummary(vehicle: BuyerVehicle) {
  const full = serializeBuyerVehicle(vehicle);
  return {
    id: full.id,
    make: full.make,
    model: full.model,
    year: full.year,
    trim: full.trim,
    nickname: full.nickname,
    licensePlate: full.licensePlate,
    mileageKm: full.mileageKm,
    vehicleStatus: full.vehicleStatus,
    nextServiceDate: full.nextServiceDate,
    isPrimary: full.isPrimary,
  };
}

function serializeServiceRequest(request: BuyerServiceRequest) {
  return {
    id: request.id,
    customerId: request.customerId,
    category: request.category,
    service: request.service,
    location: request.location,
    status: request.status,
    providerId: request.providerId,
    vehicleId: request.vehicleId,
    notes: request.notes ?? "",
    acceptedAt: iso(request.acceptedAt),
    arrivedAt: iso(request.arrivedAt),
    startedAt: iso(request.startedAt),
    completedAt: iso(request.completedAt),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function documentExpiryStatus(expiresAt: Date | null): DocumentExpiryStatus {
  if (!expiresAt) return "none";
  const ms = expiresAt.getTime() - Date.now();
  if (ms < 0) return "expired";
  if (ms <= EXPIRING_SOON_MS) return "expiring_soon";
  return "valid";
}

function serializeDocument(doc: BuyerVehicleDocument) {
  return {
    id: doc.id,
    vehicleId: doc.vehicleId,
    documentType: doc.documentType,
    name: doc.name,
    fileUrl: doc.fileUrl,
    expiresAt: iso(doc.expiresAt),
    expiryStatus: documentExpiryStatus(doc.expiresAt),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function serializeRecommendation(rec: ServiceProviderRecommendation) {
  return {
    id: rec.id,
    vehicleId: rec.vehicleId,
    providerId: rec.providerId,
    requestId: rec.requestId,
    title: rec.title,
    description: rec.description,
    status: rec.status,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
  };
}

export async function buildVehicleConciergeContext(vehicle: BuyerVehicle) {
  const [history, documents, requests, recommendations] = await Promise.all([
    getVehicleServiceHistory(vehicle.id, { sortBy: "date", sortOrder: "desc" }),
    listBuyerVehicleDocuments(vehicle.customerId),
    getBuyerServiceRequests(vehicle.customerId),
    listBuyerServiceRecommendationsForVehicle(vehicle.id),
  ]);

  const vehicleRequests = requests.filter((request) => request.vehicleId === vehicle.id);
  const openRequests = vehicleRequests.filter((request) => OPEN_REQUEST_STATUSES.has(request.status));
  const recentRequests = vehicleRequests.slice(0, REQUEST_LIMIT);
  const seen = new Set<string>();
  const jobs: BuyerServiceRequest[] = [];
  for (const request of openRequests) {
    seen.add(request.id);
    jobs.push(request);
  }
  for (const request of recentRequests) {
    if (seen.has(request.id)) continue;
    seen.add(request.id);
    jobs.push(request);
  }

  return {
    vehicle: serializeBuyerVehicle(vehicle),
    history: history.slice(0, HISTORY_LIMIT).map(serializeVehicleServiceHistory),
    documents: documents.filter((doc) => doc.vehicleId === vehicle.id).map(serializeDocument),
    serviceRequests: jobs.map(serializeServiceRequest),
    recommendations: recommendations.filter((rec) => rec.status === "pending").map(serializeRecommendation),
  };
}

export async function getVehicleConciergeContext(vehicleId: string, customerId: string) {
  const vehicle = await getBuyerVehicle(vehicleId);
  if (!vehicle) return { error: "not_found" as const };
  if (vehicle.customerId !== customerId) return { error: "forbidden" as const };
  return { error: null, context: await buildVehicleConciergeContext(vehicle) };
}

export async function getCustomerConciergeContext(customerId: string) {
  const vehicles = await getBuyerVehicles(customerId);
  const primary = vehicles.find((vehicle) => vehicle.isPrimary) ?? vehicles[0] ?? null;
  return {
    vehicles: vehicles.map(serializeVehicleSummary),
    primary: primary ? await buildVehicleConciergeContext(primary) : null,
  };
}
