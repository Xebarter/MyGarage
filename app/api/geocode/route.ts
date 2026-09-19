import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode/address-suggestions';

export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
    if (q.length < 3) {
      return NextResponse.json({ error: 'q is required (min 3 chars)' }, { status: 400 });
    }
    const result = await geocodeAddress(q);
    if (!result) {
      return NextResponse.json({ lat: null, lng: null, label: null });
    }
    return NextResponse.json({
      lat: result.lat,
      lng: result.lng,
      label: result.label,
    });
  } catch (error) {
    console.error('GET geocode:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
