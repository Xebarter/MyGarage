import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { parseProductOrderStatus } from '@/lib/product-order-status';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  updateProductOrderStatus,
  vendorOwnsOrderLine,
} from '@/lib/supabase/product-orders-repo';

async function resolveUser(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data.user) return data.user;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function PATCH(
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

    const user = await resolveUser(req);
    const vendorId = String(body?.vendorId ?? user?.id ?? '').trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const ownsLine = await vendorOwnsOrderLine(id, vendorId);
    if (!ownsLine) {
      return NextResponse.json({ error: 'You can only update orders that include your items' }, { status: 403 });
    }

    const order = await updateProductOrderStatus(id, {
      status: nextStatus,
      trackingNumber: typeof body?.trackingNumber === 'string' ? body.trackingNumber : undefined,
      carrier: typeof body?.carrier === 'string' ? body.carrier : undefined,
      enforceTransition: true,
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    const status = message.startsWith('Cannot move') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
