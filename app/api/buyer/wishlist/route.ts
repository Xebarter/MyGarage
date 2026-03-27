import { createBuyerWishlistItem, getBuyerWishlistItems } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const wishlist = await getBuyerWishlistItems(customerId);
    return NextResponse.json(wishlist);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buyer wishlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, productId, productName, priceSnapshot, categorySnapshot } = body;
    if (!customerId || !productName) {
      return NextResponse.json({ error: 'customerId and productName are required' }, { status: 400 });
    }
    const created = await createBuyerWishlistItem({
      customerId,
      productId,
      productName,
      priceSnapshot: Number(priceSnapshot) || 0,
      categorySnapshot: categorySnapshot || '',
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create buyer wishlist item' }, { status: 500 });
  }
}
