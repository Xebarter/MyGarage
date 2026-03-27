import type { Promotion } from "@/lib/db";
import { PROMOTION_SEED_ROWS } from "@/lib/data/promotion-seed";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PromoCarouselItem } from "@/lib/db";

type PromotionRow = {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  max_uses: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
};

export type PromotionInsert = Omit<Promotion, "id"> & { id?: string };

function parseNumber(value: number | string): number {
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function rowToPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    code: row.code,
    description: row.description ?? "",
    discountType: row.discount_type,
    discountValue: parseNumber(row.discount_value),
    maxUses: Number(row.max_uses) || 0,
    currentUses: Number(row.current_uses) || 0,
    validFrom: new Date(row.valid_from),
    validUntil: new Date(row.valid_until),
    active: Boolean(row.active),
  };
}

async function ensureSeedIfEmpty(): Promise<void> {
  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("promotions")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Supabase promotions count failed: ${countError.message}`);
  }

  if (count !== null && count > 0) return;

  const { error } = await supabase.from("promotions").insert(PROMOTION_SEED_ROWS);
  if (error) {
    if (error.code === "23505") return;
    throw new Error(`Supabase seed promotions failed: ${error.message}`);
  }
}

export async function listPromotions(): Promise<Promotion[]> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("valid_until", { ascending: true });

  if (error) {
    throw new Error(`Supabase list promotions failed: ${error.message}`);
  }

  return (data as PromotionRow[] | null)?.map(rowToPromotion) ?? [];
}

export async function getPromotionById(id: string): Promise<Promotion | undefined> {
  await ensureSeedIfEmpty();
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("promotions").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Supabase get promotion failed: ${error.message}`);
  }

  if (!data) return undefined;
  return rowToPromotion(data as PromotionRow);
}

export async function insertPromotion(promotion: PromotionInsert): Promise<Promotion> {
  const supabase = createAdminClient();
  const id = promotion.id ?? Date.now().toString();
  const row = {
    id,
    code: promotion.code,
    description: promotion.description,
    discount_type: promotion.discountType,
    discount_value: promotion.discountValue,
    max_uses: promotion.maxUses,
    current_uses: promotion.currentUses,
    valid_from: promotion.validFrom.toISOString(),
    valid_until: promotion.validUntil.toISOString(),
    active: promotion.active,
  };

  const { data, error } = await supabase.from("promotions").insert(row).select("*").single();

  if (error) {
    throw new Error(`Supabase insert promotion failed: ${error.message}`);
  }

  return rowToPromotion(data as PromotionRow);
}

export async function updatePromotionById(id: string, updates: Partial<Promotion>): Promise<Promotion | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.code !== undefined) patch.code = updates.code;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.discountType !== undefined) patch.discount_type = updates.discountType;
  if (updates.discountValue !== undefined) patch.discount_value = updates.discountValue;
  if (updates.maxUses !== undefined) patch.max_uses = updates.maxUses;
  if (updates.currentUses !== undefined) patch.current_uses = updates.currentUses;
  if (updates.validFrom !== undefined) patch.valid_from = updates.validFrom.toISOString();
  if (updates.validUntil !== undefined) patch.valid_until = updates.validUntil.toISOString();
  if (updates.active !== undefined) patch.active = updates.active;

  if (Object.keys(patch).length === 0) {
    return getPromotionById(id).then((p) => p ?? null);
  }

  const { data, error } = await supabase
    .from("promotions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase update promotion failed: ${error.message}`);
  }

  if (!data) return null;
  return rowToPromotion(data as PromotionRow);
}

export async function deletePromotionById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("promotions").delete().eq("id", id).select("id");

  if (error) {
    throw new Error(`Supabase delete promotion failed: ${error.message}`);
  }

  return Boolean(data && data.length > 0);
}

type PromoCarouselItemRow = {
  id: string;
  product_id: string;
  banner_url: string;
  sort_order: number;
  source: "admin" | "vendor_application";
  ad_application_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function rowToPromoCarouselItem(row: PromoCarouselItemRow): PromoCarouselItem {
  return {
    id: row.id,
    productId: row.product_id,
    bannerUrl: row.banner_url,
    sortOrder: Number(row.sort_order) || 0,
    source: row.source,
    adApplicationId: row.ad_application_id ?? undefined,
    active: Boolean(row.active),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listPromoCarouselItems(): Promise<PromoCarouselItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promo_carousel_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Supabase list promo carousel items failed: ${error.message}`);
  }

  return (data as PromoCarouselItemRow[] | null)?.map(rowToPromoCarouselItem) ?? [];
}

export async function insertPromoCarouselItem(
  payload: Omit<PromoCarouselItem, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<PromoCarouselItem> {
  const supabase = createAdminClient();
  const id = payload.id ?? Date.now().toString();
  const row = {
    id,
    product_id: payload.productId,
    banner_url: payload.bannerUrl,
    sort_order: payload.sortOrder,
    source: payload.source,
    ad_application_id: payload.adApplicationId ?? null,
    active: payload.active,
  };

  const { data, error } = await supabase.from("promo_carousel_items").insert(row).select("*").single();
  if (error) {
    throw new Error(`Supabase insert promo carousel item failed: ${error.message}`);
  }

  return rowToPromoCarouselItem(data as PromoCarouselItemRow);
}

export async function updatePromoCarouselItemById(
  id: string,
  updates: Partial<PromoCarouselItem>,
): Promise<PromoCarouselItem | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {};

  if (updates.productId !== undefined) patch.product_id = updates.productId;
  if (updates.bannerUrl !== undefined) patch.banner_url = updates.bannerUrl;
  if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;
  if (updates.source !== undefined) patch.source = updates.source;
  if (updates.adApplicationId !== undefined) patch.ad_application_id = updates.adApplicationId ?? null;
  if (updates.active !== undefined) patch.active = updates.active;

  if (Object.keys(patch).length === 0) {
    const { data, error } = await supabase
      .from("promo_carousel_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase get promo carousel item failed: ${error.message}`);
    if (!data) return null;
    return rowToPromoCarouselItem(data as PromoCarouselItemRow);
  }

  const { data, error } = await supabase
    .from("promo_carousel_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase update promo carousel item failed: ${error.message}`);
  }
  if (!data) return null;
  return rowToPromoCarouselItem(data as PromoCarouselItemRow);
}

export async function deletePromoCarouselItemById(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("promo_carousel_items").delete().eq("id", id).select("id");
  if (error) {
    throw new Error(`Supabase delete promo carousel item failed: ${error.message}`);
  }
  return Boolean(data && data.length > 0);
}
