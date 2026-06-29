import { getHomeFeed } from '@/lib/db';
import { buildCategoryFeedPage } from '@/lib/home-category-feed';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const offsetParam = Number(searchParams.get('offset') ?? '0');
    const limitParam = Number(searchParams.get('limit') ?? '3');
    const perCategoryParam = Number(searchParams.get('perCategory') ?? '5');

    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 6) : 3;
    const perCategory =
      Number.isFinite(perCategoryParam) && perCategoryParam > 0 ? Math.min(perCategoryParam, 12) : 5;

    const products = await getHomeFeed(undefined, 400, { forceRefresh: false });
    const page = buildCategoryFeedPage(products, { offset, limit, perCategory });

    return NextResponse.json(page);
  } catch (error) {
    console.error('GET /api/landing/products:', error);
    return NextResponse.json({ error: 'Failed to load category feed' }, { status: 500 });
  }
}
