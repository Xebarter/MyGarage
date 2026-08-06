import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleDirections } from '@/lib/maps/google-directions';

function parseCoord(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const originLat = parseCoord(searchParams.get('originLat'));
    const originLng = parseCoord(searchParams.get('originLng'));
    const destLat = parseCoord(searchParams.get('destLat'));
    const destLng = parseCoord(searchParams.get('destLng'));

    if (
      originLat == null ||
      originLng == null ||
      destLat == null ||
      destLng == null
    ) {
      return NextResponse.json(
        { error: 'originLat, originLng, destLat, destLng are required' },
        { status: 400 },
      );
    }

    const result = await fetchGoogleDirections(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng },
    );

    return NextResponse.json({
      path: result.path,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      source: result.source,
      etaMinutes:
        result.durationSeconds != null
          ? Math.max(1, Math.round(result.durationSeconds / 60))
          : null,
    });
  } catch (error) {
    console.error('GET /api/maps/directions failed:', error);
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}
