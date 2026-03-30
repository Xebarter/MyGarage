import { NextRequest, NextResponse } from 'next/server';

/** Server-side Nominatim proxy (respects their usage policy; no API key). */
export async function GET(req: NextRequest) {
  try {
    const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
    if (q.length < 3) {
      return NextResponse.json({ error: 'q is required (min 3 chars)' }, { status: 400 });
    }
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'MyGarage/1.0 (https://mygarage.example; service dispatch geocoding)',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 });
    }
    const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = data[0];
    if (!first?.lat || !first?.lon) {
      return NextResponse.json({ lat: null, lng: null, label: null });
    }
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ lat: null, lng: null, label: null });
    }
    return NextResponse.json({
      lat,
      lng,
      label: first.display_name ?? null,
    });
  } catch (error) {
    console.error('GET geocode:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
