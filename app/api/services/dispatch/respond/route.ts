import { respondToDispatchOffer } from '@/lib/service-dispatch';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assignmentId = body.assignmentId as string | undefined;
    const vendorId = body.vendorId as string | undefined;
    const action = body.action as string | undefined;
    if (!assignmentId || !vendorId || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json({ error: 'assignmentId, vendorId, and action (accept|decline) are required' }, { status: 400 });
    }
    const result = await respondToDispatchOffer(assignmentId, vendorId, action);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Failed' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST dispatch respond:', error);
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 });
  }
}
