import { getVendorOrders } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const orders = await getVendorOrders(vendorId);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendor orders' }, { status: 500 });
  }
}
