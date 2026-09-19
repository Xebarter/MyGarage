import { bumpBuyerVehicleMileageIfHigher, getBuyerVehicleById, updateBuyerVehicleStatusByProvider } from "@/lib/supabase/buyer-vehicles-repo";
import {
  attachVehicleToServiceRequest,
  getBuyerServiceRequestById,
} from "@/lib/supabase/buyer-services-repo";
import { upsertJobFollowUpRecommendation } from "@/lib/supabase/buyer-control-center-repo";
import { getVehicleServiceHistoryByRequestId } from "@/lib/supabase/vehicle-service-history-repo";
import { getVendorById } from "@/lib/supabase/vendors-repo";
import { inferServiceHistoryType, VEHICLE_STATUSES, type VehicleStatus } from "@/lib/garage";
import * as vehicleServiceHistoryRepo from "@/lib/supabase/vehicle-service-history-repo";

export type GarageCompletionReport = {
  vehicleStatus?: VehicleStatus;
  nextServiceDate?: Date | null;
  notes?: string;
  findings?: string;
  recommendations?: string;
  partsUsed?: string;
  odometerKm?: number | null;
  photoUrls?: string[];
  laborHours?: number | null;
  attachVehicleId?: string | null;
};

export type RecordGarageServiceCompletionInput = {
  serviceRequestId: string;
  providerId: string;
} & GarageCompletionReport;

function parsePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.startsWith("http://") || item.startsWith("https://"))
    .slice(0, 8);
}

export function parseGarageCompletionBody(body: Record<string, unknown>): GarageCompletionReport {
  const vehicleStatus = body.vehicleStatus as VehicleStatus | undefined;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const findings = typeof body.findings === "string" ? body.findings.trim() : "";
  const recommendations = typeof body.recommendations === "string" ? body.recommendations.trim() : "";
  const partsUsed = typeof body.partsUsed === "string" ? body.partsUsed.trim() : "";
  const attachVehicleId =
    typeof body.attachVehicleId === "string"
      ? body.attachVehicleId.trim()
      : typeof body.vehicleId === "string"
        ? body.vehicleId.trim()
        : "";

  let nextServiceDate: Date | null | undefined;
  if (body.nextServiceDate === null) {
    nextServiceDate = null;
  } else if (body.nextServiceDate) {
    const parsed = new Date(body.nextServiceDate as string);
    if (!Number.isNaN(parsed.getTime())) nextServiceDate = parsed;
  }

  const odometerRaw = body.odometerKm ?? body.odometer_km;
  const odometerKm =
    odometerRaw === null || odometerRaw === ""
      ? null
      : Number.isFinite(Number(odometerRaw))
        ? Math.max(0, Math.round(Number(odometerRaw)))
        : undefined;

  const laborRaw = body.laborHours ?? body.labor_hours;
  const laborHours =
    laborRaw === null || laborRaw === ""
      ? null
      : Number.isFinite(Number(laborRaw))
        ? Math.max(0, Number(laborRaw))
        : undefined;

  return {
    vehicleStatus: vehicleStatus && VEHICLE_STATUSES.includes(vehicleStatus) ? vehicleStatus : undefined,
    nextServiceDate,
    notes,
    findings,
    recommendations,
    partsUsed,
    odometerKm,
    photoUrls: parsePhotoUrls(body.photoUrls ?? body.photo_urls),
    laborHours,
    attachVehicleId: attachVehicleId || null,
  };
}

/** When a provider completes work, record history and update vehicle status (provider-only fields). */
export async function recordGarageServiceCompletion(
  input: RecordGarageServiceCompletionInput,
): Promise<{ vehicleUpdated: boolean; historyCreated: boolean; vehicleId: string | null }> {
  let request = await getBuyerServiceRequestById(input.serviceRequestId);
  if (!request) return { vehicleUpdated: false, historyCreated: false, vehicleId: null };

  let vehicleId = request.vehicleId;
  const attachId = input.attachVehicleId?.trim() || null;
  if (attachId && attachId !== vehicleId) {
    const vehicle = await getBuyerVehicleById(attachId);
    if (vehicle && vehicle.customerId === request.customerId) {
      const attached = await attachVehicleToServiceRequest(request.id, attachId);
      if (attached) request = attached;
      vehicleId = attachId;
    }
  }

  if (!vehicleId) return { vehicleUpdated: false, historyCreated: false, vehicleId: null };

  const vehicle = await getBuyerVehicleById(vehicleId);
  if (!vehicle) return { vehicleUpdated: false, historyCreated: false, vehicleId: null };

  const vendor = await getVendorById(input.providerId);
  const providerName = vendor?.name?.trim() || "MyGarage Provider";
  const notes = input.notes?.trim() || `Service completed at ${request.location}`.trim();
  const findings = input.findings?.trim() || "";
  const recommendations = input.recommendations?.trim() || "";
  const partsUsed = input.partsUsed?.trim() || "";
  const photoUrls = input.photoUrls ?? [];
  const odometerKm = input.odometerKm ?? null;
  const laborHours = input.laborHours ?? null;

  let historyCreated = false;
  const existing = await getVehicleServiceHistoryByRequestId(input.serviceRequestId);
  if (!existing) {
    await vehicleServiceHistoryRepo.insertVehicleServiceHistory({
      vehicleId,
      customerId: request.customerId,
      serviceRequestId: input.serviceRequestId,
      serviceType: inferServiceHistoryType(request.category, request.service),
      serviceName: request.service,
      serviceDate: request.completedAt ?? new Date(),
      providerId: input.providerId,
      providerName,
      notes,
      findings,
      recommendations,
      partsUsed,
      odometerKm,
      photoUrls,
      laborHours,
      status: "completed",
    });
    historyCreated = true;
  } else {
    await vehicleServiceHistoryRepo.updateVehicleServiceHistoryById(existing.id, {
      notes,
      findings,
      recommendations,
      partsUsed,
      odometerKm,
      photoUrls,
      laborHours,
    });
  }

  const statusToSet = input.vehicleStatus ?? "no_active_issues";
  await updateBuyerVehicleStatusByProvider(vehicleId, {
    vehicleStatus: statusToSet,
    nextServiceDate: input.nextServiceDate,
    statusUpdatedByProviderId: input.providerId,
  });

  if (odometerKm != null) {
    await bumpBuyerVehicleMileageIfHigher(vehicleId, odometerKm);
  }

  if (recommendations) {
    await upsertJobFollowUpRecommendation({
      customerId: request.customerId,
      vehicleId,
      providerId: input.providerId,
      requestId: input.serviceRequestId,
      title: `Follow-up: ${request.service}`,
      description: recommendations,
    });
  }

  return { vehicleUpdated: true, historyCreated, vehicleId };
}
