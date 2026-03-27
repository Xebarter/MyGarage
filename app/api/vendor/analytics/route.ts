import { getVendorAnalytics } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const analytics = await getVendorAnalytics(vendorId);
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendor analytics' }, { status: 500 });
  }
}
