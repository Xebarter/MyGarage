import { getBuyerServiceRequestForCustomer, getVendor } from '@/lib/db';
import { listAssignmentsForRequest } from '@/lib/supabase/service-dispatch-repo';
import { processStaleOffersBestEffort } from '@/lib/service-dispatch';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    await processStaleOffersBestEffort();
    const request = await getBuyerServiceRequestForCustomer(id, customerId);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const assignments = await listAssignmentsForRequest(id);
    const provider =
      request.providerId != null && request.providerId !== ''
        ? await getVendor(request.providerId)
        : undefined;
    return NextResponse.json({
      request,
      assignments,
      providerContact:
        provider != null
          ? { id: provider.id, name: provider.name, phone: provider.phone ?? '' }
          : null,
    });
  } catch (error) {
    console.error('GET buyer service request detail:', error);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}
