import { createBuyerVehicle, getBuyerVehicles } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const vehicles = await getBuyerVehicles(customerId);
    return NextResponse.json(vehicles);
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
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create buyer vehicle' }, { status: 500 });
  }
}
