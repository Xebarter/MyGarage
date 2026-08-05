import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { userHasAdminAccess } from '@/lib/auth-admin';
import {
  ensureServiceCatalogPricesSeeded,
  listServiceCatalogPrices,
  upsertServiceCatalogPrices,
} from '@/lib/supabase/service-catalog-prices-repo';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !userHasAdminAccess(user)) {
    return null;
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    await ensureServiceCatalogPricesSeeded();
    const categoryId = new URL(req.url).searchParams.get('categoryId')?.trim() || undefined;
    const prices = await listServiceCatalogPrices(categoryId);
    return NextResponse.json({ prices });
  } catch (error) {
    console.error('GET /api/admin/service-pricing failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to load service pricing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 });
    }

    const body = (await req.json()) as {
      prices?: Array<{ categoryId?: string; serviceName?: string; priceUgx?: number }>;
    };
    if (!Array.isArray(body.prices) || body.prices.length === 0) {
      return NextResponse.json({ error: 'prices array is required' }, { status: 400 });
    }

    const items = body.prices.map((p) => ({
      categoryId: String(p.categoryId ?? '').trim(),
      serviceName: String(p.serviceName ?? '').trim(),
      priceUgx: Number(p.priceUgx),
    }));

    const prices = await upsertServiceCatalogPrices(items);
    return NextResponse.json({ prices });
  } catch (error) {
    console.error('PUT /api/admin/service-pricing failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to save service pricing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
