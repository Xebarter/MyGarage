import {
  getActiveFulfillmentRequestForVendor,
  getPendingAssignmentForVendor,
} from '@/lib/supabase/service-dispatch-repo';
import { processStaleOffersBestEffort } from '@/lib/service-dispatch';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const vendorId = new URL(req.url).searchParams.get('vendorId');
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    await processStaleOffersBestEffort();
    const [offer, activeJob] = await Promise.all([
      getPendingAssignmentForVendor(vendorId),
      getActiveFulfillmentRequestForVendor(vendorId),
    ]);
    return NextResponse.json({
      offer: offer
        ? {
            assignment: {
              id: offer.id,
              requestId: offer.request_id,
              providerId: offer.provider_id,
              assignedAt: offer.assigned_at,
              response: offer.response,
            },
            request: offer.request,
          }
        : null,
      activeJob,
    });
  } catch (error) {
    console.error('GET dispatch me:', error);
    return NextResponse.json({ error: 'Failed to load dispatch state' }, { status: 500 });
  }
}
