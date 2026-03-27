import { createAdApplication, getAdApplications } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');
    const applications = await getAdApplications();

    if (!vendorId) {
      return NextResponse.json(applications);
    }

    return NextResponse.json(applications.filter((app) => app.vendorId === vendorId));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ad applications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vendorId, scope, productId, productName, message } = body;

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
    }
    if (!scope || !['single', 'all'].includes(scope)) {
      return NextResponse.json({ error: 'scope must be "single" or "all"' }, { status: 400 });
    }
    if (scope === 'single' && !productId) {
      return NextResponse.json({ error: 'productId is required for single product applications' }, { status: 400 });
    }

    const application = await createAdApplication({
      vendorId,
      scope,
      productId,
      productName,
      message,
    });
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ad application' }, { status: 500 });
  }
}
