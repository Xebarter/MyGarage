import { getBuyerServiceRequestById, getBuyerVehicle, updateBuyerVehicleStatusByProvider } from '@/lib/db';
import { recordGarageServiceCompletion } from '@/lib/garage-service';
import { VEHICLE_STATUSES, type VehicleStatus } from '@/lib/garage';
import { NextRequest, NextResponse } from 'next/server';

function sameVendor(providerId: unknown, vendorId: string) {
  if (!vendorId) return false;
  const a = typeof providerId === 'string' ? providerId.trim() : String(providerId ?? '').trim();
  const b = vendorId.trim();
  return a !== '' && a === b;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: vehicleId } = await params;
    const body = await req.json();
    const vendorId = typeof body.vendorId === 'string' ? body.vendorId.trim() : '';
    const vehicleStatus = body.vehicleStatus as VehicleStatus | undefined;
    const serviceRequestId = typeof body.serviceRequestId === 'string' ? body.serviceRequestId.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    if (!vehicleStatus || !VEHICLE_STATUSES.includes(vehicleStatus)) {
      return NextResponse.json({ error: 'Valid vehicleStatus is required' }, { status: 400 });
    }

    const vehicle = await getBuyerVehicle(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (serviceRequestId) {
      const request = await getBuyerServiceRequestById(serviceRequestId);
      if (!request) {
        return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
      }
      if (!sameVendor(request.providerId, vendorId)) {
        return NextResponse.json({ error: 'Forbidden: not the assigned provider for this job' }, { status: 403 });
      }
      if (request.vehicleId && request.vehicleId !== vehicleId) {
        return NextResponse.json({ error: 'Service request is linked to a different vehicle' }, { status: 400 });
      }
    }

    let nextServiceDate: Date | null | undefined;
    if (body.nextServiceDate === null) {
      nextServiceDate = null;
    } else if (body.nextServiceDate) {
      const parsed = new Date(body.nextServiceDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid nextServiceDate' }, { status: 400 });
      }
      nextServiceDate = parsed;
    }

    if (serviceRequestId) {
      const result = await recordGarageServiceCompletion({
        serviceRequestId,
        providerId: vendorId,
        vehicleStatus,
        nextServiceDate,
        notes,
      });
      const updated = await getBuyerVehicle(vehicleId);
      return NextResponse.json({ vehicle: updated, ...result });
    }

    const updated = await updateBuyerVehicleStatusByProvider(vehicleId, {
      vehicleStatus,
      nextServiceDate,
      statusUpdatedByProviderId: vendorId,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ vehicle: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update vehicle garage status' }, { status: 500 });
  }
}
