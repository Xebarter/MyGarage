'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Search,
  RefreshCw,
  Clock3,
  Circle,
  CheckCircle2,
  PlayCircle,
  Timer,
  MapPin,
  BellRing,
  X,
  ChevronRight,
  AlertTriangle,
  Phone,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface ServiceRequest {
  id: string;
  customerId: string;
  category: string;
  service: string;
  location: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  buyerContactPhone?: string;
  buyerContactName?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  providerLat?: number | null;
  providerLng?: number | null;
  providerId?: string | null;
}

const POLL_MS = 12_000;
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'matched', label: 'Matched' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Done' },
];

function playEmergencyPing() {
  if (typeof window === 'undefined') return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.36);
    void ctx.resume().catch(() => {});
  } catch {
    /* ignore */
  }
}

function tryHapticAlert() {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate([120, 80, 120]);
  } catch {
    /* ignore */
  }
}

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [emergencyOrder, setEmergencyOrder] = useState<ServiceRequest | null>(null);
  const [emergencyExtraCount, setEmergencyExtraCount] = useState(0);
  const [pulseOrderId, setPulseOrderId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef(false);
  const dismissedEmergencyIdsRef = useRef<Set<string>>(new Set());

  const fetchRequests = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    const previousIds = knownIdsRef.current;
    const bootstrap = !initialFetchDoneRef.current;

    if (!silent) {
      setError(null);
      setLoading(true);
    }

    try {
      const response = await fetch('/api/vendor/service-requests');
      if (!response.ok) {
        throw new Error('Unable to fetch service requests at the moment.');
      }
      const data = (await response.json()) as ServiceRequest[];
      const list = Array.isArray(data) ? data : [];

      if (!bootstrap) {
        const newlySeen = list.filter((r) => !previousIds.has(r.id));
        const newPending = newlySeen.filter((r) => r.status === 'pending');
        if (newPending.length > 0) {
          const sorted = [...newPending].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const primary = sorted[0];
          if (primary && !dismissedEmergencyIdsRef.current.has(primary.id)) {
            setEmergencyExtraCount(Math.max(0, newPending.length - 1));
            setEmergencyOrder(primary);
            playEmergencyPing();
            tryHapticAlert();
          }
        }
      }

      setRequests(list);
      knownIdsRef.current = new Set(list.map((r) => r.id));
      initialFetchDoneRef.current = true;
    } catch (fetchError) {
      console.error('Failed to fetch service requests:', fetchError);
      if (!silent) {
        setError('Could not load service requests. Please try again.');
        setRequests([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchRequests({ silent: true });
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchRequests({ silent: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchRequests]);

  useEffect(() => {
    if (!emergencyOrder) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [emergencyOrder]);

  useEffect(() => {
    if (!emergencyOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissedEmergencyIdsRef.current.add(emergencyOrder.id);
        setEmergencyOrder(null);
        setEmergencyExtraCount(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [emergencyOrder]);

  const updateRequestStatus = async (id: string, status: ServiceRequest['status']) => {
    let vendorId = typeof window !== 'undefined' ? localStorage.getItem('currentVendorId')?.trim() ?? '' : '';
    if (!vendorId) {
      const { data } = await createClient().auth.getUser();
      const uid = data.user?.id?.trim() ?? '';
      if (uid) {
        vendorId = uid;
        localStorage.setItem('currentVendorId', uid);
      }
    }
    if (!vendorId) return;
    try {
      setSavingId(id);
      setActionMessage(null);
      const response = await fetch('/api/vendor/service-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, vendorId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (body.error) setActionMessage(body.error);
        return;
      }
      const updated = (await response.json()) as ServiceRequest;
      setRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
      if (emergencyOrder?.id === id) {
        setEmergencyOrder(null);
        setEmergencyExtraCount(0);
      }
      if (status === 'matched') {
        router.push(`/services/orders/trip/${encodeURIComponent(id)}`);
      }
    } catch (updateError) {
      console.error('Failed to update request status:', updateError);
    } finally {
      setSavingId(null);
    }
  };

  const dismissEmergency = (remember: boolean) => {
    const id = emergencyOrder?.id;
    if (id && remember) {
      dismissedEmergencyIdsRef.current.add(id);
      setPulseOrderId(id);
      window.setTimeout(() => setPulseOrderId(null), 2400);
      requestAnimationFrame(() => {
        document.getElementById(`order-card-${id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }
    setEmergencyOrder(null);
    setEmergencyExtraCount(0);
  };

  const getStatusColor = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/25';
      case 'matched':
        return 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/25';
      case 'in_progress':
        return 'bg-primary/15 text-primary border-primary/25';
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/25';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesSearch =
        normalizedQuery.length === 0 ||
        request.id.toLowerCase().includes(normalizedQuery) ||
        request.service.toLowerCase().includes(normalizedQuery) ||
        request.category.toLowerCase().includes(normalizedQuery) ||
        request.location.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesSearch;
    });
  }, [requests, statusFilter, normalizedQuery]);

  const activeRequest = useMemo(
    () => requests.find((request) => request.status === 'matched' || request.status === 'in_progress'),
    [requests]
  );

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === 'pending').length;
    const matched = requests.filter((request) => request.status === 'matched').length;
    const inProgress = requests.filter((request) => request.status === 'in_progress').length;
    const completed = requests.filter((request) => request.status === 'completed').length;
    return { pending, matched, inProgress, completed, total: requests.length };
  }, [requests]);

  if (loading) {
    return (
      <div className="min-h-[50vh] space-y-4 p-4 pb-24 md:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-md rounded-md" />
          </div>
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl md:w-24" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 min-w-[140px] flex-1 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {emergencyOrder ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="emergency-title"
          aria-describedby="emergency-desc"
        >
          <button
            type="button"
            aria-label="Dismiss alert backdrop"
            className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
            onClick={() => dismissEmergency(true)}
          />
          <div
            className={cn(
              'relative z-[101] w-full max-w-lg',
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 max-sm:motion-safe:slide-in-from-bottom-8 sm:motion-safe:zoom-in-95'
            )}
          >
            <div
              className={cn(
                'animate-urgent-pulse rounded-t-[1.75rem] border-2 border-red-500/60 bg-card p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.35)] ring-2 ring-red-500/40 sm:rounded-3xl sm:shadow-2xl'
              )}
            >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25 sm:hidden" />
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/30">
                <BellRing className="h-6 w-6 motion-safe:animate-pulse" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  id="emergency-title"
                  className="text-xs font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400"
                >
                  New request — needs you
                </p>
                <h2 className="mt-1 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
                  {emergencyOrder.service}
                </h2>
                {emergencyExtraCount > 0 ? (
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    +{emergencyExtraCount} more pending in queue
                  </p>
                ) : null}
                <p id="emergency-desc" className="mt-2 text-sm text-muted-foreground">
                  {emergencyOrder.category} ·{' '}
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {emergencyOrder.location}
                  </span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">ID {emergencyOrder.id}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                aria-label="Close alert"
                onClick={() => dismissEmergency(true)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                className="h-12 w-full gap-2 rounded-xl text-base font-semibold shadow-md sm:flex-1 sm:text-sm"
                disabled={savingId === emergencyOrder.id}
                onClick={() => updateRequestStatus(emergencyOrder.id, 'matched')}
              >
                Accept now
                <ChevronRight className="h-4 w-4 opacity-80" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full rounded-xl sm:w-auto"
                onClick={() => dismissEmergency(true)}
              >
                View in list
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-center text-[11px] text-muted-foreground sm:text-left">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              Auto-refreshes every few seconds while this page is open. Press Esc to dismiss.
            </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-28 pt-4 md:space-y-6 md:px-6 md:pb-10 md:pt-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 border-b border-border/60 bg-muted/20 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-muted/10 md:static md:z-auto md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-3xl">Orders</h1>
              <p className="mt-0.5 text-sm text-muted-foreground md:mt-1 md:text-base">
                Accept and run jobs from one place — optimized for your phone.
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl md:h-10 md:w-auto md:gap-2 md:px-4"
              onClick={() => void fetchRequests()}
              aria-label="Refresh orders"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </header>

        {actionMessage ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionMessage}
          </div>
        ) : null}

        {activeRequest ? (
          <Card className="overflow-hidden rounded-2xl border-primary/35 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm md:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live job</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{activeRequest.service}</p>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span className="break-words">{activeRequest.location}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{activeRequest.id}</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" className="h-11 w-full rounded-xl sm:w-auto" asChild>
                  <Link href={`/services/orders/trip/${encodeURIComponent(activeRequest.id)}`}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Map &amp; call
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  className="h-11 w-full rounded-xl sm:w-auto"
                  disabled={activeRequest.status === 'in_progress' || savingId === activeRequest.id}
                  onClick={() => updateRequestStatus(activeRequest.id, 'in_progress')}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start
                </Button>
                <Button
                  className="h-11 w-full rounded-xl sm:w-auto"
                  disabled={activeRequest.status === 'completed' || savingId === activeRequest.id}
                  onClick={() => updateRequestStatus(activeRequest.id, 'completed')}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete
                </Button>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {[
            { label: 'Total', value: stats.total, hint: 'All requests' },
            { label: 'Needs you', value: stats.pending, hint: 'Pending' },
            { label: 'Active', value: stats.matched + stats.inProgress, hint: 'Matched + in progress' },
            { label: 'Done', value: stats.completed, hint: 'Completed' },
          ].map((s) => (
            <Card
              key={s.label}
              className="min-w-[132px] shrink-0 snap-start rounded-2xl border-border/70 p-3 shadow-sm md:min-w-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{s.value}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{s.hint}</p>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-border/70 p-3 shadow-sm md:p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, service, category, location…"
              className="h-11 rounded-xl border-border/80 pl-9 text-base md:h-10 md:text-sm"
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap [&::-webkit-scrollbar]:hidden">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'shrink-0 snap-start rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Card>

        {error ? (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">{error}</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => void fetchRequests()}>
              Try again
            </Button>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center">
            <p className="font-semibold">No matching requests</p>
            <p className="mt-1 text-sm text-muted-foreground">Adjust filters or pull to refresh — new jobs alert you automatically.</p>
          </Card>
        ) : (
          <ul className="space-y-3 md:space-y-4">
            {filteredRequests.map((request) => {
              const isPulse = pulseOrderId === request.id;
              return (
                <li key={request.id} id={`order-card-${request.id}`}>
                  <Card
                    className={cn(
                      'overflow-hidden rounded-2xl border-border/70 p-4 shadow-sm transition-[box-shadow,transform] duration-300 md:p-5',
                      isPulse && 'ring-2 ring-primary shadow-lg motion-safe:animate-pulse'
                    )}
                  >
                    <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold leading-snug">{request.service}</h3>
                        <p className="text-sm text-muted-foreground">{request.category}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('w-fit shrink-0 rounded-lg border px-2.5 py-0.5 capitalize', getStatusColor(request.status))}
                      >
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      {request.buyerContactPhone ? (
                        <p className="flex flex-wrap items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <a
                            href={`tel:${request.buyerContactPhone.replace(/\D/g, '')}`}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {request.buyerContactPhone}
                          </a>
                          <span className="text-muted-foreground">· tap to call</span>
                        </p>
                      ) : null}
                      <p className="break-words">
                        <span className="font-medium text-foreground">Buyer</span>{' '}
                        <span className="text-muted-foreground">{request.customerId}</span>
                      </p>
                      <p className="flex items-start gap-2 break-words">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>{request.location}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(request.updatedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                        <Button
                          variant="secondary"
                          className="h-11 w-full rounded-xl sm:h-10 sm:w-auto"
                          disabled={request.status !== 'pending' || savingId === request.id}
                          onClick={() => updateRequestStatus(request.id, 'matched')}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 w-full rounded-xl sm:h-10 sm:w-auto"
                          disabled={request.status !== 'matched' || savingId === request.id}
                          onClick={() => updateRequestStatus(request.id, 'in_progress')}
                        >
                          Start work
                        </Button>
                        <Button
                          className="h-11 w-full rounded-xl sm:h-10 sm:w-auto"
                          disabled={request.status === 'completed' || savingId === request.id}
                          onClick={() => updateRequestStatus(request.id, 'completed')}
                        >
                          Complete
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {(request.status === 'matched' || request.status === 'in_progress') ? (
                          <Link
                            href={`/services/orders/trip/${encodeURIComponent(request.id)}`}
                            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 font-semibold text-primary hover:bg-primary/15"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            Live map
                          </Link>
                        ) : null}
                        <Link
                          href="/services/promotions"
                          className="inline-flex h-10 items-center rounded-xl border border-border/80 px-3 font-medium hover:bg-muted/50"
                        >
                          Promotion
                        </Link>
                        <Link
                          href="/services"
                          className="inline-flex h-10 items-center rounded-xl border border-border/80 px-3 font-medium hover:bg-muted/50"
                        >
                          Dashboard
                        </Link>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground md:text-xs">
          <Badge variant="outline" className="gap-1 rounded-lg font-normal">
            <Circle className="h-3 w-3" />
            Pending {stats.pending}
          </Badge>
          <Badge variant="outline" className="gap-1 rounded-lg font-normal">
            <Timer className="h-3 w-3" />
            Matched {stats.matched}
          </Badge>
          <Badge variant="outline" className="gap-1 rounded-lg font-normal">
            <PlayCircle className="h-3 w-3" />
            In progress {stats.inProgress}
          </Badge>
          <Badge variant="outline" className="gap-1 rounded-lg font-normal">
            <CheckCircle2 className="h-3 w-3" />
            Done {stats.completed}
          </Badge>
        </div>
      </div>

    </>
  );
}
