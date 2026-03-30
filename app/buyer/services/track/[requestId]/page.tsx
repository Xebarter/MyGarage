'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ServiceTripMap, type TripMapPoint } from '@/components/service-trip-map';
import { createClient } from '@/lib/supabase/client';
import {
  mergeRealtimeRowIntoRequestDetail,
  subscribeToBuyerServiceRequest,
} from '@/lib/supabase/buyer-service-request-realtime';

type Assignment = {
  id: string;
  request_id: string;
  provider_id: string;
  assigned_at: string;
  responded_at: string | null;
  response: string;
  response_note: string | null;
};

/** Matches JSON from GET /api/buyer/service-requests/[id] (camelCase; dates are ISO strings). */
type RequestDetail = {
  id: string;
  customerId: string;
  category: string;
  service: string;
  location: string;
  status: string;
  providerId: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  buyerContactPhone?: string;
  buyerContactName?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  providerLat?: number | null;
  providerLng?: number | null;
};

type ProviderContact = { id: string; name: string; phone: string };

function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function statusBadgeProps(status: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string } {
  const s = status.toLowerCase();
  if (s === 'cancelled') return { variant: 'destructive' };
  if (s === 'completed') return { variant: 'secondary', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25 dark:text-emerald-400' };
  if (s === 'in_progress' || s === 'matched') return { variant: 'default' };
  if (s === 'pending') return { variant: 'outline', className: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200' };
  return { variant: 'outline' };
}

function formatRelativeTime(iso: string | undefined) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ServiceTrackPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = (params.requestId as string) || '';
  const [customerId, setCustomerId] = useState('');
  const [data, setData] = useState<{
    request: RequestDetail;
    assignments: Assignment[];
    providerContact: ProviderContact | null;
  } | null>(null);
  const [geocodedDest, setGeocodedDest] = useState<TripMapPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const json = (await res.json()) as {
        request: RequestDetail;
        assignments: Assignment[];
        providerContact?: ProviderContact | null;
      };
      setData({
        request: json.request,
        assignments: json.assignments ?? [],
        providerContact: json.providerContact ?? null,
      });
      setError(null);
    } catch {
      setError('Could not load this request.');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!requestId.trim() || !customerId.trim() || !data?.request) return;
    const supabase = createClient();
    return subscribeToBuyerServiceRequest(supabase, requestId, (row) => {
      setData((d) => {
        if (!d) return d;
        const prevPid = d.request.providerId;
        const nextRequest = mergeRealtimeRowIntoRequestDetail(d.request, row);
        if (nextRequest.providerId !== prevPid && nextRequest.providerId) {
          queueMicrotask(() => void loadRef.current());
        }
        return { ...d, request: nextRequest };
      });
    });
  }, [requestId, customerId, data?.request?.id]);

  const buyerGeocodeTried = useRef(false);
  useEffect(() => {
    buyerGeocodeTried.current = false;
    setGeocodedDest(null);
  }, [requestId]);

  useEffect(() => {
    const r = data?.request;
    if (!r || (r.status !== 'matched' && r.status !== 'in_progress')) return;
    const hasStored =
      r.destinationLat != null &&
      r.destinationLng != null &&
      Number.isFinite(Number(r.destinationLat)) &&
      Number.isFinite(Number(r.destinationLng));
    if (hasStored || buyerGeocodeTried.current) return;
    const q = r.location?.trim();
    if (!q || q.length < 3) return;
    buyerGeocodeTried.current = true;
    void fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((j: { lat?: number | null; lng?: number | null }) => {
        if (j.lat != null && j.lng != null) setGeocodedDest({ lat: j.lat, lng: j.lng });
      });
  }, [data?.request]);

  const destinationOnMap = useMemo((): TripMapPoint | null => {
    const r = data?.request;
    if (!r) return null;
    if (
      r.destinationLat != null &&
      r.destinationLng != null &&
      Number.isFinite(Number(r.destinationLat)) &&
      Number.isFinite(Number(r.destinationLng))
    ) {
      return { lat: Number(r.destinationLat), lng: Number(r.destinationLng) };
    }
    return geocodedDest;
  }, [data?.request, geocodedDest]);

  const providerOnMap = useMemo((): TripMapPoint | null => {
    const r = data?.request;
    if (!r) return null;
    if (
      r.providerLat != null &&
      r.providerLng != null &&
      Number.isFinite(Number(r.providerLat)) &&
      Number.isFinite(Number(r.providerLng))
    ) {
      return { lat: Number(r.providerLat), lng: Number(r.providerLng) };
    }
    return null;
  }, [data?.request?.providerLat, data?.request?.providerLng]);

  const stages = useMemo(() => {
    const r = data?.request;
    if (!r) {
      return [
        { key: 'search', label: 'Finding a provider', description: 'Matching you with nearby professionals', done: false, active: true },
        { key: 'matched', label: 'Provider matched', description: 'Confirmation and dispatch', done: false, active: false },
        { key: 'arrived', label: 'Provider on site', description: 'Arrival at your location', done: false, active: false },
        { key: 'progress', label: 'Service in progress', description: 'Work underway', done: false, active: false },
        { key: 'done', label: 'Completed', description: 'Service finished', done: false, active: false },
      ];
    }
    if (r.status === 'cancelled') {
      return [
        {
          key: 'search',
          label: 'Finding a provider',
          description: 'We looked for an available provider',
          done: true,
          active: false,
        },
        {
          key: 'cancel',
          label: 'No providers available right now',
          description: 'Try again shortly or choose a different service',
          done: true,
          active: true,
        },
      ];
    }
    const matched = Boolean(r.acceptedAt || r.providerId);
    const arrived = Boolean(r.arrivedAt);
    const started = Boolean(r.startedAt);
    const completed = Boolean(r.completedAt) || r.status === 'completed';
    return [
      {
        key: 'search',
        label: 'Finding a provider',
        description: 'Matching you with the best fit',
        done: matched || completed,
        active: !matched && !completed,
      },
      {
        key: 'matched',
        label: 'Provider matched',
        description: 'Your provider is assigned',
        done: matched || completed,
        active: matched && !arrived && !completed,
      },
      {
        key: 'arrived',
        label: 'Provider on site',
        description: 'They have arrived at your location',
        done: arrived || completed,
        active: arrived && !started && !completed,
      },
      {
        key: 'progress',
        label: 'Service in progress',
        description: 'Work is underway',
        done: started || completed,
        active: started && !completed,
      },
      {
        key: 'done',
        label: 'Completed',
        description: 'Service finished successfully',
        done: completed,
        active: completed,
      },
    ];
  }, [data]);

  const progressPercent = useMemo(() => {
    const total = stages.length;
    if (total === 0) return 0;
    const doneCount = stages.filter((s) => s.done && s.key !== 'cancel').length;
    const activeBoost = stages.some((s) => s.active && !s.done) ? 0.5 : 0;
    const pct = ((doneCount + activeBoost) / total) * 100;
    return Math.min(100, Math.round(pct));
  }, [stages]);

  const pendingOffer = useMemo(() => data?.assignments?.find((a) => a.response === 'pending'), [data]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    void load();
  };

  if (!customerId && !loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-background p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  const badgeConfig = data?.request ? statusBadgeProps(data.request.status) : null;

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/30">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />

      <div className="relative mx-auto max-w-2xl space-y-6 px-4 py-8 pb-28 sm:px-6 md:py-10">
        <Link
          href="/buyer/services"
          className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/80 shadow-sm transition group-hover:border-primary/30 group-hover:bg-muted/50">
            <ArrowLeft className="h-4 w-4" />
          </span>
          Back to services
        </Link>

        {error ? (
          <Alert variant="destructive" className="border-destructive/40 shadow-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" className="shrink-0 border-destructive/40 bg-background" onClick={handleManualRefresh}>
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-lg shadow-black/[0.03] backdrop-blur-sm dark:shadow-black/20">
          <div className="relative border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    Live tracking
                  </span>
                  {data?.request && badgeConfig ? (
                    <Badge variant={badgeConfig.variant} className={cn('font-medium capitalize', badgeConfig.className)}>
                      {formatStatusLabel(data.request.status)}
                    </Badge>
                  ) : loading ? (
                    <Skeleton className="h-5 w-24 rounded-md" />
                  ) : null}
                </div>

                {loading && !data?.request ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-[85%] max-w-md rounded-lg" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {data?.request.service ?? 'Service request'}
                    </h1>
                    <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                      <span>{data?.request.location ?? '—'}</span>
                    </p>
                    {data?.request?.category ? (
                      <p className="text-xs font-medium text-muted-foreground/90">
                        <span className="text-muted-foreground/60">Category</span>{' '}
                        <span className="text-foreground/80">{data.request.category}</span>
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <div className="flex items-center justify-end gap-2">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Radio className="h-5 w-5 text-primary" />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground hover:text-foreground"
                    onClick={handleManualRefresh}
                    disabled={refreshing || !customerId}
                  >
                    <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
                {data?.request ? (
                  <p className="font-mono text-[11px] text-muted-foreground sm:text-right" title={data.request.id}>
                    ID · {data.request.id.length > 14 ? `${data.request.id.slice(0, 8)}…${data.request.id.slice(-4)}` : data.request.id}
                  </p>
                ) : null}
              </div>
            </div>

            {data?.request ? (
              <>
                <Separator className="my-5 bg-border/60" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Requested</p>
                      <p className="text-sm font-medium text-foreground">{formatDateTime(data.request.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(data.request.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last updated</p>
                      <p className="text-sm font-medium text-foreground">{formatDateTime(data.request.updatedAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(data.request.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {(data.request.status === 'matched' || data.request.status === 'in_progress') ? (
                  <>
                    <Separator className="my-5 bg-border/60" />
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Live on the map</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        See your provider moving toward you — same view they use to reach your pin (SafeBoda-style tracking).
                      </p>
                      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 shadow-sm">
                        <ServiceTripMap
                          destination={destinationOnMap}
                          provider={providerOnMap}
                          providerLabel="Your provider"
                          destinationLabel="Your location"
                        />
                      </div>
                      {data.providerContact?.phone ? (
                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/50 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider</p>
                            <p className="text-sm font-medium text-foreground">
                              {data.providerContact.name || 'Assigned professional'}
                            </p>
                            <p className="font-mono text-sm text-muted-foreground">{data.providerContact.phone}</p>
                          </div>
                          <Button className="h-12 w-full shrink-0 gap-2 rounded-xl sm:w-auto" asChild>
                            <a href={`tel:${data.providerContact.phone.replace(/\D/g, '')}`}>
                              <Phone className="h-4 w-4" />
                              Call provider
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Provider contact details will show here when your vendor profile is linked to this job.
                        </p>
                      )}
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Journey</h2>
                <p className="text-sm text-muted-foreground">Updates automatically every few seconds.</p>
              </div>
              {!loading || data?.request ? (
                <p className="text-sm font-medium tabular-nums text-muted-foreground">
                  <span className="text-foreground">{progressPercent}%</span> complete
                </p>
              ) : null}
            </div>

            <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="relative">
              <div
                className="absolute left-[17px] top-5 bottom-5 w-px bg-border/80 sm:left-[18px]"
                aria-hidden
              />
              <ul className="relative m-0 list-none space-y-0 p-0">
                {stages.map((s, index) => {
                const isCancel = s.key === 'cancel';
                return (
                  <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
                    <div className="relative z-10 flex shrink-0 flex-col items-center">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background shadow-sm transition-colors',
                          s.done && !isCancel && 'border-primary bg-primary text-primary-foreground',
                          s.active && !s.done && 'border-primary ring-4 ring-primary/15',
                          !s.done && !s.active && 'border-border text-muted-foreground',
                          isCancel && s.active && 'border-destructive/60 bg-destructive/10 text-destructive',
                          isCancel && !s.active && 'border-border',
                        )}
                      >
                        {s.done && !isCancel ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isCancel && s.active ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Circle className={cn('h-4 w-4', s.active && 'fill-primary/20 text-primary')} />
                        )}
                      </div>
                    </div>
                    <div className={cn('min-w-0 flex-1 pt-1', index === stages.length - 1 && 'pb-0')}>
                      <div
                        className={cn(
                          'rounded-xl border px-4 py-3 transition-colors',
                          s.active && 'border-primary/40 bg-primary/[0.04] shadow-sm shadow-primary/5',
                          !s.active && 'border-border/60 bg-muted/20',
                          isCancel && s.active && 'border-destructive/30 bg-destructive/[0.06]',
                        )}
                      >
                        <p className={cn('font-medium leading-snug', s.active ? 'text-foreground' : 'text-foreground/90')}>{s.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
            </div>

            {data?.request?.status === 'pending' && pendingOffer ? (
              <Alert className="mt-2 border-primary/25 bg-primary/[0.04]">
                <Radio className="h-4 w-4 text-primary" />
                <AlertTitle className="text-foreground">Provider notification</AlertTitle>
                <AlertDescription>
                  A provider is being notified now. If they do not respond in time, we automatically try the next best match.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
