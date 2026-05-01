import {
  createBuyerWishlistItem,
  deleteBuyerWishlistItemForProduct,
  getBuyerWishlistItemForProduct,
  getBuyerWishlistItems,
} from '@/lib/db';
import { getProductImagesByIds } from '@/lib/supabase/products-repo';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const productId = searchParams.get('productId');
    if (productId) {
      const item = await getBuyerWishlistItemForProduct(customerId, productId);
      if (!item) {
        return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
      }
      return NextResponse.json(item);
    }
    const wishlist = await getBuyerWishlistItems(customerId);
    const productIds = wishlist.map((w) => w.productId).filter((id): id is string => Boolean(id?.trim()));
    const imageByProductId = await getProductImagesByIds(productIds);
    const enriched = wishlist.map((item) => ({
      ...item,
      imageUrl: item.productId ? imageByProductId.get(item.productId) || null : null,
    }));
    return NextResponse.json(enriched);
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
    if (typeof productId === 'string' && productId.trim()) {
      const existing = await getBuyerWishlistItemForProduct(customerId, productId.trim());
      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }
    const created = await createBuyerWishlistItem({
      customerId,
      productId: typeof productId === 'string' && productId.trim() ? productId.trim() : undefined,
      productName,
      priceSnapshot: Number(priceSnapshot) || 0,
      categorySnapshot: categorySnapshot || '',
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create buyer wishlist item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');
    if (!customerId || !productId) {
      return NextResponse.json({ error: 'customerId and productId are required' }, { status: 400 });
    }
    const deleted = await deleteBuyerWishlistItemForProduct(customerId, productId);
    if (!deleted) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove buyer wishlist item' }, { status: 500 });
  }
}
