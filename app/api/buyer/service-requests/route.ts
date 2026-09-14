import { createBuyerServiceRequest, getBuyerServiceRequests, getCustomer } from '@/lib/db';
import { startDispatchForNewRequest } from '@/lib/service-dispatch';
import { resolveBuyerServiceCategory } from '@/lib/services-catalog';
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
    const { customerId, service, location, vehicleId } = body;
    const resolvedCategory = resolveBuyerServiceCategory({
      category: typeof body.category === 'string' ? body.category : null,
      categoryId: typeof body.categoryId === 'string' ? body.categoryId : null,
    });
    const category = resolvedCategory?.title ?? '';
    const destinationLat = body.destinationLat != null ? Number(body.destinationLat) : null;
    const destinationLng = body.destinationLng != null ? Number(body.destinationLng) : null;
    if (!customerId || !category || !service || !location) {
      return NextResponse.json({ error: 'customerId, category, service and location are required' }, { status: 400 });
    }
    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const bodyPhone = typeof body.buyerContactPhone === 'string' ? body.buyerContactPhone.trim() : '';
    const bodyName = typeof body.buyerContactName === 'string' ? body.buyerContactName.trim() : '';
    const contactPhone = countPhoneDigits(customer.phone) >= 9 ? customer.phone.trim() : bodyPhone;
    if (countPhoneDigits(contactPhone) < 9) {
      return NextResponse.json(
        { error: 'A valid mobile number is required to request service.', code: 'PHONE_REQUIRED' },
        { status: 400 },
      );
    }
    const contactName =
      bodyName || (customer.name || '').trim() || 'Buyer';
    const created = await createBuyerServiceRequest({
      customerId,
      category,
      service,
      location,
      status: 'pending',
      buyerContactPhone: contactPhone,
      buyerContactName: contactName,
      ...(vehicleId ? { vehicleId: String(vehicleId).trim() } : {}),
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
    console.error('POST /api/buyer/service-requests failed:', error);
    return NextResponse.json({ error: 'Failed to create buyer service request' }, { status: 500 });
  }
}
