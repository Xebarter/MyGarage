import {
  assignProviderToUnassignedServiceRequest,
  getAllBuyerServiceRequests,
  getBuyerServiceRequestById,
  updateBuyerServiceRequestDestinationCoords,
  updateBuyerServiceRequestProviderLocation,
  updateBuyerServiceRequestStatus,
  vendorAcceptServiceRequest,
} from '@/lib/db';
import { getActiveFulfillmentRequestForVendor } from '@/lib/supabase/service-dispatch-repo';
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
    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const vendorId = typeof body.vendorId === 'string' ? body.vendorId.trim() : '';
    const status = typeof body.status === 'string' ? body.status : undefined;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await getBuyerServiceRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }

    const pLat = body.providerLat;
    const pLng = body.providerLng;
    const hasLive =
      pLat != null &&
      pLng != null &&
      Number.isFinite(Number(pLat)) &&
      Number.isFinite(Number(pLng));

    if (hasLive) {
      if (!vendorId) {
        return NextResponse.json({ error: 'vendorId is required to update live location' }, { status: 400 });
      }
      if (!sameVendor(existing.providerId, vendorId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const updated = await updateBuyerServiceRequestProviderLocation(id, Number(pLat), Number(pLng));
      return NextResponse.json(updated);
    }

    const dLat = body.destinationLat;
    const dLng = body.destinationLng;
    const hasDest =
      dLat != null &&
      dLng != null &&
      Number.isFinite(Number(dLat)) &&
      Number.isFinite(Number(dLng));

    if (hasDest && existing.destinationLat == null) {
      if (!vendorId) {
        return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
      }
      if (!sameVendor(existing.providerId, vendorId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const updated = await updateBuyerServiceRequestDestinationCoords(id, Number(dLat), Number(dLng));
      return NextResponse.json(updated);
    }

    if (!status) {
      return NextResponse.json({ error: 'status or coordinates payload is required' }, { status: 400 });
    }
    if (!['pending', 'matched', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    if (status === 'matched') {
      const busy = await getActiveFulfillmentRequestForVendor(vendorId);
      if (busy != null && busy.id !== id) {
        return NextResponse.json(
          {
            error:
              'You already have an active job. Complete it or wait for the buyer to cancel before accepting another.',
          },
          { status: 409 },
        );
      }
      const updated = await vendorAcceptServiceRequest(id, vendorId);
      if (!updated) {
        return NextResponse.json(
          { error: 'Cannot accept this job (it may be assigned to another provider).' },
          { status: 409 },
        );
      }
      return NextResponse.json(updated);
    }

    let authorizedRow = existing;
    if (!sameVendor(authorizedRow.providerId, vendorId)) {
      const canSelfAssign =
        (authorizedRow.providerId == null || String(authorizedRow.providerId).trim() === '') &&
        (status === 'in_progress' || status === 'completed');
      if (canSelfAssign) {
        const assigned = await assignProviderToUnassignedServiceRequest(id, vendorId);
        if (!assigned) {
          return NextResponse.json(
            { error: 'Cannot update this job (not assigned to you or you already have another active job).' },
            { status: 403 },
          );
        }
        authorizedRow = assigned;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updated = await updateBuyerServiceRequestStatus(id, status as 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled');
    if (!updated) {
      return NextResponse.json({ error: 'Service request not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update service request' }, { status: 500 });
  }
}
