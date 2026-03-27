import { deleteBuyerAddress, updateBuyerAddress } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateBuyerAddress(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update buyer address' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteBuyerAddress(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete buyer address' }, { status: 500 });
  }
}
