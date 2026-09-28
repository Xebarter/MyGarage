import { getHomeFeed, getProductsByIds, getPromoCarouselItems } from "@/lib/db";
import type { Product } from "@/lib/db";
import { buildCategoryFeedPage, pickFeaturedProducts } from "@/lib/home-category-feed";

export type HomePromoBanner = {
  id: string;
  product: Product;
  bannerUrl: string;
};

export async function loadHomePromoBanners(): Promise<HomePromoBanner[]> {
  try {
    const items = await getPromoCarouselItems();
    const active = items
      .filter((i) => i.active && Boolean(i.bannerUrl?.trim?.() ?? i.bannerUrl))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const limit = active.slice(0, 8);

    const products = await getProductsByIds(limit.map((item) => item.productId));
    const byId = new Map(products.map((product) => [product.id, product]));

    return limit.flatMap((item) => {
      const product = byId.get(item.productId);
      return product
        ? [
            {
              id: item.id,
              product,
              bannerUrl: item.bannerUrl,
            },
          ]
        : [];
    });
  } catch (error) {
    console.warn("loadHomePromoBanners skipped:", error);
    return [];
  }
}

export async function loadHomeInitialProducts(limit = 300) {
  try {
    return await getHomeFeed(undefined, limit, { forceRefresh: false });
  } catch (error) {
    console.warn("loadHomeInitialProducts skipped:", error);
    return [];
  }
}

export async function loadHomeCategoryFeedInitial(products?: Product[]) {
  try {
    const catalog = products ?? (await loadHomeInitialProducts(400));
    return buildCategoryFeedPage(catalog, { offset: 0, limit: 3, perCategory: 5 });
  } catch (error) {
    console.warn("loadHomeCategoryFeedInitial skipped:", error);
    return { sections: [], hasMore: false, nextOffset: 0, totalCategories: 0 };
  }
}

export function loadHomeFeaturedProducts(products: Product[]) {
  return pickFeaturedProducts(products, 60);
}
