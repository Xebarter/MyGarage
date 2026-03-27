import { NextResponse } from "next/server";
import { getPromoCarouselItems, getProduct } from "@/lib/db";
import type { Product } from "@/lib/db";

export async function GET() {
  try {
    const items = await getPromoCarouselItems();
    const active = items
      .filter((i) => i.active && Boolean(i.bannerUrl?.trim?.() ?? i.bannerUrl))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const limit = active.slice(0, 8);

    const resolved = await Promise.all(
      limit.map(async (item) => {
        const product = (await getProduct(item.productId)) as Product | undefined;
        return product
          ? {
              id: item.id,
              product,
              bannerUrl: item.bannerUrl,
              source: item.source,
            }
          : null;
      }),
    );

    return NextResponse.json(resolved.filter(Boolean));
  } catch {
    return NextResponse.json({ error: "Failed to fetch promo carousel" }, { status: 500 });
  }
}

