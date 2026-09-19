'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CONTACT_MESSAGE_STATUSES, type ContactMessageStatus } from '@/lib/contact-messages';

type ContactMessageDto = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
};

type Stats = Record<ContactMessageStatus, number> & { total: number };

const STATUS_FILTERS: Array<{ id: 'all' | ContactMessageStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'read', label: 'Read' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'archived', label: 'Archived' },
];

function statusLabel(status: ContactMessageStatus): string {
  if (status === 'in_progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusBadgeClass(status: ContactMessageStatus): string {
  if (status === 'new') return 'border-sky-500/35 bg-sky-500/10 text-sky-950 dark:text-sky-100';
  if (status === 'read') return 'border-border bg-muted/80 text-muted-foreground';
  if (status === 'in_progress') return 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100';
  if (status === 'resolved') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
  return 'border-slate-500/35 bg-slate-500/10 text-slate-950 dark:text-slate-100';
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function previewText(value: string, max = 90): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}

function emptyStats(): Stats {
  return { new: 0, read: 0, in_progress: 0, resolved: 0, archived: 0, total: 0 };
}

export default function AdminMessagesPage() {
  const [items, setItems] = useState<ContactMessageDto[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactMessageStatus>('all');

  const [openId, setOpenId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('status', statusFilter);
        if (debouncedQuery) params.set('q', debouncedQuery);
        const res = await fetch(`/api/admin/contact-messages?${params.toString()}`, { cache: 'no-store' });
        const data = (await res.json().catch(() => null)) as
          | { items?: ContactMessageDto[]; stats?: Stats; error?: string }
          | null;
        if (!res.ok) throw new Error(data?.error || 'Failed to load messages');
        setItems(Array.isArray(data?.items) ? data.items : []);
        setStats(data?.stats ?? emptyStats());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load messages');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, debouncedQuery],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => items.find((item) => item.id === openId) ?? null, [items, openId]);

  useEffect(() => {
    setNotesDraft(active?.adminNotes ?? '');
  }, [active?.id, active?.adminNotes]);

  async function patchMessage(id: string, body: { status?: ContactMessageStatus; adminNotes?: string }) {
    const res = await fetch(`/api/admin/contact-messages/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as ContactMessageDto & { error?: string };
    if (!res.ok) throw new Error(data?.error || 'Failed to update message');
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)));
    setStats((prev) => {
      const next = { ...prev };
      const previous = items.find((item) => item.id === id);
      if (previous && body.status && previous.status !== body.status) {
        next[previous.status] = Math.max(0, next[previous.status] - 1);
        next[body.status] += 1;
      }
      return next;
    });
    return data;
  }

  async function openMessage(id: string) {
    setOpenId(id);
    const item = items.find((row) => row.id === id);
    if (item?.status === 'new') {
      try {
        await patchMessage(id, { status: 'read' });
      } catch {
        /* keep sheet open even if auto-read fails */
      }
    }
  }

  async function handleStatusChange(status: ContactMessageStatus) {
    if (!active) return;
    setSaving(true);
    try {
      await patchMessage(active.id, { status });
      toast.success(`Marked as ${statusLabel(status).toLowerCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    if (!active) return;
    setSaving(true);
    try {
      await patchMessage(active.id, { adminNotes: notesDraft });
      toast.success('Notes saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save notes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm(`Delete the message from ${active.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contact-messages/${encodeURIComponent(active.id)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Failed to delete message');
      setItems((prev) => prev.filter((item) => item.id !== active.id));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        [active.status]: Math.max(0, prev[active.status] - 1),
      }));
      setOpenId(null);
      toast.success('Message deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete message');
    } finally {
      setDeleting(false);
    }
  }

  const filterCount = (id: 'all' | ContactMessageStatus) => (id === 'all' ? stats.total : stats[id]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inquiries submitted from the Contact us form.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load({ silent: true })} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="New" value={stats.new} icon={Mail} />
        <StatCard label="In progress" value={stats.in_progress} icon={Clock3} />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} />
        <StatCard label="Total" value={stats.total} icon={MessageSquare} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                statusFilter === filter.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {filter.label}
              <span className={cn('tabular-nums', statusFilter === filter.id ? 'opacity-90' : 'opacity-70')}>
                {filterCount(filter.id)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, or message"
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading messages…
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-semibold text-foreground">No messages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New submissions from /contact-us will show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {items.map((item) => (
                <MessageMobileCard key={item.id} item={item} onOpen={openMessage} />
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => void openMessage(item.id)}
                    >
                      <TableCell className="align-top">
                        <p className={cn('font-medium', item.status === 'new' && 'font-semibold')}>{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                        {item.phone ? <p className="text-xs text-muted-foreground">{item.phone}</p> : null}
                      </TableCell>
                      <TableCell className="max-w-md align-top text-sm text-muted-foreground">
                        {previewText(item.message, 140)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className={statusBadgeClass(item.status)}>
                          {statusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="align-top">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Sheet open={Boolean(openId)} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          {active ? (
            <>
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="pr-8">{active.name}</SheetTitle>
                <SheetDescription>{formatDateTime(active.createdAt)}</SheetDescription>
              </SheetHeader>

              <div className="space-y-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusBadgeClass(active.status)}>
                    {statusLabel(active.status)}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <a
                    href={`mailto:${active.email}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    {active.email}
                  </a>
                  {active.phone ? (
                    <a
                      href={`tel:${active.phone.replace(/\s+/g, '')}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {active.phone}
                    </a>
                  ) : (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      No phone provided
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Message
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm leading-6 text-foreground">
                    {active.message}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-status">Status</Label>
                  <Select
                    value={active.status}
                    onValueChange={(value) => void handleStatusChange(value as ContactMessageStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger id="message-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_MESSAGE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-notes">Internal notes</Label>
                  <Textarea
                    id="admin-notes"
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Follow-up notes, who called, next action…"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleSaveNotes()}
                    disabled={saving || notesDraft === active.adminNotes}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save notes
                  </Button>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => void handleStatusChange('resolved')} disabled={saving}>
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleStatusChange('archived')} disabled={saving}>
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
                <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Mail;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function MessageMobileCard({
  item,
  onOpen,
}: {
  item: ContactMessageDto;
  onOpen: (id: string) => void;
}) {
  const open = () => onOpen(item.id);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      className="flex cursor-pointer flex-col gap-2 border-b border-border/70 px-4 py-3.5 transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-medium text-foreground', item.status === 'new' && 'font-semibold')}>
            {item.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{item.email}</p>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', statusBadgeClass(item.status))}>
          {statusLabel(item.status)}
        </Badge>
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{previewText(item.message, 160)}</p>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatDateTime(item.createdAt)}</span>
        <ChevronRight className="h-4 w-4 opacity-50" />
      </div>
    </div>
  );
}
