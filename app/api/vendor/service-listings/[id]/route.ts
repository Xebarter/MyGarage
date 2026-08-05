import { NextRequest, NextResponse } from 'next/server';

import { deleteVendorServiceListing } from '@/lib/supabase/vendor-service-listings-repo';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const vendorId = new URL(req.url).searchParams.get('vendorId')?.trim();
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    if (!id?.trim()) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteVendorServiceListing(vendorId, id.trim());
    if (!deleted) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/vendor/service-listings/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete service listing' }, { status: 500 });
  }
}
