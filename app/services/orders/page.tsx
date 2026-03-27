'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Clock3, Circle, CheckCircle2, PlayCircle, Timer, MapPin } from 'lucide-react';
import Link from 'next/link';

interface ServiceRequest {
  id: string;
  customerId: string;
  category: string;
  service: string;
  location: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export default function ServiceOrdersPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setError(null);
    try {
      const response = await fetch('/api/vendor/service-requests');
      if (!response.ok) {
        throw new Error('Unable to fetch service requests at the moment.');
      }
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error('Failed to fetch service requests:', fetchError);
      setError('Could not load service requests. Please try again.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: ServiceRequest['status']) => {
    try {
      setSavingId(id);
      const response = await fetch('/api/vendor/service-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) return;
      const updated = (await response.json()) as ServiceRequest;
      setRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    } catch (updateError) {
      console.error('Failed to update request status:', updateError);
    } finally {
      setSavingId(null);
    }
  };

  const getStatusColor = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'matched':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'in_progress':
        return 'bg-primary/10 text-primary';
      case 'completed':
        return 'bg-green-500/10 text-green-700 dark:text-green-300';
      default:
        return 'bg-muted text-muted-foreground';
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
    return <div className="flex items-center justify-center p-8">Loading service requests...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Request Operations</h1>
          <p className="text-muted-foreground">Accept, execute, and complete buyer service requests fast from one command center.</p>
        </div>

        <Button variant="outline" onClick={fetchRequests} className="gap-2 md:w-auto">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {activeRequest ? (
        <Card className="border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Live Dispatch</p>
              <p className="mt-1 text-lg font-semibold">
                {activeRequest.service} ({activeRequest.id})
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {activeRequest.location}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-1"
                disabled={activeRequest.status === 'in_progress' || savingId === activeRequest.id}
                onClick={() => updateRequestStatus(activeRequest.id, 'in_progress')}
              >
                <PlayCircle className="h-4 w-4" /> Start Service
              </Button>
              <Button
                className="gap-1"
                disabled={activeRequest.status === 'completed' || savingId === activeRequest.id}
                onClick={() => updateRequestStatus(activeRequest.id, 'completed')}
              >
                <CheckCircle2 className="h-4 w-4" /> Mark Completed
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Total Requests</p>
          <p className="text-2xl font-bold leading-none">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">All incoming requests</p>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Needs Response</p>
          <p className="text-2xl font-bold leading-none">{stats.pending}</p>
          <p className="mt-1 text-xs text-muted-foreground">Pending acceptance</p>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">In Execution</p>
          <p className="text-2xl font-bold leading-none">{stats.matched + stats.inProgress}</p>
          <p className="mt-1 text-xs text-muted-foreground">Matched and in progress</p>
        </Card>

        <Card className="p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Completed Today</p>
          <p className="text-2xl font-bold leading-none">{stats.completed}</p>
          <p className="mt-1 text-xs text-muted-foreground">Closed service jobs</p>
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by request ID, category, service, or location..."
              className="pl-9"
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="matched">Matched</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1"><Clock3 className="h-3.5 w-3.5" />Pending: {stats.pending}</Badge>
          <Badge variant="outline" className="gap-1"><Timer className="h-3.5 w-3.5" />Matched: {stats.matched}</Badge>
          <Badge variant="outline" className="gap-1"><PlayCircle className="h-3.5 w-3.5" />In progress: {stats.inProgress}</Badge>
          <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Completed: {stats.completed}</Badge>
        </div>
      </Card>

      <div className="space-y-4">
        {error ? (
          <Card className="p-8 text-center">
            <p className="mb-3 font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchRequests}>Try again</Button>
          </Card>
        ) : filteredRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-medium">No matching service requests</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting filters or refresh to check for new buyer requests.</p>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            return (
              <Card key={request.id} className="p-6">
                <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {request.service} ({request.id})
                    </h3>
                    <p className="text-sm text-muted-foreground">{request.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Created {new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm"><span className="font-medium">Buyer ID:</span> {request.customerId}</p>
                    <p className="text-sm"><span className="font-medium">Service Address:</span> {request.location}</p>
                    <p className="text-sm"><span className="font-medium">Last Updated:</span> {new Date(request.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                    <p className="text-muted-foreground">Quick Status Flow</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                        <Circle className="h-3.5 w-3.5" /> Pending
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                        <Timer className="h-3.5 w-3.5" /> Matched
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                        <PlayCircle className="h-3.5 w-3.5" /> In Progress
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={request.status !== 'pending' || savingId === request.id}
                      onClick={() => updateRequestStatus(request.id, 'matched')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(request.status !== 'matched' && request.status !== 'pending') || savingId === request.id}
                      onClick={() => updateRequestStatus(request.id, 'in_progress')}
                    >
                      Start Work
                    </Button>
                    <Button
                      size="sm"
                      disabled={request.status === 'completed' || savingId === request.id}
                      onClick={() => updateRequestStatus(request.id, 'completed')}
                    >
                      Complete
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/services/promotions" className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted/40">
                      Offer follow-up promotion
                    </Link>
                    <Link href="/services" className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted/40">
                      Back to provider dashboard
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
