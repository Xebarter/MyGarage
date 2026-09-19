import { createBuyerVehicle, getBuyerVehicles } from '@/lib/db';
import { isVehicleFuelType, isVehicleTransmission, vehicleSpecUpdatesFromBody } from '@/lib/garage';
import { listLatestServiceHistoryByVehicleIds, serializeVehicleServiceHistory } from '@/lib/supabase/vehicle-service-history-repo';
import { NextRequest, NextResponse } from 'next/server';

function serializeVehicle(vehicle: Awaited<ReturnType<typeof getBuyerVehicles>>[number]) {
  return {
    ...vehicle,
    imageUrl: vehicle.imageUrl?.trim() || null,
    nextServiceDate: vehicle.nextServiceDate?.toISOString() ?? null,
    statusUpdatedAt: vehicle.statusUpdatedAt?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const vehicles = await getBuyerVehicles(customerId);
    const latest = await listLatestServiceHistoryByVehicleIds(vehicles.map((v) => v.id));
    return NextResponse.json(
      vehicles.map((vehicle) => ({
        ...serializeVehicle(vehicle),
        lastService: latest[vehicle.id] ? serializeVehicleServiceHistory(latest[vehicle.id]!) : null,
      })),
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch buyer vehicles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, make, model, year, licensePlate, imageUrl, nickname, isPrimary } = body;
    if (!customerId || !make || !model || year == null) {
      return NextResponse.json({ error: 'customerId, make, model and year are required' }, { status: 400 });
    }
    const parsedYear = Number(year);
    if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      return NextResponse.json({ error: 'year must be between 1900 and 2100' }, { status: 400 });
    }
    const created = await createBuyerVehicle({
      customerId,
      make: String(make).trim(),
      model: String(model).trim(),
      year: parsedYear,
      licensePlate: licensePlate ? String(licensePlate).trim() : null,
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      nickname: nickname ? String(nickname).trim() : null,
      isPrimary: Boolean(isPrimary),
      vin: body.vin ? String(body.vin).trim() : null,
      color: body.color ? String(body.color).trim() : null,
      mileageKm: body.mileageKm != null && Number.isFinite(Number(body.mileageKm)) ? Number(body.mileageKm) : null,
      fuelType: typeof body.fuelType === 'string' && isVehicleFuelType(body.fuelType) ? body.fuelType : null,
      transmission:
        typeof body.transmission === 'string' && isVehicleTransmission(body.transmission) ? body.transmission : null,
      ...vehicleSpecUpdatesFromBody(body as Record<string, unknown>),
    });
    return NextResponse.json(serializeVehicle(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create buyer vehicle' }, { status: 500 });
  }
}
