import { createBuyerAddress, getBuyerAddresses } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const addresses = await getBuyerAddresses(customerId);
    return NextResponse.json(addresses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buyer addresses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, label, fullAddress, isDefault } = body;
    if (!customerId || !label || !fullAddress) {
      return NextResponse.json({ error: 'customerId, label and fullAddress are required' }, { status: 400 });
    }
    const created = await createBuyerAddress({
      customerId,
      label,
      fullAddress,
      isDefault: Boolean(isDefault),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create buyer address' }, { status: 500 });
  }
}
