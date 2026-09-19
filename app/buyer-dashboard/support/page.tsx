'use client';

import { useEffect, useState } from 'react';
import {
  Clock3,
  LifeBuoy,
  Mail,
  PhoneCall,
  RefreshCw,
  Send,
} from 'lucide-react';

import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageHeader,
  BuyerPageShell,
  BuyerPageSkeleton,
  formatOrderWhen,
  ticketPriorityClass,
  ticketStatusClass,
} from '@/components/buyer/buyer-page-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SupportTicket {
  id: string;
  customerId?: string;
  subject: string;
  message: string;
  orderId?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

const CONTACT = [
  { icon: Mail, label: 'Email', value: 'support@mygarage.com' },
  { icon: PhoneCall, label: 'Phone', value: '+256 700 000000' },
  { icon: Clock3, label: 'Hours', value: 'Mon–Sat, 8:00 AM – 6:00 PM' },
] as const;

const FAQ = [
  {
    q: 'How do I track an order?',
    a: 'Open Orders in your account to see status, line items, and the delivery address.',
  },
  {
    q: 'Can I save multiple delivery addresses?',
    a: 'Yes. Add destinations on the Addresses page and mark one as default for checkout.',
  },
  {
    q: 'How can I request a refund?',
    a: 'Submit a ticket with your order number and the reason. Our team will follow up by email.',
  },
] as const;

export default function BuyerSupportPage() {
  const [customerId, setCustomerId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<SupportTicket>>({});

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!customerId) {
      setTicketsLoading(false);
      return;
    }
    void loadTickets(customerId);
  }, [customerId]);

  const bootstrap = async () => {
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
    try {
      if (localId) {
        setCustomerId(localId);
        return;
      }
      if (!email) return;
      const byEmail = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
      if (!byEmail.ok) return;
      const customer = (await byEmail.json()) as { id?: string } | null;
      if (!customer?.id) return;
      setCustomerId(customer.id);
      localStorage.setItem('currentBuyerId', customer.id);
    } catch (error) {
      console.error('Failed to resolve customer for support:', error);
    }
  };

  const loadTickets = async (id: string) => {
    try {
      setTicketsLoading(true);
      const response = await fetch(`/api/buyer/support-tickets?customerId=${id}`);
      if (!response.ok) {
        setTickets([]);
        return;
      }
      const data = await response.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load support tickets:', error);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim() || !customerId || loading) return;
    try {
      setLoading(true);
      const response = await fetch('/api/buyer/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subject: subject.trim(),
          message: message.trim(),
          orderId: orderId.trim() ? orderId.trim() : undefined,
          priority,
        }),
      });
      if (!response.ok) return;
      setSent(true);
      setSubject('');
      setMessage('');
      setOrderId('');
      setPriority('normal');
      await loadTickets(customerId);
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setEditing(true);
    setEditDraft({
      subject: ticket.subject,
      message: ticket.message,
      orderId: ticket.orderId,
      status: ticket.status,
      priority: ticket.priority,
    });
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!selectedTicket) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/buyer/support-tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: String(editDraft.subject ?? '').trim(),
          message: String(editDraft.message ?? '').trim(),
          orderId: String(editDraft.orderId ?? '').trim() || undefined,
          status: editDraft.status,
          priority: editDraft.priority,
        }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTicket(updated);
      setEditing(false);
      setEditDraft({});
    } catch (error) {
      console.error('Failed to update support ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    const confirmed = window.confirm('Delete this support ticket?');
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/buyer/support-tickets/${ticketId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
        setEditing(false);
        setEditDraft({});
      }
    } catch (error) {
      console.error('Failed to delete support ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Help"
        title="Support"
        description="Get help with orders, refunds, and account questions. We typically reply within one business day."
        actions={
          <Button
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => customerId && loadTickets(customerId)}
            disabled={!customerId || ticketsLoading}
          >
            <RefreshCw className={cn('h-4 w-4', ticketsLoading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {CONTACT.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={cn(BUYER_SURFACE, 'p-4')}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6 lg:col-span-7')}>
          <h2 className="text-base font-bold tracking-tight">Open a ticket</h2>
          <p className="mt-1 text-sm text-muted-foreground">Share as much detail as you can so we can resolve this quickly.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-order">Order ID (optional)</Label>
                <Input
                  id="ticket-order"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as SupportTicket['priority'])}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-message">Message</Label>
              <Textarea
                id="ticket-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question…"
                className="min-h-32 rounded-xl"
              />
            </div>
            <Button
              onClick={() => void submitTicket()}
              disabled={loading || !customerId}
              className="h-11 w-full gap-2 rounded-xl sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending…' : 'Send ticket'}
            </Button>
            {sent ? <p className="text-sm font-medium text-primary">Ticket submitted. Our team will contact you soon.</p> : null}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-5">
          <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
            <h2 className="text-base font-bold tracking-tight">Quick answers</h2>
            <div className="mt-4 space-y-4">
              {FAQ.map((item) => (
                <div key={item.q} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-foreground">{item.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className={cn(BUYER_SURFACE)}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight">Your tickets</h2>
            <p className="text-xs text-muted-foreground">Status updates from the support team</p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {tickets.length}
          </Badge>
        </div>
        <div className="p-4 sm:p-5">
          {ticketsLoading ? (
            <BuyerPageSkeleton tiles={0} rows={2} />
          ) : tickets.length === 0 ? (
            <BuyerEmptyState
              icon={LifeBuoy}
              title="No tickets yet"
              description="Submit a request above when you need help with an order or your account."
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{ticket.subject}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ticket.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatOrderWhen(ticket.createdAt)}
                        {ticket.orderId ? ` · Order ${ticket.orderId}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={cn('capitalize', ticketPriorityClass(ticket.priority))}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline" className={cn('capitalize', ticketStatusClass(ticket.status))}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => startEdit(ticket)} disabled={loading}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        fetch(`/api/buyer/support-tickets/${ticket.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'closed' }),
                        }).then(() => loadTickets(customerId))
                      }
                      disabled={loading || ticket.status === 'closed'}
                    >
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void deleteTicket(ticket.id)}
                      disabled={loading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTicket && editing ? (
            <div className="mt-5 space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Edit ticket</p>
                <Badge variant="outline" className="capitalize">
                  {selectedTicket.status.replace('_', ' ')}
                </Badge>
              </div>
              <Input
                value={String(editDraft.subject ?? '')}
                onChange={(e) => setEditDraft((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Subject"
                className="h-11 rounded-xl"
              />
              <Input
                value={String(editDraft.orderId ?? '')}
                onChange={(e) => setEditDraft((p) => ({ ...p, orderId: e.target.value }))}
                placeholder="Order ID (optional)"
                className="h-11 rounded-xl"
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select
                  value={String(editDraft.priority ?? 'normal')}
                  onValueChange={(v) => setEditDraft((p) => ({ ...p, priority: v as SupportTicket['priority'] }))}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={String(editDraft.status ?? 'open')}
                  onValueChange={(v) => setEditDraft((p) => ({ ...p, status: v as SupportTicket['status'] }))}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={String(editDraft.message ?? '')}
                onChange={(e) => setEditDraft((p) => ({ ...p, message: e.target.value }))}
                className="min-h-32 rounded-xl"
                placeholder="Message"
              />
              <div className="flex gap-2">
                <Button onClick={() => void saveEdit()} disabled={loading} className="rounded-xl">
                  {loading ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={loading} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </BuyerPageShell>
  );
}
