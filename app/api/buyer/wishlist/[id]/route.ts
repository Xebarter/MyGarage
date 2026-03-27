import { deleteBuyerWishlistItem } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteBuyerWishlistItem(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete buyer wishlist item' }, { status: 500 });
  }
}
