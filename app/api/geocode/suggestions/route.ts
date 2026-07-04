import { NextRequest, NextResponse } from 'next/server';

import { fetchAddressSuggestions } from '@/lib/geocode/address-suggestions';

export type { AddressSuggestion } from '@/lib/geocode/address-suggestions';

/** Production address autocomplete (Google Places with OpenStreetMap fallback). */
export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const q = params.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const limit = Math.min(
      8,
      Math.max(1, Number.parseInt(params.get('limit') ?? '6', 10) || 6),
    );
    const sessionToken = params.get('sessionToken')?.trim() || undefined;
    const lat = Number.parseFloat(params.get('lat') ?? '');
    const lng = Number.parseFloat(params.get('lng') ?? '');
    const origin =
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

    const { suggestions, provider } = await fetchAddressSuggestions(q, {
      limit,
      sessionToken,
      origin,
    });

    return NextResponse.json(
      { suggestions, provider },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('GET geocode/suggestions:', error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
