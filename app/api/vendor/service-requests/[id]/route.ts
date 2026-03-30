import { getBuyerServiceRequestById, getVendor } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Invalid request id' }, { status: 400 });
    }
    const vendorId = new URL(req.url).searchParams.get('vendorId')?.trim() ?? '';
    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    const request = await getBuyerServiceRequestById(id);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (request.providerId !== vendorId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const vendor = await getVendor(vendorId);
    return NextResponse.json({
      request,
      providerPhone: vendor?.phone ?? '',
      providerName: vendor?.name ?? '',
    });
  } catch (error) {
    console.error('GET vendor service request:', error);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}
