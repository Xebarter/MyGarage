import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

function pickStr(row: Row, key: string, prev: string) {
  if (!(key in row)) return prev;
  const v = row[key];
  return v == null ? '' : String(v);
}

/** Keep previous value when the column is null or missing in the payload (partial updates). */
function pickStrKeepPrev(row: Row, key: string, prev: string) {
  if (!(key in row)) return prev;
  const v = row[key];
  if (v == null || v === '') return prev;
  return String(v);
}

function pickStrNull(row: Row, key: string, prev: string | null) {
  if (!(key in row)) return prev;
  const v = row[key];
  return v == null ? null : String(v);
}

function pickNumNull(row: Row, key: string, prev: number | null) {
  if (!(key in row)) return prev;
  const v = row[key];
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : prev;
}

/** Merge a Realtime `payload.new` row (snake_case DB columns) into a buyer-facing request shape. */
export function mergeRealtimeRowIntoRequestDetail<T extends Record<string, unknown>>(prev: T, row: Row): T {
  return {
    ...prev,
    id: pickStr(row, 'id', String(prev.id ?? '')),
    customerId: pickStr(row, 'customer_id', String(prev.customerId ?? '')),
    category: pickStr(row, 'category', String(prev.category ?? '')),
    service: pickStr(row, 'service', String(prev.service ?? '')),
    location: pickStr(row, 'location', String(prev.location ?? '')),
    status: pickStr(row, 'status', String(prev.status ?? '')),
    providerId: pickStrNull(row, 'provider_id', (prev.providerId as string | null) ?? null),
    acceptedAt: pickStrNull(row, 'accepted_at', (prev.acceptedAt as string | null) ?? null),
    arrivedAt: pickStrNull(row, 'arrived_at', (prev.arrivedAt as string | null) ?? null),
    startedAt: pickStrNull(row, 'started_at', (prev.startedAt as string | null) ?? null),
    completedAt: pickStrNull(row, 'completed_at', (prev.completedAt as string | null) ?? null),
    createdAt: pickStr(row, 'created_at', String(prev.createdAt ?? '')),
    updatedAt: pickStr(row, 'updated_at', String(prev.updatedAt ?? '')),
    buyerContactPhone: pickStrKeepPrev(row, 'buyer_contact_phone', String(prev.buyerContactPhone ?? '')),
    buyerContactName: pickStrKeepPrev(row, 'buyer_contact_name', String(prev.buyerContactName ?? '')),
    destinationLat: pickNumNull(row, 'destination_lat', (prev.destinationLat as number | null) ?? null),
    destinationLng: pickNumNull(row, 'destination_lng', (prev.destinationLng as number | null) ?? null),
    providerLat: pickNumNull(row, 'provider_lat', (prev.providerLat as number | null) ?? null),
    providerLng: pickNumNull(row, 'provider_lng', (prev.providerLng as number | null) ?? null),
  } as T;
}

export type TripRequestLike = {
  id: string;
  service: string;
  category: string;
  location: string;
  status: string;
  buyerContactPhone: string;
  buyerContactName: string;
  destinationLat: number | null;
  destinationLng: number | null;
  providerLat: number | null;
  providerLng: number | null;
};

export function mergeRealtimeRowIntoTripRequest(prev: TripRequestLike, row: Row): TripRequestLike {
  return {
    id: pickStr(row, 'id', prev.id),
    service: pickStr(row, 'service', prev.service),
    category: pickStr(row, 'category', prev.category),
    location: pickStr(row, 'location', prev.location),
    status: pickStr(row, 'status', prev.status),
    buyerContactPhone: pickStrKeepPrev(row, 'buyer_contact_phone', prev.buyerContactPhone),
    buyerContactName: pickStrKeepPrev(row, 'buyer_contact_name', prev.buyerContactName),
    destinationLat: pickNumNull(row, 'destination_lat', prev.destinationLat),
    destinationLng: pickNumNull(row, 'destination_lng', prev.destinationLng),
    providerLat: pickNumNull(row, 'provider_lat', prev.providerLat),
    providerLng: pickNumNull(row, 'provider_lng', prev.providerLng),
  };
}

/**
 * Subscribe to INSERT/UPDATE on a single buyer_service_requests row.
 * Returns an unsubscribe function. Requires table in `supabase_realtime` publication.
 */
export function subscribeToBuyerServiceRequest(
  supabase: SupabaseClient,
  requestId: string,
  onRow: (row: Row) => void,
): () => void {
  const safeId = requestId.trim();
  if (!safeId) {
    return () => {};
  }

  const channel: RealtimeChannel = supabase
    .channel(`public:buyer_service_requests:${safeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'buyer_service_requests',
        filter: `id=eq.${safeId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') return;
        const row = payload.new as Row;
        if (row && typeof row === 'object') onRow(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
