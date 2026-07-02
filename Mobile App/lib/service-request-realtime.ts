import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import type { BuyerServiceRequestDetail } from '@/types';

type Row = Record<string, unknown>;

function pickStr(row: Row, key: string, prev: string) {
  if (!(key in row)) return prev;
  const v = row[key];
  return v == null ? '' : String(v);
}

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

export function mergeRealtimeRowIntoRequestDetail(
  prev: BuyerServiceRequestDetail,
  row: Row,
): BuyerServiceRequestDetail {
  return {
    ...prev,
    id: pickStr(row, 'id', prev.id),
    customerId: pickStr(row, 'customer_id', prev.customerId),
    category: pickStr(row, 'category', prev.category),
    service: pickStr(row, 'service', prev.service),
    location: pickStr(row, 'location', prev.location),
    status: pickStr(row, 'status', prev.status) as BuyerServiceRequestDetail['status'],
    providerId: pickStrNull(row, 'provider_id', prev.providerId),
    acceptedAt: pickStrNull(row, 'accepted_at', prev.acceptedAt),
    arrivedAt: pickStrNull(row, 'arrived_at', prev.arrivedAt),
    startedAt: pickStrNull(row, 'started_at', prev.startedAt),
    completedAt: pickStrNull(row, 'completed_at', prev.completedAt),
    createdAt: pickStr(row, 'created_at', prev.createdAt),
    updatedAt: pickStr(row, 'updated_at', prev.updatedAt),
    buyerContactPhone: pickStrKeepPrev(row, 'buyer_contact_phone', prev.buyerContactPhone ?? ''),
    buyerContactName: pickStrKeepPrev(row, 'buyer_contact_name', prev.buyerContactName ?? ''),
    destinationLat: pickNumNull(row, 'destination_lat', prev.destinationLat ?? null),
    destinationLng: pickNumNull(row, 'destination_lng', prev.destinationLng ?? null),
    providerLat: pickNumNull(row, 'provider_lat', prev.providerLat ?? null),
    providerLng: pickNumNull(row, 'provider_lng', prev.providerLng ?? null),
  };
}

export function subscribeToBuyerServiceRequest(
  supabase: SupabaseClient,
  requestId: string,
  onRow: (row: Row) => void,
): () => void {
  const safeId = requestId.trim();
  if (!safeId) return () => {};

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
