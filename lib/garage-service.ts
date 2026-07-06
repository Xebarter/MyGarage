import { getBuyerVehicleById, updateBuyerVehicleStatusByProvider } from "@/lib/supabase/buyer-vehicles-repo";
import { getBuyerServiceRequestById } from "@/lib/supabase/buyer-services-repo";
import { getVehicleServiceHistoryByRequestId } from "@/lib/supabase/vehicle-service-history-repo";
import { getVendorById } from "@/lib/supabase/vendors-repo";
import { inferServiceHistoryType } from "@/lib/garage";
import type { VehicleStatus } from "@/lib/garage";
import * as vehicleServiceHistoryRepo from "@/lib/supabase/vehicle-service-history-repo";

export type RecordGarageServiceCompletionInput = {
  serviceRequestId: string;
  providerId: string;
  vehicleStatus?: VehicleStatus;
  nextServiceDate?: Date | null;
  notes?: string;
};

/** When a provider completes work, record history and update vehicle status (provider-only fields). */
export async function recordGarageServiceCompletion(
  input: RecordGarageServiceCompletionInput,
): Promise<{ vehicleUpdated: boolean; historyCreated: boolean }> {
  const request = await getBuyerServiceRequestById(input.serviceRequestId);
  if (!request) return { vehicleUpdated: false, historyCreated: false };

  const vehicleId = request.vehicleId;
  if (!vehicleId) return { vehicleUpdated: false, historyCreated: false };

  const vehicle = await getBuyerVehicleById(vehicleId);
  if (!vehicle) return { vehicleUpdated: false, historyCreated: false };

  const vendor = await getVendorById(input.providerId);
  const providerName = vendor?.name?.trim() || "MyGarage Provider";

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
      notes: input.notes?.trim() || `Service completed at ${request.location}`.trim(),
      status: "completed",
    });
    historyCreated = true;
  } else if (input.notes?.trim()) {
    await vehicleServiceHistoryRepo.updateVehicleServiceHistoryById(existing.id, {
      notes: input.notes.trim(),
    });
  }

  const statusToSet = input.vehicleStatus ?? "no_active_issues";
  await updateBuyerVehicleStatusByProvider(vehicleId, {
    vehicleStatus: statusToSet,
    nextServiceDate: input.nextServiceDate,
    statusUpdatedByProviderId: input.providerId,
  });

  return { vehicleUpdated: true, historyCreated };
}
