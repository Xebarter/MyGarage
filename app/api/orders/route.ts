import { NextRequest, NextResponse } from 'next/server';

import {
  getProductOrderByCheckoutId,
  listProductOrdersByCustomerEmail,
  listProductOrdersByCustomerId,
} from '@/lib/supabase/product-orders-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutId = (searchParams.get('checkoutId') || '').trim();
    const customerId = (searchParams.get('customerId') || '').trim();
    const email = (searchParams.get('email') || '').trim().toLowerCase();

    if (checkoutId) {
      const order = await getProductOrderByCheckoutId(checkoutId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json(order);
    }

    if (customerId) {
      const orders = await listProductOrdersByCustomerId(customerId);
      return NextResponse.json(orders);
    }

    if (email) {
      const orders = await listProductOrdersByCustomerEmail(email);
      return NextResponse.json(orders);
    }

    return NextResponse.json(
      { error: 'customerId, email, or checkoutId is required' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
