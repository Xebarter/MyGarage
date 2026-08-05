import { createAdminClient } from '@/lib/supabase/admin';
import {
  FALLBACK_DEFAULT_PRICE_UGX,
  userServiceCategories,
  type UserServiceCategory,
} from '@/lib/services-catalog';

export type ServiceCatalogPriceRow = {
  categoryId: string;
  categoryTitle: string;
  serviceName: string;
  priceUgx: number;
  currency: string;
  /** True when an admin row exists in DB (vs code catalog seed only). */
  isCustom: boolean;
  updatedAt: string | null;
};

type DbRow = {
  category_id: string;
  service_name: string;
  price_ugx: number | string;
  currency: string | null;
  updated_at: string | null;
};

/** null = unknown, true = table ready, false = catalog code only */
let tableAvailable: boolean | null = null;

function isMissingTableError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = (error.code || '').toUpperCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist') ||
    (msg.includes('service_catalog_prices') && msg.includes('not find'))
  );
}

async function probeTable(): Promise<boolean> {
  if (tableAvailable != null) return tableAvailable;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('service_catalog_prices').select('category_id').limit(1);
    if (error) {
      if (isMissingTableError(error)) {
        tableAvailable = false;
        return false;
      }
      // Other errors: still try (permissions etc.)
      tableAvailable = true;
      return true;
    }
    tableAvailable = true;
    return true;
  } catch {
    tableAvailable = false;
    return false;
  }
}

function categoriesSlice(categoryId?: string): UserServiceCategory[] {
  if (!categoryId?.trim()) return userServiceCategories;
  return userServiceCategories.filter((c) => c.id === categoryId.trim());
}

async function loadDbPriceMap(): Promise<Map<string, DbRow>> {
  const map = new Map<string, DbRow>();
  if (!(await probeTable())) return map;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('service_catalog_prices').select('*');
  if (error) {
    if (isMissingTableError(error)) {
      tableAvailable = false;
      return map;
    }
    throw new Error(`Failed to load service catalog prices: ${error.message}`);
  }

  for (const row of (data as DbRow[] | null) ?? []) {
    const key = `${row.category_id}\0${row.service_name.toLowerCase()}`;
    map.set(key, row);
  }
  return map;
}

function keyFor(categoryId: string, serviceName: string): string {
  return `${categoryId}\0${serviceName.trim().toLowerCase()}`;
}

/** Full catalog rows for admin UI (code services merged with DB overrides). */
export async function listServiceCatalogPrices(categoryId?: string): Promise<ServiceCatalogPriceRow[]> {
  const db = await loadDbPriceMap();
  const out: ServiceCatalogPriceRow[] = [];

  for (const cat of categoriesSlice(categoryId)) {
    for (const svc of cat.services) {
      const row = db.get(keyFor(cat.id, svc.name));
      out.push({
        categoryId: cat.id,
        categoryTitle: cat.title,
        serviceName: svc.name,
        priceUgx: row
          ? Number(row.price_ugx) || 0
          : Number(svc.defaultPriceUgx) || FALLBACK_DEFAULT_PRICE_UGX,
        currency: row?.currency || 'UGX',
        isCustom: Boolean(row),
        updatedAt: row?.updated_at ?? null,
      });
    }
  }

  return out;
}

/** Resolve platform price for a service (admin DB → code catalog → fallback). */
export async function resolveServiceCatalogPrice(
  serviceName: string,
  categoryId?: string,
): Promise<number> {
  const name = serviceName.trim();
  if (!name) return FALLBACK_DEFAULT_PRICE_UGX;

  const db = await loadDbPriceMap();
  if (categoryId?.trim()) {
    const hit = db.get(keyFor(categoryId.trim(), name));
    if (hit) return Number(hit.price_ugx) || 0;
  } else {
    for (const [k, row] of db) {
      if (k.endsWith(`\0${name.toLowerCase()}`)) {
        return Number(row.price_ugx) || 0;
      }
    }
  }

  const cats = categoriesSlice(categoryId);
  for (const cat of cats) {
    const found = cat.services.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (found) return Number(found.defaultPriceUgx) || FALLBACK_DEFAULT_PRICE_UGX;
  }

  return FALLBACK_DEFAULT_PRICE_UGX;
}

export type ServiceCatalogPriceUpsert = {
  categoryId: string;
  serviceName: string;
  priceUgx: number;
};

/**
 * Admin upsert: store platform prices and cascade to all vendor listings
 * for the same category + service name.
 */
export async function upsertServiceCatalogPrices(
  items: ServiceCatalogPriceUpsert[],
): Promise<ServiceCatalogPriceRow[]> {
  if (!Array.isArray(items) || items.length === 0) {
    return listServiceCatalogPrices();
  }

  const useTable = await probeTable();
  if (!useTable) {
    throw new Error(
      'service_catalog_prices table is not available. Apply migration 043_service_catalog_prices.sql',
    );
  }

  const now = new Date().toISOString();
  const rows = items.map((item) => {
    const price = Number(item.priceUgx);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for ${item.serviceName}`);
    }
    if (!item.categoryId?.trim() || !item.serviceName?.trim()) {
      throw new Error('categoryId and serviceName are required');
    }
    return {
      category_id: item.categoryId.trim(),
      service_name: item.serviceName.trim(),
      price_ugx: price,
      currency: 'UGX',
      updated_at: now,
    };
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from('service_catalog_prices').upsert(rows, {
    onConflict: 'category_id,service_name',
  });
  if (error) {
    throw new Error(`Failed to save service prices: ${error.message}`);
  }

  // Cascade so every provider listing shows the admin-controlled amount.
  for (const row of rows) {
    const { error: cascadeError } = await supabase
      .from('vendor_service_listings')
      .update({ price_ugx: row.price_ugx, updated_at: now })
      .eq('category_id', row.category_id)
      .eq('service_name', row.service_name);
    if (cascadeError && !isMissingTableError(cascadeError)) {
      console.error('Cascade listing price update failed:', cascadeError.message);
    }
  }

  return listServiceCatalogPrices();
}

/** Seed every catalog default into the DB if the table is still empty (idempotent). */
export async function ensureServiceCatalogPricesSeeded(): Promise<void> {
  if (!(await probeTable())) return;
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('service_catalog_prices')
    .select('category_id', { count: 'exact', head: true });
  if (error) {
    if (isMissingTableError(error)) {
      tableAvailable = false;
      return;
    }
    return;
  }
  if ((count ?? 0) > 0) return;

  const rows = userServiceCategories.flatMap((cat) =>
    cat.services.map((svc) => ({
      category_id: cat.id,
      service_name: svc.name,
      price_ugx: svc.defaultPriceUgx,
      currency: 'UGX',
      updated_at: new Date().toISOString(),
    })),
  );
  await supabase.from('service_catalog_prices').upsert(rows, {
    onConflict: 'category_id,service_name',
  });
}
