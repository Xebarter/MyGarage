import { NextRequest, NextResponse } from 'next/server';

import { parseProductOrderStatus } from '@/lib/product-order-status';
import {
  getProductOrderById,
  updateProductOrderStatus,
} from '@/lib/supabase/product-orders-repo';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const order = await getProductOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const nextStatus = parseProductOrderStatus(body?.status);
    if (!nextStatus) {
      return NextResponse.json({ error: 'A valid status is required' }, { status: 400 });
    }

    const order = await updateProductOrderStatus(id, {
      status: nextStatus,
      trackingNumber: typeof body?.trackingNumber === 'string' ? body.trackingNumber : undefined,
      carrier: typeof body?.carrier === 'string' ? body.carrier : undefined,
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
