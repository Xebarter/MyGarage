'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, Circle, Loader2, MapPin, Radio } from 'lucide-react';

type Assignment = {
  id: string;
  request_id: string;
  provider_id: string;
  assigned_at: string;
  responded_at: string | null;
  response: string;
  response_note: string | null;
};

type RequestDetail = {
  id: string;
  customer_id: string;
  category: string;
  service: string;
  location: string;
  status: string;
  provider_id: string | null;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function ServiceTrackPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = (params.requestId as string) || '';
  const [customerId, setCustomerId] = useState('');
  const [data, setData] = useState<{ request: RequestDetail; assignments: Assignment[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = (typeof window !== 'undefined' && localStorage.getItem('currentBuyerId')) || '';
    setCustomerId(id.trim());
    if (!id.trim()) {
      router.replace(`/auth?role=buyer&next=${encodeURIComponent(`/buyer/services/track/${requestId}`)}`);
    }
  }, [requestId, router]);

  const load = useCallback(async () => {
    if (!requestId || !customerId) return;
    try {
      const res = await fetch(
        `/api/buyer/service-requests/${encodeURIComponent(requestId)}?customerId=${encodeURIComponent(customerId)}`,
      );
      if (!res.ok) {
        setError(res.status === 404 ? 'Request not found.' : 'Could not load this request.');
        setData(null);
        return;
      }
      const json = (await res.json()) as { request: RequestDetail; assignments: Assignment[] };
      setData(json);
      setError(null);
    } catch {
      setError('Could not load this request.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [requestId, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!customerId || !requestId) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [customerId, requestId, load]);

  const stages = useMemo(() => {
    const r = data?.request;
    if (!r) {
      return [
        { key: 'search', label: 'Finding a provider', done: false, active: true },
        { key: 'matched', label: 'Provider matched', done: false, active: false },
        { key: 'arrived', label: 'Provider arrived', done: false, active: false },
        { key: 'progress', label: 'Service in progress', done: false, active: false },
        { key: 'done', label: 'Completed', done: false, active: false },
      ];
    }
    if (r.status === 'cancelled') {
      return [
        { key: 'search', label: 'Finding a provider', done: true, active: false },
        { key: 'cancel', label: 'No providers available right now', done: true, active: true },
      ];
    }
    const matched = Boolean(r.accepted_at || r.provider_id);
    const arrived = Boolean(r.arrived_at);
    const started = Boolean(r.started_at);
    const completed = Boolean(r.completed_at) || r.status === 'completed';
    return [
      { key: 'search', label: 'Finding a provider', done: matched || completed, active: !matched && !completed },
      { key: 'matched', label: 'Provider matched', done: matched || completed, active: matched && !arrived && !completed },
      { key: 'arrived', label: 'Provider on site', done: arrived || completed, active: arrived && !started && !completed },
      { key: 'progress', label: 'Service in progress', done: started || completed, active: started && !completed },
      { key: 'done', label: 'Completed', done: completed, active: completed },
    ];
  }, [data]);

  const pendingOffer = useMemo(() => data?.assignments?.find((a) => a.response === 'pending'), [data]);

  if (!customerId && !loading) {
    return (
      <div className="min-h-[50vh] bg-background p-8 text-center text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20 p-3 pb-28 sm:p-5 md:p-8">
      <div className="mx-auto max-w-lg space-y-4">
        <Link
          href="/buyer/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to services
        </Link>

        <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live tracking</p>
              <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{data?.request.service ?? 'Service request'}</h1>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {data?.request.location ?? '—'}
              </p>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Radio className="h-5 w-5 text-primary" />}
          </div>
          {data?.request ? (
            <p className="mt-3 text-xs uppercase tracking-wide text-primary">Status: {data.request.status.replace(/_/g, ' ')}</p>
          ) : null}
        </Card>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <Card className="rounded-2xl border-border/70 p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold tracking-tight">Progress</h2>
          <div className="mt-4 space-y-3">
            {stages.map((s) => (
              <div
                key={s.key}
                className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  s.active ? 'border-primary/50 bg-primary/5' : 'border-border/70 bg-background/70'
                }`}
              >
                {s.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Circle className={`h-5 w-5 shrink-0 ${s.active ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
                <p className={`text-sm ${s.done || s.active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</p>
              </div>
            ))}
          </div>
          {data?.request?.status === 'pending' && pendingOffer ? (
            <p className="mt-4 text-xs text-muted-foreground">
              A provider is being notified now. If they do not respond in time, we automatically try the next best match.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
