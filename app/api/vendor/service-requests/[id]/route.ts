import { getBuyerServiceRequestById, getBuyerVehicle, getVendor } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }
    const vendorId = new URL(req.url).searchParams.get('vendorId')?.trim() ?? '';
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    const request = await getBuyerServiceRequestById(id);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (request.providerId !== vendorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const vendor = await getVendor(vendorId);
    const vehicle = request.vehicleId ? await getBuyerVehicle(request.vehicleId) : null;
    return NextResponse.json({
      request,
      providerPhone: vendor?.phone ?? '',
      providerName: vendor?.name ?? '',
      vehicle: vehicle
        ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            licensePlate: vehicle.licensePlate,
            nickname: vehicle.nickname,
            imageUrl: vehicle.imageUrl,
            vehicleStatus: vehicle.vehicleStatus,
          }
        : null,
    });
  } catch (error) {
    console.error('GET vendor service request:', error);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}
