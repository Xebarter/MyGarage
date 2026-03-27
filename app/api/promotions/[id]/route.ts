import { getPromotion, updatePromotion, deletePromotion } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promotion = await getPromotion(id);
    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    return NextResponse.json(promotion);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch promotion' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const promotion = await updatePromotion(id, body);
    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    return NextResponse.json(promotion);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deletePromotion(id);
    if (!success) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
