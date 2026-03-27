import { getVendors } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const vendors = await getVendors();
    return NextResponse.json(vendors);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Vendors are created by vendor registration." },
    { status: 405 },
  );
}
