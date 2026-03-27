import { getAllBuyerServiceRequests, updateBuyerServiceRequestStatus } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const requests = await getAllBuyerServiceRequests();
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch service requests' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }
    if (!['pending', 'matched', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const updated = await updateBuyerServiceRequestStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update service request status' }, { status: 500 });
  }
}
