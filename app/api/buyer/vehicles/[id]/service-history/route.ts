import { getBuyerServiceRequestById, getBuyerVehicle, getVehicleServiceHistory } from '@/lib/db';
import {
  SERVICE_HISTORY_STATUSES,
  SERVICE_HISTORY_TYPES,
  type ServiceHistoryStatus,
  type ServiceHistoryType,
} from '@/lib/garage';
import { NextRequest, NextResponse } from 'next/server';

function serializeHistoryEntry(
  entry: Awaited<ReturnType<typeof getVehicleServiceHistory>>[number],
  linkedRequest: Awaited<ReturnType<typeof getBuyerServiceRequestById>> | null,
) {
  return {
    id: entry.id,
    vehicleId: entry.vehicleId,
    customerId: entry.customerId,
    serviceRequestId: entry.serviceRequestId,
    serviceType: entry.serviceType,
    serviceName: entry.serviceName,
    serviceDate: entry.serviceDate.toISOString(),
    providerId: entry.providerId,
    providerName: entry.providerName,
    notes: entry.notes,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    linkedRequest: linkedRequest
      ? {
          id: linkedRequest.id,
          category: linkedRequest.category,
          location: linkedRequest.location,
          requestStatus: linkedRequest.status,
          createdAt: linkedRequest.createdAt.toISOString(),
          acceptedAt: linkedRequest.acceptedAt?.toISOString() ?? null,
          arrivedAt: linkedRequest.arrivedAt?.toISOString() ?? null,
          startedAt: linkedRequest.startedAt?.toISOString() ?? null,
          completedAt: linkedRequest.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

function serializeVehicle(vehicle: NonNullable<Awaited<ReturnType<typeof getBuyerVehicle>>>) {
  return {
    ...vehicle,
    nextServiceDate: vehicle.nextServiceDate?.toISOString() ?? null,
    statusUpdatedAt: vehicle.statusUpdatedAt?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const vehicle = await getBuyerVehicle(id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get('serviceType') as ServiceHistoryType | null;
    const providerId = searchParams.get('providerId') || undefined;
    const status = searchParams.get('status') as ServiceHistoryStatus | null;
    const sortBy = (searchParams.get('sortBy') || 'date') as 'date' | 'serviceType' | 'provider' | 'status';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    if (serviceType && !SERVICE_HISTORY_TYPES.includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid serviceType filter' }, { status: 400 });
    }
    if (status && !SERVICE_HISTORY_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const history = await getVehicleServiceHistory(id, {
      serviceType: serviceType ?? undefined,
      providerId,
      status: status ?? undefined,
      sortBy,
      sortOrder,
    });

    const requestCache = new Map<string, Awaited<ReturnType<typeof getBuyerServiceRequestById>> | null>();
    const enriched = await Promise.all(
      history.map(async (entry) => {
        if (!entry.serviceRequestId) {
          return serializeHistoryEntry(entry, null);
        }
        if (!requestCache.has(entry.serviceRequestId)) {
          const linked = await getBuyerServiceRequestById(entry.serviceRequestId);
          requestCache.set(entry.serviceRequestId, linked);
        }
        return serializeHistoryEntry(entry, requestCache.get(entry.serviceRequestId) ?? null);
      }),
    );

    return NextResponse.json({ vehicle: serializeVehicle(vehicle), history: enriched });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vehicle service history' }, { status: 500 });
  }
}
