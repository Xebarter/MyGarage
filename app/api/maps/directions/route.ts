import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleDirections } from '@/lib/maps/google-directions';
import { parseMapPoint } from '@/lib/maps/coords';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const origin = parseMapPoint(searchParams.get('originLat'), searchParams.get('originLng'));
    const dest = parseMapPoint(searchParams.get('destLat'), searchParams.get('destLng'));

    if (!origin || !dest) {
      return NextResponse.json(
        { error: 'originLat, originLng, destLat, destLng are required' },
        { status: 400 },
      );
    }

    const result = await fetchGoogleDirections(origin, dest);

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
