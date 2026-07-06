import { getBuyerVehicle, getVehicleServiceHistory } from '@/lib/db';
import {
  SERVICE_HISTORY_STATUSES,
  SERVICE_HISTORY_TYPES,
  type ServiceHistoryStatus,
  type ServiceHistoryType,
} from '@/lib/garage';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const vehicle = await getBuyerVehicle(id);
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get('serviceType') as ServiceHistoryType | null;
    const providerId = searchParams.get('providerId') || undefined;
    const status = searchParams.get('status') as ServiceHistoryStatus | null;
    const sortBy = (searchParams.get('sortBy') || 'date') as 'date' | 'serviceType' | 'provider' | 'status';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    if (serviceType && !SERVICE_HISTORY_TYPES.includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid serviceType filter' }, { status: 400 });
    }
    if (status && !SERVICE_HISTORY_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const history = await getVehicleServiceHistory(id, {
      serviceType: serviceType ?? undefined,
      providerId,
      status: status ?? undefined,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ vehicle, history });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch vehicle service history' }, { status: 500 });
  }
}
