import { getHomeFeed, getProduct, getPromoCarouselItems } from "@/lib/db";
import type { Product } from "@/lib/db";

export type HomePromoBanner = {
  id: string;
  product: Product;
  bannerUrl: string;
};

export async function loadHomePromoBanners(): Promise<HomePromoBanner[]> {
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
          }
        : null;
    }),
  );

  return resolved.filter((x): x is HomePromoBanner => x != null);
}

export async function loadHomeInitialProducts(limit = 300) {
  return getHomeFeed(undefined, limit, { forceRefresh: false });
}
