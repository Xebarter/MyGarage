'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Clock3,
  LifeBuoy,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  PhoneCall,
  RefreshCw,
  Send,
  Wrench,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

type TicketTopic = 'order' | 'service' | 'refund' | 'payment' | 'account' | 'other';

const SUPPORT_PHONE_DISPLAY = '+256 752 405 877';
const SUPPORT_PHONE_TEL = 'tel:+256752405877';
const SUPPORT_WHATSAPP = 'https://wa.me/256752405877';
const SUPPORT_EMAIL = 'support@mygarage.ug';

const TOPICS: { id: TicketTopic; label: string; subject: string }[] = [
  { id: 'order', label: 'Order or delivery', subject: 'Help with an order' },
  { id: 'service', label: 'Service request', subject: 'Help with a service request' },
  { id: 'refund', label: 'Refund or return', subject: 'Refund or return request' },
  { id: 'payment', label: 'Payment', subject: 'Payment issue' },
  { id: 'account', label: 'Account', subject: 'Account help' },
  { id: 'other', label: 'Something else', subject: '' },
];

const SHORTCUTS = [
  { href: '/buyer/orders', label: 'Track an order', hint: 'Status and delivery', icon: Package },
  { href: '/buyer/services', label: 'Track a service', hint: 'Mechanic or roadside help', icon: Wrench },
  { href: '/buyer/addresses', label: 'Delivery addresses', hint: 'Add or change a location', icon: MapPin },
  { href: '/refund-policy', label: 'Refund policy', hint: 'Returns and timelines', icon: LifeBuoy },
] as const;

export default function BuyerSupportPage() {
  const [customerId, setCustomerId] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [topic, setTopic] = useState<TicketTopic | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [recentOrders, setRecentOrders] = useState<{ id: string; createdAt: string }[]>([]);
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
      setRecentOrders([]);
      return;
    }
    void loadTickets(customerId);
    void loadRecentOrders(customerId);
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
    } finally {
      setSessionReady(true);
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

  const loadRecentOrders = async (id: string) => {
    try {
      const response = await fetch(`/api/orders?customerId=${encodeURIComponent(id)}`);
      if (!response.ok) {
        setRecentOrders([]);
        return;
      }
      const data = (await response.json()) as unknown;
      const list = Array.isArray(data) ? data : [];
      setRecentOrders(
        list
          .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const rec = row as Record<string, unknown>;
            const orderIdValue = String(rec.id ?? '').trim();
            if (!orderIdValue) return null;
            return { id: orderIdValue, createdAt: String(rec.createdAt ?? rec.created_at ?? '') };
          })
          .filter((row): row is { id: string; createdAt: string } => Boolean(row))
          .slice(0, 8),
      );
    } catch {
      setRecentOrders([]);
    }
  };

  const chooseTopic = (next: TicketTopic) => {
    const previous = TOPICS.find((item) => item.id === topic);
    const nextMeta = TOPICS.find((item) => item.id === next);
    setTopic(next);
    if (!subject.trim() || (previous && subject.trim() === previous.subject)) {
      setSubject(nextMeta?.subject ?? '');
    }
  };

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim() || !customerId || loading) return;
    setFormError(null);
    try {
      setLoading(true);
      const topicLabel = TOPICS.find((item) => item.id === topic)?.label;
      const composedMessage = topicLabel ? `${message.trim()}\n\nTopic: ${topicLabel}` : message.trim();
      const response = await fetch('/api/buyer/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subject: subject.trim(),
          message: composedMessage,
          orderId: orderId.trim() ? orderId.trim() : undefined,
          priority,
        }),
      });
      if (!response.ok) {
        setFormError('Could not send your ticket. Try again, or call us.');
        return;
      }
      setSent(true);
      setSubject('');
      setMessage('');
      setOrderId('');
      setTopic('');
      setPriority('normal');
      await loadTickets(customerId);
      setTimeout(() => setSent(false), 4000);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      setFormError('Could not send your ticket. Check your connection and try again.');
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

  const openTicketCount = useMemo(
    () => tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    [tickets],
  );

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Help"
        title="Support"
        description="Call, message, or send a ticket. For something urgent, call — we pick up during business hours."
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href={SUPPORT_PHONE_TEL}
          className={cn(
            BUYER_SURFACE,
            'flex items-center gap-3 p-4 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PhoneCall className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Call</span>
            <span className="block text-sm font-semibold text-foreground">{SUPPORT_PHONE_DISPLAY}</span>
          </span>
        </a>
        <a
          href={SUPPORT_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            BUYER_SURFACE,
            'flex items-center gap-3 p-4 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp</span>
            <span className="block text-sm font-semibold text-foreground">{SUPPORT_PHONE_DISPLAY}</span>
          </span>
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className={cn(
            BUYER_SURFACE,
            'flex items-center gap-3 p-4 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</span>
            <span className="block truncate text-sm font-semibold text-foreground">{SUPPORT_EMAIL}</span>
          </span>
        </a>
        <div className={cn(BUYER_SURFACE, 'flex items-center gap-3 p-4')}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hours</p>
            <p className="text-sm font-semibold text-foreground">Mon–Sat · 8:00 AM – 6:00 PM</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                BUYER_SURFACE,
                'flex items-start gap-3 p-4 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6 lg:col-span-7')}>
          <h2 className="text-base font-bold tracking-tight">Open a ticket</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We usually reply within one business day. Include an order number when you have one.
          </p>

          {sessionReady && !customerId ? (
            <div className="mt-5 rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Sign in to send a ticket from this account.</p>
              <p className="mt-1 text-xs text-muted-foreground">You can still call or WhatsApp without signing in.</p>
              <Button asChild className="mt-3 h-11 rounded-xl">
                <Link href={`/auth?role=buyer&next=${encodeURIComponent('/buyer/support')}`}>Sign in</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label>What is this about?</Label>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseTopic(item.id)}
                      className={cn(
                        'h-9 rounded-full border px-3 text-xs font-semibold transition',
                        topic === item.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
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
                  <Label htmlFor="ticket-order">Related order</Label>
                  {recentOrders.length > 0 ? (
                    <Select value={orderId || '__none'} onValueChange={(v) => setOrderId(v === '__none' ? '' : v)}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select an order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">No related order</SelectItem>
                        {recentOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.id}
                            {order.createdAt ? ` · ${formatOrderWhen(order.createdAt)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="ticket-order"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Order ID if you have one"
                      className="h-11 rounded-xl"
                    />
                  )}
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
                      <SelectItem value="urgent">Urgent — call if you need us now</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-message">What happened?</Label>
                <Textarea
                  id="ticket-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What went wrong, what you already tried, and any order or service details…"
                  className="min-h-32 rounded-xl"
                />
              </div>
              <Button
                onClick={() => void submitTicket()}
                disabled={loading || !customerId || !subject.trim() || !message.trim()}
                className="h-11 w-full gap-2 rounded-xl sm:w-auto"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Sending…' : 'Send ticket'}
              </Button>
              {formError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}
              {sent ? (
                <p className="text-sm font-medium text-primary">Ticket sent. We will follow up by email or phone.</p>
              ) : null}
            </div>
          )}
        </Card>

        <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6 lg:col-span-5')}>
          <h2 className="text-base font-bold tracking-tight">Quick answers</h2>
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="track-order">
              <AccordionTrigger className="text-sm font-semibold">How do I track an order?</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Open{' '}
                <Link href="/buyer/orders" className="font-medium text-primary underline-offset-4 hover:underline">
                  Orders
                </Link>{' '}
                to see payment, packing, and delivery status. If an order is stuck, send a ticket with the order ID.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="track-service">
              <AccordionTrigger className="text-sm font-semibold">How do I track a mechanic or service?</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Go to{' '}
                <Link href="/buyer/services" className="font-medium text-primary underline-offset-4 hover:underline">
                  Services
                </Link>{' '}
                and open the live request. Only one service can run at a time.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment">
              <AccordionTrigger className="text-sm font-semibold">What if my payment failed?</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Retry checkout once. If money left your account but the order did not appear, send a ticket with the
                time and phone number used to pay.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="refund">
              <AccordionTrigger className="text-sm font-semibold">How do I request a refund?</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Read the{' '}
                <Link href="/refund-policy" className="font-medium text-primary underline-offset-4 hover:underline">
                  refund policy
                </Link>
                , then open a ticket with your order number, photos if something arrived damaged, and what you need.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="address">
              <AccordionTrigger className="text-sm font-semibold">Can I change my delivery address?</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Update saved locations on{' '}
                <Link href="/buyer/addresses" className="font-medium text-primary underline-offset-4 hover:underline">
                  Addresses
                </Link>
                . If the order has already shipped, call us so we can coordinate with the rider.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="hours">
              <AccordionTrigger className="text-sm font-semibold">When will someone reply?</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Tickets are answered within one business day, Monday to Saturday, 8:00 AM – 6:00 PM. For something that
                cannot wait, call {SUPPORT_PHONE_DISPLAY}.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <p className="mt-4 text-xs text-muted-foreground">
            More detail is on the{' '}
            <Link href="/faq" className="font-medium text-primary underline-offset-4 hover:underline">
              FAQ
            </Link>
            .
          </p>
        </Card>
      </div>

      <Card className={cn(BUYER_SURFACE)}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight">Your tickets</h2>
            <p className="text-xs text-muted-foreground">
              {openTicketCount > 0 ? `${openTicketCount} still open` : 'Status updates from the support team'}
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {tickets.length}
          </Badge>
        </div>
        <div className="p-4 sm:p-5">
          {ticketsLoading ? (
            <BuyerPageSkeleton tiles={0} rows={2} />
          ) : !customerId ? (
            <BuyerEmptyState
              icon={LifeBuoy}
              title="Sign in to see your tickets"
              description="Tickets stay attached to your buyer account so we can follow up on the same issue."
            >
              <Button asChild>
                <Link href={`/auth?role=buyer&next=${encodeURIComponent('/buyer/support')}`}>Sign in</Link>
              </Button>
            </BuyerEmptyState>
          ) : tickets.length === 0 ? (
            <BuyerEmptyState
              icon={LifeBuoy}
              title="No tickets yet"
              description="Send a request above, or call if you need help right now."
            >
              <Button asChild variant="outline">
                <a href={SUPPORT_PHONE_TEL}>Call {SUPPORT_PHONE_DISPLAY}</a>
              </Button>
            </BuyerEmptyState>
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
                      disabled={loading || ticket.status === 'closed' || ticket.status === 'resolved'}
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
