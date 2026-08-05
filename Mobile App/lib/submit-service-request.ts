import {
  createBuyerServiceRequest,
  fetchBuyerServiceRequestDetail,
  fetchBuyerVehicles,
} from '@/lib/api';
import {
  getActiveServiceRequestId,
  isTerminalServiceRequestStatus,
  setActiveServiceRequestId,
} from '@/lib/service-request-storage';

export type ServiceRequestPayload = {
  customerId: string;
  category: string;
  service: string;
  location: string;
  categoryId?: string;
  destinationLat?: number;
  destinationLng?: number;
};

export async function submitBuyerServiceRequest(
  payload: ServiceRequestPayload,
): Promise<{ id: string; reused?: boolean }> {
  const existingActiveId = await getActiveServiceRequestId();
  if (existingActiveId) {
    try {
      const existing = await fetchBuyerServiceRequestDetail(existingActiveId, payload.customerId);
      if (!isTerminalServiceRequestStatus(existing.request.status)) {
        return { id: existingActiveId, reused: true };
      }
    } catch {
      // Continue with a new request if the previous active id is stale.
    }
  }

  const vehicles = await fetchBuyerVehicles(payload.customerId).catch(() => []);
  const primaryVehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0];

  const body = {
    customerId: payload.customerId,
    category: payload.category,
    service: payload.service,
    location: payload.location.trim(),
    ...(payload.destinationLat != null && payload.destinationLng != null
      ? { destinationLat: payload.destinationLat, destinationLng: payload.destinationLng }
      : {}),
    ...(primaryVehicle ? { vehicleId: primaryVehicle.id } : {}),
  };

  const created = await createBuyerServiceRequest(body);
  await setActiveServiceRequestId(created.id);
  return { id: created.id };
}
