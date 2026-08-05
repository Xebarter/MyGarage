import type { User } from '@supabase/supabase-js';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolveServiceCatalogPrice } from '@/lib/supabase/service-catalog-prices-repo';
import { updateVendorById } from '@/lib/supabase/vendors-repo';
import { userServiceCategories } from '@/lib/services-catalog';

export type VendorServiceListingStatus = 'active' | 'paused';

export type VendorServiceListing = {
  id: string;
  vendorId: string;
  categoryId: string;
  serviceName: string;
  priceUgx: number;
  currency: string;
  status: VendorServiceListingStatus;
  etaMinutes: number | null;
  description: string;
  mobileAvailable: boolean;
  emergency: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VendorServiceListingUpsert = {
  id?: string;
  categoryId: string;
  serviceName: string;
  /** Ignored on write — platform price is always taken from admin catalog. */
  priceUgx?: number;
  status?: VendorServiceListingStatus;
  etaMinutes?: number | null;
  description?: string;
  mobileAvailable?: boolean;
  emergency?: boolean;
};

type ListingRow = {
  id: string;
  vendor_id: string;
  category_id: string;
  service_name: string;
  price_ugx: number | string;
  currency: string;
  status: string;
  eta_minutes: number | null;
  description: string | null;
  mobile_available: boolean | null;
  emergency: boolean | null;
  created_at: string;
  updated_at: string;
};

const META_KEY = 'service_listings';

/** null = unknown, true = table ready, false = fall back to user app_metadata */
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
    (msg.includes('vendor_service_listings') && msg.includes('not find'))
  );
}

function rowToListing(row: ListingRow): VendorServiceListing {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    serviceName: row.service_name,
    priceUgx: Number(row.price_ugx) || 0,
    currency: row.currency || 'UGX',
    status: row.status === 'paused' ? 'paused' : 'active',
    etaMinutes: row.eta_minutes == null ? null : Number(row.eta_minutes),
    description: row.description ?? '',
    mobileAvailable: Boolean(row.mobile_available),
    emergency: Boolean(row.emergency),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listingToRow(listing: VendorServiceListing): ListingRow {
  return {
    id: listing.id,
    vendor_id: listing.vendorId,
    category_id: listing.categoryId,
    service_name: listing.serviceName,
    price_ugx: listing.priceUgx,
    currency: listing.currency || 'UGX',
    status: listing.status,
    eta_minutes: listing.etaMinutes,
    description: listing.description,
    mobile_available: listing.mobileAvailable,
    emergency: listing.emergency,
    created_at: listing.createdAt,
    updated_at: listing.updatedAt,
  };
}

function normalizeMetaListings(raw: unknown, vendorId: string): VendorServiceListing[] {
  if (!Array.isArray(raw)) return [];
  const out: VendorServiceListing[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<ListingRow> & Partial<VendorServiceListing>;
    // Accept either snake_case (storage format) or camelCase
    if ('service_name' in row || 'vendor_id' in row) {
      out.push(
        rowToListing({
          id: String(row.id || `vsl-${crypto.randomUUID()}`),
          vendor_id: String(row.vendor_id || vendorId),
          category_id: String(row.category_id || ''),
          service_name: String(row.service_name || ''),
          price_ugx: row.price_ugx ?? 0,
          currency: String(row.currency || 'UGX'),
          status: String(row.status || 'active'),
          eta_minutes: row.eta_minutes ?? null,
          description: row.description ?? '',
          mobile_available: row.mobile_available ?? false,
          emergency: row.emergency ?? false,
          created_at: String(row.created_at || new Date().toISOString()),
          updated_at: String(row.updated_at || new Date().toISOString()),
        }),
      );
      continue;
    }
    if ('serviceName' in row) {
      out.push({
        id: String(row.id || `vsl-${crypto.randomUUID()}`),
        vendorId: String(row.vendorId || vendorId),
        categoryId: String(row.categoryId || ''),
        serviceName: String(row.serviceName || ''),
        priceUgx: Number(row.priceUgx) || 0,
        currency: String(row.currency || 'UGX'),
        status: row.status === 'paused' ? 'paused' : 'active',
        etaMinutes: row.etaMinutes == null ? null : Number(row.etaMinutes),
        description: String(row.description || ''),
        mobileAvailable: Boolean(row.mobileAvailable),
        emergency: Boolean(row.emergency),
        createdAt: String(row.createdAt || new Date().toISOString()),
        updatedAt: String(row.updatedAt || new Date().toISOString()),
      });
    }
  }
  return out
    .filter((l) => l.serviceName.trim() && l.categoryId.trim())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function probeTable(): Promise<boolean> {
  if (tableAvailable != null) return tableAvailable;
  const supabase = createAdminClient();
  const { error } = await supabase.from('vendor_service_listings').select('id').limit(1);
  if (!error) {
    tableAvailable = true;
    return true;
  }
  if (isMissingTableError(error)) {
    tableAvailable = false;
    return false;
  }
  // Other errors (network, RLS) — try table paths; callers rethrow their errors
  tableAvailable = true;
  return true;
}

async function getUserById(vendorId: string): Promise<User | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(vendorId);
  if (error || !data.user) return null;
  return data.user;
}

async function listFromMeta(vendorId: string): Promise<VendorServiceListing[]> {
  const user = await getUserById(vendorId);
  if (!user) return [];
  return normalizeMetaListings(user.app_metadata?.[META_KEY], vendorId);
}

async function saveToMeta(vendorId: string, listings: VendorServiceListing[]): Promise<void> {
  const user = await getUserById(vendorId);
  if (!user) {
    throw new Error('Vendor user not found; cannot store service listings without database table.');
  }
  const rows = listings.map(listingToRow);
  const { error } = await createAdminClient().auth.admin.updateUserById(vendorId, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      [META_KEY]: rows,
    },
  });
  if (error) {
    throw new Error(`Failed to save service listings: ${error.message}`);
  }
}

async function syncVendorServiceOfferingsFrom(
  vendorId: string,
  listings: VendorServiceListing[],
): Promise<void> {
  const keywords = Array.from(
    new Set(
      listings
        .filter((l) => l.status === 'active')
        .map((l) => l.serviceName.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  try {
    await updateVendorById(vendorId, { serviceOfferings: keywords });
  } catch {
    // Vendor row may lack service_offerings column on older DBs; listings still work.
  }
}

/** Prefer table when present; otherwise auth app_metadata until migration 042 is applied. */
export async function listVendorServiceListings(vendorId: string): Promise<VendorServiceListing[]> {
  if (!vendorId.trim()) return [];

  const useTable = await probeTable();
  if (useTable) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('vendor_service_listings')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        tableAvailable = false;
        return listFromMeta(vendorId);
      }
      throw new Error(`Failed to list vendor service listings: ${error.message}`);
    }

    const fromTable = (data as ListingRow[] | null)?.map(rowToListing) ?? [];
    // One-time lift of metadata into table when table is empty but meta has data
    if (fromTable.length === 0) {
      const fromMeta = await listFromMeta(vendorId);
      if (fromMeta.length > 0) {
        await upsertVendorServiceListings(
          vendorId,
          fromMeta.map((l) => ({
            id: l.id,
            categoryId: l.categoryId,
            serviceName: l.serviceName,
            priceUgx: l.priceUgx,
            status: l.status,
            etaMinutes: l.etaMinutes,
            description: l.description,
            mobileAvailable: l.mobileAvailable,
            emergency: l.emergency,
          })),
        );
        return listVendorServiceListings(vendorId);
      }
    }
    return fromTable;
  }

  return listFromMeta(vendorId);
}

export async function upsertVendorServiceListings(
  vendorId: string,
  items: VendorServiceListingUpsert[],
): Promise<VendorServiceListing[]> {
  if (!vendorId.trim()) throw new Error('vendorId is required');
  if (!Array.isArray(items) || items.length === 0) return listVendorServiceListings(vendorId);

  const existing = await listVendorServiceListings(vendorId);
  const byKey = new Map<string, VendorServiceListing>(
    existing.map((l) => [`${l.categoryId}\0${l.serviceName.toLowerCase()}`, l]),
  );

  const now = new Date().toISOString();
  const mergedByKey = new Map(byKey);

  for (const item of items) {
    if (!item.categoryId?.trim() || !item.serviceName?.trim()) {
      throw new Error('categoryId and serviceName are required');
    }
    const categoryId = item.categoryId.trim();
    const serviceName = item.serviceName.trim();
    // Admin-controlled platform price only — never accept client-supplied amounts.
    const price = await resolveServiceCatalogPrice(serviceName, categoryId);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid platform price for ${serviceName}`);
    }
    const key = `${categoryId}\0${serviceName.toLowerCase()}`;
    const prior = mergedByKey.get(key);
    const createdAt = prior?.createdAt || now;
    mergedByKey.set(key, {
      id: item.id?.trim() || prior?.id || `vsl-${crypto.randomUUID()}`,
      vendorId,
      categoryId,
      serviceName,
      priceUgx: price,
      currency: 'UGX',
      status: item.status === 'paused' ? 'paused' : 'active',
      etaMinutes: item.etaMinutes == null ? null : Number(item.etaMinutes),
      description: item.description?.trim() ?? '',
      mobileAvailable: Boolean(item.mobileAvailable),
      emergency: Boolean(item.emergency),
      createdAt,
      updatedAt: now,
    });
  }

  const next = Array.from(mergedByKey.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const useTable = await probeTable();

  if (useTable) {
    const rows = next.map((listing) => ({
      id: listing.id,
      vendor_id: listing.vendorId,
      category_id: listing.categoryId,
      service_name: listing.serviceName,
      price_ugx: listing.priceUgx,
      currency: 'UGX',
      status: listing.status,
      eta_minutes: listing.etaMinutes,
      description: listing.description,
      mobile_available: listing.mobileAvailable,
      emergency: listing.emergency,
      created_at: listing.createdAt,
      updated_at: listing.updatedAt,
    }));

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('vendor_service_listings')
      .upsert(rows, { onConflict: 'vendor_id,category_id,service_name' })
      .select('*');

    if (error) {
      if (isMissingTableError(error)) {
        tableAvailable = false;
        await saveToMeta(vendorId, next);
        await syncVendorServiceOfferingsFrom(vendorId, next);
        return next;
      }
      throw new Error(`Failed to upsert vendor service listings: ${error.message}`);
    }

    const saved = (data as ListingRow[] | null)?.map(rowToListing) ?? next;
    await syncVendorServiceOfferingsFrom(vendorId, saved);
    return saved;
  }

  await saveToMeta(vendorId, next);
  await syncVendorServiceOfferingsFrom(vendorId, next);
  return next;
}

export async function deleteVendorServiceListing(vendorId: string, listingId: string): Promise<boolean> {
  const useTable = await probeTable();

  if (useTable) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('vendor_service_listings')
      .delete()
      .eq('id', listingId)
      .eq('vendor_id', vendorId)
      .select('id')
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        tableAvailable = false;
      } else {
        throw new Error(`Failed to delete vendor service listing: ${error.message}`);
      }
    } else if (data) {
      const remaining = await listVendorServiceListings(vendorId);
      await syncVendorServiceOfferingsFrom(vendorId, remaining);
      return true;
    } else {
      return false;
    }
  }

  const current = await listFromMeta(vendorId);
  const next = current.filter((l) => l.id !== listingId);
  if (next.length === current.length) return false;
  await saveToMeta(vendorId, next);
  await syncVendorServiceOfferingsFrom(vendorId, next);
  return true;
}

export type ServicePriceRangeRow = {
  serviceName: string;
  minPriceUgx: number;
  maxPriceUgx: number;
  providerCount: number;
};

export async function getServicePriceRanges(categoryId?: string): Promise<ServicePriceRangeRow[]> {
  // Platform prices are admin-owned. Public ranges use those amounts; providerCount is
  // how many active providers currently offer the service (supply signal only).
  const { listServiceCatalogPrices } = await import('@/lib/supabase/service-catalog-prices-repo');
  const catalog = await listServiceCatalogPrices(categoryId);

  const counts = new Map<string, number>();
  const useTable = await probeTable();

  if (useTable) {
    const supabase = createAdminClient();
    let query = supabase
      .from('vendor_service_listings')
      .select('service_name, category_id')
      .eq('status', 'active');

    if (categoryId?.trim()) {
      query = query.eq('category_id', categoryId.trim());
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        tableAvailable = false;
      } else {
        throw new Error(`Failed to load service price ranges: ${error.message}`);
      }
    } else {
      for (const row of (data as Array<{ service_name: string; category_id: string }> | null) ?? []) {
        const name = String(row.service_name || '').trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  } else {
    const supabase = createAdminClient();
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const users = data.users ?? [];
      for (const user of users) {
        const listings = normalizeMetaListings(user.app_metadata?.[META_KEY], user.id);
        for (const l of listings) {
          if (l.status !== 'active') continue;
          if (categoryId?.trim() && l.categoryId !== categoryId.trim()) continue;
          const name = l.serviceName.trim();
          if (!name) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 50) break;
    }
  }

  // If a category was requested but empty catalog filter, still include pure listing counts
  // under catalog prices; also add listing-only services without a catalog entry.
  const byName = new Map<string, ServicePriceRangeRow>();
  for (const row of catalog) {
    const price = Number(row.priceUgx) || 0;
    byName.set(row.serviceName, {
      serviceName: row.serviceName,
      minPriceUgx: price,
      maxPriceUgx: price,
      providerCount: counts.get(row.serviceName) ?? 0,
    });
  }

  for (const [name, count] of counts) {
    if (byName.has(name)) continue;
    // Unknown free-text name from legacy listing: show catalog resolve when possible
    const cats = categoryId?.trim()
      ? userServiceCategories.filter((c) => c.id === categoryId.trim())
      : userServiceCategories;
    let price = 0;
    for (const cat of cats) {
      const found = cat.services.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (found) {
        price = found.defaultPriceUgx;
        break;
      }
    }
    byName.set(name, {
      serviceName: name,
      minPriceUgx: price,
      maxPriceUgx: price,
      providerCount: count,
    });
  }

  return Array.from(byName.values()).sort((a, b) => a.serviceName.localeCompare(b.serviceName));
}
