import { NextRequest, NextResponse } from 'next/server';

import { deleteVendorServiceListing } from '@/lib/supabase/vendor-service-listings-repo';

/**
 * POST body delete — preferred by the mobile apps.
 * (Some clients mishandle DELETE across apex→www 308 redirects.)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      vendorId?: string;
      id?: string;
      listingId?: string;
    };
    const vendorId = body.vendorId?.trim();
    const id = (body.id ?? body.listingId)?.trim();

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteVendorServiceListing(vendorId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/vendor/service-listings/delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete service listing' }, { status: 500 });
  }
}
