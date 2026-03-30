import { createBuyerServiceRequest, getBuyerServiceRequests, getCustomer } from '@/lib/db';
import { startDispatchForNewRequest } from '@/lib/service-dispatch';
import { NextRequest, NextResponse } from 'next/server';

function countPhoneDigits(value: string): number {
  return (value || '').replace(/\D/g, '').length;
}

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
    const destinationLat = body.destinationLat != null ? Number(body.destinationLat) : null;
    const destinationLng = body.destinationLng != null ? Number(body.destinationLng) : null;
    if (!customerId || !category || !service || !location) {
      return NextResponse.json({ error: 'customerId, category, service and location are required' }, { status: 400 });
    }
    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    if (countPhoneDigits(customer.phone) < 9) {
      return NextResponse.json(
        {
          error:
            'Add a valid mobile number to your buyer account before requesting service. Open Buyer profile or complete sign-in to add your phone.',
        },
        { status: 400 },
      );
    }
    const created = await createBuyerServiceRequest({
      customerId,
      category,
      service,
      location,
      status: 'pending',
      buyerContactPhone: customer.phone.trim(),
      buyerContactName: (customer.name || '').trim() || 'Buyer',
      ...(destinationLat != null &&
      destinationLng != null &&
      Number.isFinite(destinationLat) &&
      Number.isFinite(destinationLng)
        ? { destinationLat, destinationLng }
        : {}),
    });
    try {
      await startDispatchForNewRequest(created.id);
    } catch (dispatchError) {
      console.error('startDispatchForNewRequest failed:', dispatchError);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create buyer service request' }, { status: 500 });
  }
}
