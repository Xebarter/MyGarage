'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { providerServiceGroups, providerSignupServiceOptions } from '@/lib/services-catalog';
import {
  CheckCircle2,
  Clock3,
  Star,
  TrendingUp,
  UserRound,
  Wrench,
  ShieldCheck,
  TimerReset,
  PhoneCall,
  Search,
  SlidersHorizontal,
  Activity,
  ClipboardList,
  CircleCheckBig,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RangeSelector } from '@/components/analytics/range-selector';

type ProviderRequest = {
  id: string;
  buyerName: string;
  service: string;
  location: string;
  priority: 'normal' | 'urgent';
  status: 'new' | 'in_progress' | 'completed';
  createdAt: string;
};

type ProviderReview = {
  id: string;
  buyerName: string;
  service: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const defaultRequests: ProviderRequest[] = [
  {
    id: 'SR-001',
    buyerName: 'Moses K.',
    service: 'Battery replacement',
    location: 'Ntinda, Kampala',
    priority: 'urgent',
    status: 'new',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'SR-002',
    buyerName: 'Amina N.',
    service: 'AC repair',
    location: 'Kira, Wakiso',
    priority: 'normal',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const defaultReviews: ProviderReview[] = [
  {
    id: 'RV-001',
    buyerName: 'Daniel O.',
    service: 'Wheel alignment',
    rating: 5,
    comment: 'Fast service and very professional.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'RV-002',
    buyerName: 'Sarah T.',
    service: 'Jump-start',
    rating: 4,
    comment: 'Arrived quickly and solved the issue.',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];
const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

export default function ServiceProviderDashboardPage() {
  const router = useRouter();
  const [tab] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    return (new URLSearchParams(window.location.search).get('tab') || 'overview').toString();
  });

  const [providerName, setProviderName] = useState('Service Provider');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [availability, setAvailability] = useState<'online' | 'busy' | 'offline'>('online');
  const [requestQuery, setRequestQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState<'all' | ProviderRequest['status']>('all');
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [vendorId, setVendorId] = useState('');
  const [liveOffer, setLiveOffer] = useState<{
    assignment: { id: string; requestId: string; assignedAt: string };
    request: {
      id: string;
      service: string;
      category: string;
      location: string;
      status: string;
      buyer_contact_phone: string | null;
      buyer_contact_name: string | null;
    };
  } | null>(null);
  const [liveJob, setLiveJob] = useState<{
    id: string;
    service: string;
    location: string;
    status: string;
    buyer_contact_phone: string | null;
    buyer_contact_name: string | null;
    accepted_at: string | null;
    arrived_at: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null>(null);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchActionError, setDispatchActionError] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem('currentServiceProviderName') || 'Service Provider';
    setProviderName(name);

    const savedServices = localStorage.getItem('currentServiceProviderServices');
    const parsedServices = savedServices ? (JSON.parse(savedServices) as string[]) : [];
    setSelectedServices(parsedServices);

    const savedRequests = localStorage.getItem('providerServiceRequests');
    const parsedRequests = savedRequests ? (JSON.parse(savedRequests) as ProviderRequest[]) : defaultRequests;
    setRequests(parsedRequests);

    const savedReviews = localStorage.getItem('providerServiceReviews');
    const parsedReviews = savedReviews ? (JSON.parse(savedReviews) as ProviderReview[]) : defaultReviews;
    setReviews(parsedReviews);

    setVendorId(localStorage.getItem('currentVendorId') || '');
  }, []);

  const refreshDispatch = useCallback(async () => {
    const id = typeof window !== 'undefined' ? localStorage.getItem('currentVendorId') || '' : '';
    setVendorId(id);
    if (!id) {
      setLiveOffer(null);
      setLiveJob(null);
      return;
    }
    const res = await fetch(`/api/services/dispatch/me?vendorId=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const json = (await res.json()) as {
      offer: {
        assignment: { id: string; requestId: string; assignedAt: string };
        request: {
          id: string;
          service: string;
          category: string;
          location: string;
          status: string;
          buyer_contact_phone: string | null;
          buyer_contact_name: string | null;
        };
      } | null;
      activeJob: {
        id: string;
        service: string;
        location: string;
        status: string;
        buyer_contact_phone: string | null;
        buyer_contact_name: string | null;
        accepted_at: string | null;
        arrived_at: string | null;
        started_at: string | null;
        completed_at: string | null;
      } | null;
    };
    setLiveOffer(json.offer);
    setLiveJob(json.activeJob);
  }, []);

  useEffect(() => {
    void refreshDispatch();
    const t = setInterval(() => void refreshDispatch(), 4000);
    return () => clearInterval(t);
  }, [refreshDispatch]);

  const respondToLiveOffer = async (assignmentId: string, action: 'accept' | 'decline') => {
    const id = vendorId || (typeof window !== 'undefined' ? localStorage.getItem('currentVendorId') || '' : '');
    if (!id || dispatchBusy) return;
    const tripRequestId = action === 'accept' ? liveOffer?.assignment.requestId : null;
    setDispatchBusy(true);
    setDispatchActionError(null);
    try {
      const res = await fetch('/api/services/dispatch/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, vendorId: id, action }),
      });
      let acceptErr: string | null = null;
      if (!res.ok && action === 'accept') {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        acceptErr = body.error || 'Could not accept this offer.';
      }
      await refreshDispatch();
      if (acceptErr) {
        setDispatchActionError(acceptErr);
      } else if (res.ok && action === 'accept' && tripRequestId) {
        router.push(`/services/orders/trip/${encodeURIComponent(tripRequestId)}`);
      }
    } finally {
      setDispatchBusy(false);
    }
  };

  const advanceLiveJob = async (requestId: string, stage: 'arrived' | 'started' | 'completed') => {
    const id = vendorId || (typeof window !== 'undefined' ? localStorage.getItem('currentVendorId') || '' : '');
    if (!id || dispatchBusy) return;
    setDispatchBusy(true);
    try {
      await fetch('/api/services/dispatch/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, vendorId: id, stage }),
      });
      await refreshDispatch();
    } finally {
      setDispatchBusy(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('providerServiceRequests', JSON.stringify(requests));
  }, [requests]);

  const kpis = useMemo(() => {
    const totalRequests = requests.length;
    const openRequests = requests.filter((request) => request.status === 'new' || request.status === 'in_progress').length;
    const completedRequests = requests.filter((request) => request.status === 'completed').length;
    const avgRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
    return { totalRequests, openRequests, completedRequests, avgRating };
  }, [requests, reviews]);

  const serviceCoverage = useMemo(() => {
    if (selectedServices.length === 0) return 0;
    return Math.round((selectedServices.length / providerSignupServiceOptions.length) * 100);
  }, [selectedServices]);

  const groupedSelectedServices = useMemo(
    () =>
      providerServiceGroups
        .map((group) => ({
          ...group,
          services: group.services.filter((service) => selectedServices.includes(service)),
        }))
        .filter((group) => group.services.length > 0),
    [selectedServices]
  );

  const filteredRequests = useMemo(() => {
    const q = requestQuery.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesFilter = requestFilter === 'all' ? true : request.status === requestFilter;
      const matchesSearch =
        !q ||
        request.service.toLowerCase().includes(q) ||
        request.buyerName.toLowerCase().includes(q) ||
        request.location.toLowerCase().includes(q) ||
        request.id.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [requests, requestFilter, requestQuery]);

  const activeTabCount = useMemo(
    () => ({
      services: selectedServices.length,
      requests: kpis.openRequests,
      ratings: reviews.length,
    }),
    [kpis.openRequests, reviews.length, selectedServices.length]
  );

  const updateRequestStatus = (id: string, status: ProviderRequest['status']) => {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
  };

  const toggleService = (service: string) => {
    setSelectedServices((current) => {
      const exists = current.includes(service);
      const next = exists ? current.filter((item) => item !== service) : [...current, service];
      localStorage.setItem('currentServiceProviderServices', JSON.stringify(next));
      return next;
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'My Services', count: activeTabCount.services },
    { id: 'requests', label: 'Requests', count: activeTabCount.requests },
    { id: 'ratings', label: 'Ratings', count: activeTabCount.ratings },
  ];

  const statusTone: Record<ProviderRequest['status'], string> = {
    new: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    in_progress: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    completed: 'bg-green-500/10 text-green-700 dark:text-green-300',
  };

  const kpiCards = [
    { label: 'Total Requests', value: kpis.totalRequests, icon: ClipboardList, hint: 'All received jobs' },
    { label: 'Open Requests', value: kpis.openRequests, icon: Activity, hint: 'Need action now' },
    { label: 'Completed', value: kpis.completedRequests, icon: CircleCheckBig, hint: 'Successfully finished' },
    { label: 'Average Rating', value: kpis.avgRating.toFixed(1), icon: Star, hint: 'Buyer satisfaction score' },
  ];

  const requestStatusChart = useMemo(() => {
    const now = Date.now();
    const maxAgeMs =
      trendRange === '7d' ? 7 * 86400000 : trendRange === '30d' ? 30 * 86400000 : 90 * 86400000;
    const scoped = requests.filter((request) => now - new Date(request.createdAt).getTime() <= maxAgeMs);
    return [
      { name: 'New', value: scoped.filter((request) => request.status === 'new').length },
      { name: 'In Progress', value: scoped.filter((request) => request.status === 'in_progress').length },
      { name: 'Completed', value: scoped.filter((request) => request.status === 'completed').length },
    ];
  }, [requests, trendRange]);

  const weeklyCompletions = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = Date.now();
    const maxAgeMs =
      trendRange === '7d' ? 7 * 86400000 : trendRange === '30d' ? 30 * 86400000 : 90 * 86400000;
    requests
      .filter((request) => now - new Date(request.createdAt).getTime() <= maxAgeMs)
      .filter((request) => request.status === 'completed')
      .forEach((request) => {
        const day = new Date(request.createdAt).getDay(); // 0 Sun .. 6 Sat
        const index = day === 0 ? 6 : day - 1;
        counts[index] += 1;
      });
    return labels.map((label, idx) => ({ day: label, completed: counts[idx] }));
  }, [requests, trendRange]);

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm backdrop-blur md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Provider Workspace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{providerName} Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Run your service operations from one place: keep your active offerings updated, respond to incoming jobs, and monitor quality performance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
                {selectedServices.length} active services
              </Badge>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
                Coverage {serviceCoverage}%
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push('/services?tab=requests')}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Review Open Requests
            </button>
            <button
              type="button"
              onClick={() => router.push('/services/myservices')}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
            >
              Update Service Coverage
            </button>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${serviceCoverage}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Keep high coverage to appear for more service requests.
          </p>
        </div>

        <Card className="rounded-2xl border-primary/25 bg-primary/5 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live dispatch</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">Incoming offers from buyers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Requests are offered to one provider at a time. Accept to claim the job, or decline to pass it to the next provider.
              </p>
            </div>
          </div>
          <div className="mt-4">
            {!vendorId ? (
              <p className="text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => router.push('/auth?role=services')}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in as a provider
                </button>{' '}
                to receive real-time job offers on this dashboard.
              </p>
            ) : liveOffer ? (
              <div className="rounded-xl border border-border/80 bg-background/90 p-4">
                <p className="text-sm font-medium text-foreground">{liveOffer.request.service}</p>
                <p className="text-xs text-muted-foreground">
                  {liveOffer.request.category} · {liveOffer.request.location}
                </p>
                <p className="mt-2 text-sm text-foreground">
                  <span className="font-medium">Buyer contact</span>{' '}
                  <span className="tabular-nums">
                    {(liveOffer.request.buyer_contact_name || '').trim() || '—'} ·{' '}
                    {(liveOffer.request.buyer_contact_phone || '').trim() || '—'}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Offer sent {new Date(liveOffer.assignment.assignedAt).toLocaleString()} — please respond promptly.
                </p>
                {dispatchActionError ? (
                  <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {dispatchActionError}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={dispatchBusy}
                    onClick={() => void respondToLiveOffer(liveOffer.assignment.id, 'accept')}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Accept job
                  </button>
                  <button
                    type="button"
                    disabled={dispatchBusy}
                    onClick={() => void respondToLiveOffer(liveOffer.assignment.id, 'decline')}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : liveJob ? (
              <div className="rounded-xl border border-border/80 bg-background/90 p-4">
                <p className="text-sm font-medium text-foreground">Active job: {liveJob.service}</p>
                <p className="text-xs text-muted-foreground">{liveJob.location}</p>
                <p className="mt-2 text-sm text-foreground">
                  <span className="font-medium">Buyer contact</span>{' '}
                  <span className="tabular-nums">
                    {(liveJob.buyer_contact_name || '').trim() || '—'} ·{' '}
                    {(liveJob.buyer_contact_phone || '').trim() || '—'}
                  </span>
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-primary">Status: {liveJob.status.replace(/_/g, ' ')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={dispatchBusy}
                    onClick={() => router.push(`/services/orders/trip/${encodeURIComponent(liveJob.id)}`)}
                    className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
                  >
                    Map &amp; call buyer
                  </button>
                  <button
                    type="button"
                    disabled={dispatchBusy || Boolean(liveJob.arrived_at)}
                    onClick={() => void advanceLiveJob(liveJob.id, 'arrived')}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                  >
                    Mark arrived on site
                  </button>
                  <button
                    type="button"
                    disabled={dispatchBusy || Boolean(liveJob.started_at) || !liveJob.arrived_at}
                    onClick={() => void advanceLiveJob(liveJob.id, 'started')}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                  >
                    Start service
                  </button>
                  <button
                    type="button"
                    disabled={dispatchBusy || Boolean(liveJob.completed_at) || !liveJob.started_at}
                    onClick={() => void advanceLiveJob(liveJob.id, 'completed')}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
                  >
                    Mark completed
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No offer right now. Keep this tab open — when a buyer request matches you, it will show up here first.
              </p>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-border/70 p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((item) => {
              const isServicesTab = item.id === 'services';
              const isActive = isServicesTab ? false : tab === item.id || (item.id === 'overview' && !tab);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    isServicesTab ? router.push('/services/myservices') : router.push(item.id === 'overview' ? '/services' : `/services?tab=${item.id}`)
                  }
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {typeof item.count === 'number' ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-2xl border-border/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <span className="rounded-xl border border-border/70 bg-muted/40 p-2.5">
                    <Icon className="h-4 w-4 text-foreground" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {(tab === 'overview' || tab === 'requests') && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold tracking-tight">Request Status Distribution</h3>
                <RangeSelector
                  value={trendRange}
                  onChange={setTrendRange}
                  options={[
                    { value: '7d', label: 'Last 7 days' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: '90d', label: 'Last 90 days' },
                  ]}
                  ariaLabel="Select service request status range"
                />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={requestStatusChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={50}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {requestStatusChart.map((_, idx) => (
                      <Cell key={`request-status-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold tracking-tight">Completed Jobs (Weekly)</h3>
                <RangeSelector
                  value={trendRange}
                  onChange={setTrendRange}
                  options={[
                    { value: '7d', label: 'Last 7 days' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: '90d', label: 'Last 90 days' },
                  ]}
                  ariaLabel="Select service completion trend range"
                />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyCompletions}>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--muted-foreground) / 0.2)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={42} />
                  <Tooltip formatter={(value: number) => [value, 'Completed jobs']} />
                  <Legend />
                  <Bar dataKey="completed" name="Completed jobs" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {(tab === 'overview' || tab === 'availability') && (
          <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold tracking-tight">Provider Availability</h3>
              <p className="text-xs text-muted-foreground">Controls buyer request matching</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['online', 'busy', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAvailability(status)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    availability === status
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/70 p-3">
                <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TimerReset className="h-3.5 w-3.5" />
                  Target Response Time
                </div>
                <p className="text-sm font-medium text-foreground">Within 15 minutes</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Completion Quality
                </div>
                <p className="text-sm font-medium text-foreground">{kpis.avgRating.toFixed(1)} / 5 rating</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <PhoneCall className="h-3.5 w-3.5" />
                  Dispatch Status
                </div>
                <p className="text-sm font-medium text-foreground capitalize">{availability}</p>
              </div>
            </div>
          </Card>
        )}

        {(tab === 'overview' || tab === 'services') && (
          <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold tracking-tight">My Services (from signup choices)</h3>
              <p className="text-xs text-muted-foreground">Toggle availability anytime</p>
            </div>
            <div className="space-y-4">
              {groupedSelectedServices.map((group) => (
                <div key={group.id} className="rounded-xl border border-border/70 p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.services.map((service) => {
                      const enabled = selectedServices.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggleService(service)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            enabled
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {service}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groupedSelectedServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No selected signup services yet.</p>
              ) : null}
            </div>
          </Card>
        )}

        {(tab === 'overview' || tab === 'requests') && (
          <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold tracking-tight">Incoming Service Requests</h3>
              <p className="text-xs text-muted-foreground">{requests.length} total requests</p>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={requestQuery}
                  onChange={(event) => setRequestQuery(event.target.value)}
                  type="search"
                  placeholder="Search by request ID, buyer, service, or location..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <div className="relative">
                <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={requestFilter}
                  onChange={(event) => setRequestFilter(event.target.value as 'all' | ProviderRequest['status'])}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-border/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {request.service} - {request.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.buyerName} - {request.location} - {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={request.priority === 'urgent' ? 'destructive' : 'outline'}>{request.priority}</Badge>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[request.status]}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(request.id, 'in_progress')}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={request.status === 'in_progress'}
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Mark In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(request.id, 'completed')}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={request.status === 'completed'}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Completed
                    </button>
                  </div>
                </div>
              ))}
              {filteredRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incoming requests yet. Keep your availability online to receive jobs.</p>
              ) : null}
            </div>
          </Card>
        )}

        {(tab === 'overview' || tab === 'ratings') && (
          <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold tracking-tight">Buyer Ratings and Feedback</h3>
              <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Growing reputation
              </div>
            </div>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="inline-flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">{review.buyerName}</p>
                      <span className="text-xs text-muted-foreground">for {review.service}</span>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${review.id}-${index}`}
                          className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
              {reviews.length === 0 ? <p className="text-sm text-muted-foreground">No ratings yet. Complete requests to build your reputation.</p> : null}
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border-border/70 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              This dashboard is provider-only. Service choices are sourced from the provider signup list in `additems.txt`.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
