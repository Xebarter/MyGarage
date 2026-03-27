import { getBuyerProviderRatings, upsertBuyerProviderRating } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const ratings = await getBuyerProviderRatings(customerId);
    return NextResponse.json(ratings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buyer provider ratings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, providerId, stars } = body;
    if (!customerId || !providerId || !stars) {
      return NextResponse.json({ error: 'customerId, providerId and stars are required' }, { status: 400 });
    }
    if (typeof stars !== 'number' || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'stars must be a number between 1 and 5' }, { status: 400 });
    }
    const saved = await upsertBuyerProviderRating({ customerId, providerId, stars });
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save buyer provider rating' }, { status: 500 });
  }
}
