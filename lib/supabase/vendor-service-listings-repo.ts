import { createAdminClient } from '@/lib/supabase/admin';
import { updateVendorById } from '@/lib/supabase/vendors-repo';

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
  priceUgx: number;
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

async function syncVendorServiceOfferings(vendorId: string): Promise<void> {
  const listings = await listVendorServiceListings(vendorId);
  const keywords = Array.from(
    new Set(
      listings
        .filter((l) => l.status === 'active')
        .map((l) => l.serviceName.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  await updateVendorById(vendorId, { serviceOfferings: keywords });
}

export async function listVendorServiceListings(vendorId: string): Promise<VendorServiceListing[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vendor_service_listings')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to list vendor service listings: ${error.message}`);
  }

  return (data as ListingRow[] | null)?.map(rowToListing) ?? [];
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

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const rows = items.map((item) => {
    const price = Number(item.priceUgx);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for ${item.serviceName}`);
    }
    if (!item.categoryId?.trim() || !item.serviceName?.trim()) {
      throw new Error('categoryId and serviceName are required');
    }
    const categoryId = item.categoryId.trim();
    const serviceName = item.serviceName.trim();
    const key = `${categoryId}\0${serviceName.toLowerCase()}`;
    const prior = byKey.get(key);
    return {
      id: item.id?.trim() || prior?.id || `vsl-${crypto.randomUUID()}`,
      vendor_id: vendorId,
      category_id: categoryId,
      service_name: serviceName,
      price_ugx: price,
      currency: 'UGX',
      status: item.status === 'paused' ? 'paused' : 'active',
      eta_minutes: item.etaMinutes == null ? null : Number(item.etaMinutes),
      description: item.description?.trim() ?? '',
      mobile_available: Boolean(item.mobileAvailable),
      emergency: Boolean(item.emergency),
      updated_at: now,
    };
  });

  const { data, error } = await supabase
    .from('vendor_service_listings')
    .upsert(rows, { onConflict: 'vendor_id,category_id,service_name' })
    .select('*');

  if (error) {
    throw new Error(`Failed to upsert vendor service listings: ${error.message}`);
  }

  await syncVendorServiceOfferings(vendorId);
  return (data as ListingRow[] | null)?.map(rowToListing) ?? [];
}

export async function deleteVendorServiceListing(vendorId: string, listingId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vendor_service_listings')
    .delete()
    .eq('id', listingId)
    .eq('vendor_id', vendorId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete vendor service listing: ${error.message}`);
  }

  if (data) {
    await syncVendorServiceOfferings(vendorId);
    return true;
  }
  return false;
}

export type ServicePriceRangeRow = {
  serviceName: string;
  minPriceUgx: number;
  maxPriceUgx: number;
  providerCount: number;
};

export async function getServicePriceRanges(categoryId?: string): Promise<ServicePriceRangeRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('vendor_service_listings')
    .select('service_name, price_ugx, category_id')
    .eq('status', 'active');

  if (categoryId?.trim()) {
    query = query.eq('category_id', categoryId.trim());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load service price ranges: ${error.message}`);
  }

  const agg = new Map<string, { min: number; max: number; count: number }>();
  for (const row of (data as Array<{ service_name: string; price_ugx: number | string }> | null) ?? []) {
    const name = String(row.service_name || '').trim();
    if (!name) continue;
    const price = Number(row.price_ugx);
    if (!Number.isFinite(price)) continue;
    const prev = agg.get(name);
    if (!prev) {
      agg.set(name, { min: price, max: price, count: 1 });
    } else {
      prev.min = Math.min(prev.min, price);
      prev.max = Math.max(prev.max, price);
      prev.count += 1;
    }
  }

  return Array.from(agg.entries())
    .map(([serviceName, v]) => ({
      serviceName,
      minPriceUgx: v.min,
      maxPriceUgx: v.max,
      providerCount: v.count,
    }))
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName));
}
