import { NextRequest, NextResponse } from 'next/server';

import {
  listVendorServiceListings,
  upsertVendorServiceListings,
  type VendorServiceListingUpsert,
} from '@/lib/supabase/vendor-service-listings-repo';

export async function GET(req: NextRequest) {
  try {
    const vendorId = new URL(req.url).searchParams.get('vendorId')?.trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    const listings = await listVendorServiceListings(vendorId);
    return NextResponse.json(listings);
  } catch (error) {
    console.error('GET /api/vendor/service-listings failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch service listings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      vendorId?: string;
      listings?: VendorServiceListingUpsert[];
    };
    const vendorId = body.vendorId?.trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    if (!Array.isArray(body.listings) || body.listings.length === 0) {
      return NextResponse.json({ error: 'listings array is required' }, { status: 400 });
    }

    const saved = await upsertVendorServiceListings(vendorId, body.listings);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('PUT /api/vendor/service-listings failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to save service listings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
