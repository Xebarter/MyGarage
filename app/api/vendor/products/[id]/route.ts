import { getProduct, updateProduct, deleteProduct } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { vendorId, featured: _ignoredFeaturedFlag, ...updates } = body;

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const existing = await getProduct(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (existing.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Unauthorized vendor' }, { status: 403 });
    }

    const wantsFeaturedRequest = Boolean(body.featured);
    const product = await updateProduct(id, {
      ...updates,
      // Vendors can only submit featured requests.
      featuredRequestPending: existing.featured ? false : (existing.featuredRequestPending || wantsFeaturedRequest),
    });

    return NextResponse.json({
      ...product,
      featuredRequestCreated: !existing.featured && wantsFeaturedRequest,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vendor product' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const existing = await getProduct(id);
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (existing.vendorId !== vendorId) {
      return NextResponse.json({ error: 'Unauthorized vendor' }, { status: 403 });
    }

    const success = await deleteProduct(id);
    if (!success) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete vendor product' }, { status: 500 });
  }
}
