import { createBuyerServiceRequest, getBuyerServiceRequests } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const requests = await getBuyerServiceRequests(customerId);
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buyer service requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, category, service, location } = body;
    if (!customerId || !category || !service || !location) {
      return NextResponse.json({ error: 'customerId, category, service and location are required' }, { status: 400 });
    }
    const created = await createBuyerServiceRequest({
      customerId,
      category,
      service,
      location,
      status: 'pending',
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create buyer service request' }, { status: 500 });
  }
}
