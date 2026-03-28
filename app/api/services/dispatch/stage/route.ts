import { advanceRequestStage } from '@/lib/service-dispatch';
import { getBuyerServiceRequestFullRow } from '@/lib/supabase/service-dispatch-repo';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestId = body.requestId as string | undefined;
    const vendorId = body.vendorId as string | undefined;
    const stage = body.stage as string | undefined;
    if (!requestId || !vendorId || !['arrived', 'started', 'completed'].includes(stage ?? '')) {
      return NextResponse.json({ error: 'requestId, vendorId, and stage (arrived|started|completed) are required' }, { status: 400 });
    }
    const row = await getBuyerServiceRequestFullRow(requestId);
    if (!row || row.provider_id !== vendorId) {
      return NextResponse.json({ error: 'Request not found or not assigned to this provider' }, { status: 403 });
    }
    if (row.status === 'cancelled' || row.status === 'completed' || row.status === 'pending') {
      return NextResponse.json({ error: 'Invalid request state for this action' }, { status: 400 });
    }
    await advanceRequestStage(requestId, stage as 'arrived' | 'started' | 'completed');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST dispatch stage:', error);
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 });
  }
}
