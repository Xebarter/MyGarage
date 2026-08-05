import { NextRequest, NextResponse } from 'next/server';

import {
  ensureServiceCatalogPricesSeeded,
  listServiceCatalogPrices,
} from '@/lib/supabase/service-catalog-prices-repo';

/** Public read of platform (admin) prices for provider apps and buyers. */
export async function GET(req: NextRequest) {
  try {
    await ensureServiceCatalogPricesSeeded();
    const categoryId = new URL(req.url).searchParams.get('categoryId')?.trim() || undefined;
    const prices = await listServiceCatalogPrices(categoryId);
    return NextResponse.json({
      prices: prices.map((p) => ({
        categoryId: p.categoryId,
        serviceName: p.serviceName,
        priceUgx: p.priceUgx,
        currency: p.currency,
      })),
    });
  } catch (error) {
    console.error('GET /api/services/catalog-prices failed:', error);
    return NextResponse.json({ error: 'Failed to load catalog prices' }, { status: 500 });
  }
}
