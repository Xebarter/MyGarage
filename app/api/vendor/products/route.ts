import { getVendorProducts, createProduct } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const products = await getVendorProducts(vendorId);
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendor products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorId, ...productData } = body;

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }

    const wantsFeaturedRequest = Boolean(productData.featured);
    const product = await createProduct({
      ...productData,
      vendorId,
      // Vendors can request featured status, but only admin can set `featured`.
      featured: false,
      featuredRequestPending: wantsFeaturedRequest,
    });

    return NextResponse.json(
      {
        ...product,
        featuredRequestCreated: wantsFeaturedRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
