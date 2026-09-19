import { getBuyerServiceRequestForCustomer, getBuyerVehicle, getVendor, countProviderCompletedServiceJobs, updateBuyerServiceRequestDestinationCoords } from '@/lib/db';
import { serializeBuyerServiceRequest } from '@/lib/supabase/buyer-services-repo';
import { listAssignmentsForRequest } from '@/lib/supabase/service-dispatch-repo';
import { cancelBuyerServiceSearch, processStaleOffersBestEffort, restartBuyerServiceSearch } from '@/lib/service-dispatch';
import { parseMapPoint } from '@/lib/maps/coords';
import { resolveServiceDestination } from '@/lib/geocode/address-suggestions';
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
    let request = await getBuyerServiceRequestForCustomer(id, customerId);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!parseMapPoint(request.destinationLat, request.destinationLng)) {
      const dest = await resolveServiceDestination({ location: request.location });
      if (dest) {
        const saved = await updateBuyerServiceRequestDestinationCoords(id, dest.lat, dest.lng);
        if (saved) request = saved;
      }
    }
    const assignments = await listAssignmentsForRequest(id);
    const provider =
      request.providerId != null && request.providerId !== ''
        ? await getVendor(request.providerId)
        : undefined;
    const completedJobs =
      provider != null ? await countProviderCompletedServiceJobs(provider.id) : 0;
    const vehicle = request.vehicleId ? await getBuyerVehicle(request.vehicleId) : null;
    return NextResponse.json({
      request: serializeBuyerServiceRequest(request),
      vehicle: vehicle
        ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            licensePlate: vehicle.licensePlate,
            nickname: vehicle.nickname,
            imageUrl: vehicle.imageUrl,
          }
        : null,
      assignments,
      providerContact:
        provider != null
          ? {
              id: provider.id,
              name: provider.name,
              businessName: provider.name,
              phone: provider.phone ?? '',
              rating: provider.rating,
              completedJobs,
              address: provider.address ?? '',
              photoUrl: provider.imageUrl ?? null,
              vehicleLabel:
                provider.serviceOfferings.length > 0
                  ? `${provider.serviceOfferings[0]} · mobile service`
                  : 'Service vehicle · on the way',
            }
          : null,
    });
  } catch (error) {
    console.error('GET buyer service request detail:', error);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}

/** Buyer stops searching (pending only). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';
    const customerId = typeof body?.customerId === 'string' ? body.customerId.trim() : '';
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    if (action === 'restart') {
      const result = await restartBuyerServiceSearch(id, customerId);
      if (!result.ok) {
        if (result.code === 'ACTIVE_REQUEST_EXISTS') {
          return NextResponse.json(
            { error: result.error || 'You already have a service in progress.', code: result.code, requestId: result.requestId },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: result.error || 'Could not restart search' }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }
    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Unsupported action. Use cancel or restart.' }, { status: 400 });
    }

    const result = await cancelBuyerServiceSearch(id, customerId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Could not cancel' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST buyer service request action:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
