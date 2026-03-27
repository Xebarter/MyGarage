import { getPromotions, createPromotion } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const promotions = await getPromotions();
    return NextResponse.json(promotions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const promotion = await createPromotion(body);
    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
