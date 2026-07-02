import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchBuyerServiceRequestDetail, type BuyerServiceRequestDetailResponse } from '@/lib/api';
import {
  mergeRealtimeRowIntoRequestDetail,
  subscribeToBuyerServiceRequest,
} from '@/lib/service-request-realtime';
import { getSupabase } from '@/lib/supabase';

type UseServiceRequestDetailOptions = {
  requestId: string;
  customerId: string;
  pollMs?: number;
};

export function useServiceRequestDetail({
  requestId,
  customerId,
  pollMs = 4000,
}: UseServiceRequestDetailOptions) {
  const [data, setData] = useState<BuyerServiceRequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    if (!requestId.trim() || !customerId.trim()) return;
    try {
      const next = await fetchBuyerServiceRequestDetail(requestId, customerId);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load request.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, requestId]);

  loadRef.current = load;

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!requestId.trim() || !customerId.trim()) return;
    const interval = setInterval(() => {
      void loadRef.current();
    }, pollMs);
    return () => clearInterval(interval);
  }, [customerId, pollMs, requestId]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !requestId.trim() || !customerId.trim()) return;

    return subscribeToBuyerServiceRequest(supabase, requestId, (row) => {
      setData((current) => {
        if (!current) return current;
        const prevProviderId = current.request.providerId;
        const prevStatus = current.request.status;
        const nextRequest = mergeRealtimeRowIntoRequestDetail(current.request, row);
        const providerAssigned = !prevProviderId && nextRequest.providerId;
        const statusAdvanced =
          prevStatus !== nextRequest.status ||
          (!current.request.acceptedAt && nextRequest.acceptedAt) ||
          (!current.request.arrivedAt && nextRequest.arrivedAt) ||
          (!current.request.startedAt && nextRequest.startedAt);
        if (providerAssigned || statusAdvanced) {
          queueMicrotask(() => void loadRef.current());
        }
        return { ...current, request: nextRequest };
      });
    });
  }, [customerId, requestId]);

  return { data, loading, error, reload: load };
}
