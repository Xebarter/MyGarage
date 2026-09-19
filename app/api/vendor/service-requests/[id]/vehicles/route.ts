import { NextRequest, NextResponse } from 'next/server';

import { attachVehicleToServiceRequest, createBuyerVehicle, getBuyerServiceRequestById, getBuyerVehicle, getBuyerVehicles } from '@/lib/db';

function sameVendor(providerId: unknown, vendorId: string) {
  const a = typeof providerId === 'string' ? providerId.trim() : String(providerId ?? '').trim();
  return a !== '' && a === vendorId.trim();
}

function publicVehicle(vehicle: NonNullable<Awaited<ReturnType<typeof getBuyerVehicle>>>) {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    licensePlate: vehicle.licensePlate,
    nickname: vehicle.nickname,
    imageUrl: vehicle.imageUrl,
    isPrimary: vehicle.isPrimary,
    vehicleStatus: vehicle.vehicleStatus,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const vendorId = req.nextUrl.searchParams.get('vendorId')?.trim() ?? '';
    if (!id || !vendorId) {
      return NextResponse.json({ error: 'id and vendorId are required' }, { status: 400 });
    }
    const request = await getBuyerServiceRequestById(id);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.providerId && !sameVendor(request.providerId, vendorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const vehicles = await getBuyerVehicles(request.customerId);
    const linked = request.vehicleId ? vehicles.find((v) => v.id === request.vehicleId) ?? null : null;
    return NextResponse.json({
      vehicles: vehicles.map(publicVehicle),
      linkedVehicle: linked ? publicVehicle(linked) : null,
    });
  } catch (error) {
    console.error('[GET vendor request vehicles]', error);
    return NextResponse.json({ error: 'Failed to load vehicles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;
    const vendorId = typeof body.vendorId === 'string' ? body.vendorId.trim() : '';
    if (!id || !vendorId) {
      return NextResponse.json({ error: 'id and vendorId are required' }, { status: 400 });
    }
    const request = await getBuyerServiceRequestById(id);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.providerId && !sameVendor(request.providerId, vendorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingId = typeof body.vehicleId === 'string' ? body.vehicleId.trim() : '';
    if (existingId) {
      const vehicle = await getBuyerVehicle(existingId);
      if (!vehicle || vehicle.customerId !== request.customerId) {
        return NextResponse.json({ error: 'Vehicle not found for this buyer' }, { status: 400 });
      }
      await attachVehicleToServiceRequest(id, existingId);
      return NextResponse.json({ vehicle: publicVehicle(vehicle), attached: true });
    }

    const make = String(body.make ?? '').trim();
    const model = String(body.model ?? '').trim();
    const year = Number(body.year);
    if (!make || !model || !Number.isFinite(year) || year < 1900 || year > 2100) {
      return NextResponse.json({ error: 'make, model, and year are required' }, { status: 400 });
    }
    const created = await createBuyerVehicle({
      customerId: request.customerId,
      make,
      model,
      year,
      licensePlate: body.licensePlate ? String(body.licensePlate).trim() : null,
      nickname: body.nickname ? String(body.nickname).trim() : null,
      imageUrl: null,
      isPrimary: false,
      vin: null,
      color: null,
      mileageKm: null,
      fuelType: null,
      transmission: null,
    });
    await attachVehicleToServiceRequest(id, created.id);
    return NextResponse.json({ vehicle: publicVehicle(created), attached: true }, { status: 201 });
  } catch (error) {
    console.error('[POST vendor request vehicles]', error);
    return NextResponse.json({ error: 'Failed to attach vehicle' }, { status: 500 });
  }
}
