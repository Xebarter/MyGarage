import { NextRequest, NextResponse } from 'next/server';

import { listProductOrdersByVendorId } from '@/lib/supabase/product-orders-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = (searchParams.get('vendorId') || '').trim();

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const orders = await listProductOrdersByVendorId(vendorId);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendor orders' }, { status: 500 });
  }
}
