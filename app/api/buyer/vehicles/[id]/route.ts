import { deleteBuyerVehicle, getBuyerVehicle, updateBuyerVehicle } from '@/lib/db';
import { isVehicleFuelType, isVehicleTransmission, vehicleSpecUpdatesFromBody } from '@/lib/garage';
import { NextRequest, NextResponse } from 'next/server';

function serializeVehicle(vehicle: NonNullable<Awaited<ReturnType<typeof getBuyerVehicle>>>) {
  return {
    ...vehicle,
    imageUrl: vehicle.imageUrl?.trim() || null,
    nextServiceDate: vehicle.nextServiceDate?.toISOString() ?? null,
    statusUpdatedAt: vehicle.statusUpdatedAt?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const vehicle = await getBuyerVehicle(id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json(serializeVehicle(vehicle));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.vehicleStatus !== undefined || body.nextServiceDate !== undefined) {
      return NextResponse.json(
        { error: 'Vehicle status and next service date can only be updated by a service provider' },
        { status: 403 },
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.customerId !== undefined) updates.customerId = body.customerId;
    if (body.make !== undefined) updates.make = body.make;
    if (body.model !== undefined) updates.model = body.model;
    if (body.year !== undefined) {
      const parsedYear = Number(body.year);
      if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        return NextResponse.json({ error: 'year must be between 1900 and 2100' }, { status: 400 });
      }
      updates.year = parsedYear;
    }
    if (body.licensePlate !== undefined) updates.licensePlate = body.licensePlate;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.isPrimary !== undefined) updates.isPrimary = Boolean(body.isPrimary);
    if (body.vin !== undefined) updates.vin = body.vin ? String(body.vin).trim() : null;
    if (body.color !== undefined) updates.color = body.color ? String(body.color).trim() : null;
    if (body.mileageKm !== undefined) {
      updates.mileageKm =
        body.mileageKm === null || body.mileageKm === ""
          ? null
          : Number.isFinite(Number(body.mileageKm))
            ? Number(body.mileageKm)
            : null;
    }
    if (body.fuelType !== undefined) {
      updates.fuelType =
        body.fuelType && typeof body.fuelType === 'string' && isVehicleFuelType(body.fuelType)
          ? body.fuelType
          : null;
    }
    if (body.transmission !== undefined) {
      updates.transmission =
        body.transmission && typeof body.transmission === 'string' && isVehicleTransmission(body.transmission)
          ? body.transmission
          : null;
    }
    Object.assign(updates, vehicleSpecUpdatesFromBody(body as Record<string, unknown>));

    const updated = await updateBuyerVehicle(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json(serializeVehicle(updated));
  } catch {
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await deleteBuyerVehicle(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}
