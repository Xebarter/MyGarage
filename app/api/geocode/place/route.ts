import { NextRequest, NextResponse } from 'next/server';

import { fetchPlaceDetails } from '@/lib/geocode/address-suggestions';

/** Resolve a Google place id to coordinates (used after autocomplete selection). */
export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const placeId = params.get('placeId')?.trim() ?? '';
    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    const sessionToken = params.get('sessionToken')?.trim() || undefined;
    const place = await fetchPlaceDetails(placeId, sessionToken);

    return NextResponse.json(place, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not resolve place';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
