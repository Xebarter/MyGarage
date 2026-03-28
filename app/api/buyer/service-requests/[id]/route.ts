import { getBuyerServiceRequestForCustomer } from '@/lib/db';
import { listAssignmentsForRequest } from '@/lib/supabase/service-dispatch-repo';
import { processStaleOffers } from '@/lib/service-dispatch';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    await processStaleOffers();
    const request = await getBuyerServiceRequestForCustomer(id, customerId);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const assignments = await listAssignmentsForRequest(id);
    return NextResponse.json({ request, assignments });
  } catch (error) {
    console.error('GET buyer service request detail:', error);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}
