'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Mail, PhoneCall } from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export default function BuyerSupportPage() {
  const [customerId, setCustomerId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!customerId) return;
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
      const customer = await byEmail.json();
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
          priority: 'normal',
        }),
      });
      if (!response.ok) return;
      setSent(true);
      setSubject('');
      setMessage('');
      await loadTickets(customerId);
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Get help with orders, refunds, and account concerns.</p>
        </div>
        <Badge variant="outline">Buyer Support</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <p className="font-medium">Email</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">support@mygarage.com</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            <p className="font-medium">Phone</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">+256 700 000000</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            <p className="font-medium">Hours</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Mon-Sat, 8:00 AM - 6:00 PM</p>
        </Card>
      </div>

      <Card className="space-y-4 p-6">
        <h3 className="font-semibold">Submit a Support Ticket</h3>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ticket subject" />
        <textarea
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your issue or question..."
        />
        <Button onClick={submitTicket} disabled={loading || !customerId}>
          {loading ? 'Sending...' : 'Send Ticket'}
        </Button>
        {sent ? <p className="text-sm text-primary">Ticket submitted. Our team will contact you soon.</p> : null}
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">My Tickets</h3>
          <Badge variant="outline">{tickets.length} total</Badge>
        </div>

        {ticketsLoading ? (
          <p className="text-sm text-muted-foreground">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet. Submit one above when you need help.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-md border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">{ticket.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{ticket.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ticket #{ticket.id} • Created {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Priority: {ticket.priority}</Badge>
                    <Badge
                      className={
                        ticket.status === 'resolved' || ticket.status === 'closed'
                          ? 'bg-primary/10 text-primary'
                          : ticket.status === 'in_progress'
                            ? 'bg-accent/20 text-accent-foreground'
                            : 'bg-muted text-muted-foreground'
                      }
                    >
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-6">
        <h3 className="font-semibold">Quick Answers</h3>
        <div>
          <p className="font-medium">How do I track an order?</p>
          <p className="text-sm text-muted-foreground">Open the Orders page in your buyer dashboard to view status and details.</p>
        </div>
        <div>
          <p className="font-medium">Can I save multiple delivery addresses?</p>
          <p className="text-sm text-muted-foreground">Yes, add and manage addresses in the Addresses page and set your default one.</p>
        </div>
        <div>
          <p className="font-medium">How can I request a refund?</p>
          <p className="text-sm text-muted-foreground">Submit a support ticket with your order number and reason for the request.</p>
        </div>
      </Card>
    </div>
  );
}
