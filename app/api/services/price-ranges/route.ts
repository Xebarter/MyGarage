import { NextRequest, NextResponse } from 'next/server';

import { getServicePriceRanges } from '@/lib/supabase/vendor-service-listings-repo';

export async function GET(req: NextRequest) {
  try {
    const categoryId = new URL(req.url).searchParams.get('categoryId')?.trim() || undefined;
    const ranges = await getServicePriceRanges(categoryId);
    return NextResponse.json({ ranges });
  } catch (error) {
    console.error('GET /api/services/price-ranges failed:', error);
    return NextResponse.json({ error: 'Failed to load price ranges' }, { status: 500 });
  }
}
