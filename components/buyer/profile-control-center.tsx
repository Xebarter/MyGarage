'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Car,
  CheckCircle2,
  CreditCard,
  Crown,
  FileText,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Settings,
  Shield,
  Star,
  User,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { SubscriptionPlansGrid } from '@/components/buyer/subscription-plans-grid';
import { ProfileHero } from '@/components/buyer/profile-hero';
import { ProfileContactPanel } from '@/components/buyer/profile-contact-panel';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import type {
  BuyerControlCenterPayload,
  BuyerNotification,
  BuyerVehicleDocument,
  DocumentType,
  ServiceProviderRecommendation,
} from '@/lib/buyer-control-center';

type ControlCenterResponse = BuyerControlCenterPayload & {
  profile: {
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string;
      address: string;
      totalOrders: number;
      totalSpent: number;
      createdAt: string;
    };
    stats: Record<string, number>;
    defaultAddress?: { label: string; fullAddress: string } | null;
  };
  serviceRequests: Array<{
    id: string;
    category: string;
    service: string;
    location: string;
    status: string;
    vehicleId?: string | null;
    providerId?: string | null;
    createdAt: string;
    completedAt?: string | null;
  }>;
  ratings: Array<{ providerId: string; stars: number }>;
  subscription: {
    planTier: SubscriptionTier;
    status: string;
    currentPeriodEnd?: string | null;
    startedAt?: string | null;
  } | null;
  subscriptionHistory?: Array<{
    id: string;
    planTier: SubscriptionTier;
    status: string;
    startedAt?: string | null;
    createdAt: string;
    cancelledAt?: string | null;
  }>;
};

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Alerts', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'membership', label: 'Plans', icon: Crown },
  { id: 'documents', label: 'Docs', icon: FileText },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function formatCurrency(amount: number, currency = 'UGX') {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function healthBadge(status: string) {
  const map: Record<string, string> = {
    excellent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    good: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    attention: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    critical: 'bg-red-500/15 text-red-700 dark:text-red-300',
  };
  return map[status] ?? map.good;
}

export function ProfileControlCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const resolvedTab = tabParam === 'subscriptions' ? 'membership' : tabParam;
  const initialTab = (resolvedTab as SectionId) || 'account';
  const [activeTab, setActiveTab] = useState<SectionId>(initialTab);
  const [customerId, setCustomerId] = useState('');
  const [data, setData] = useState<ControlCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Array<{ id: string; make: string; model: string; nickname?: string | null }>>([]);
  const [docForm, setDocForm] = useState({ vehicleId: '', documentType: 'insurance' as DocumentType, name: '', fileUrl: '', expiresAt: '' });
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [expandedMessages, setExpandedMessages] = useState<string | null>(null);
  const [messagesByRequest, setMessagesByRequest] = useState<Record<string, Array<{ id: string; senderType: string; message: string; createdAt: string }>>>({});

  const load = useCallback(async () => {
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
    try {
      setLoading(true);
      let resolvedId = localId;
      if (!resolvedId && email) {
        const res = await fetch(`/api/buyer/profile?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const body = await res.json();
          resolvedId = body.customer?.id ?? '';
          if (resolvedId) localStorage.setItem('currentBuyerId', resolvedId);
        }
      }
      if (!resolvedId) {
        setData(null);
        return;
      }
      setCustomerId(resolvedId);

      const [centerRes, vehiclesRes] = await Promise.all([
        fetch(`/api/buyer/control-center?customerId=${encodeURIComponent(resolvedId)}`),
        fetch(`/api/buyer/vehicles?customerId=${encodeURIComponent(resolvedId)}`),
      ]);

      if (!centerRes.ok) {
        setData(null);
        return;
      }

      const payload = (await centerRes.json()) as ControlCenterResponse;
      setData(payload);
      setProfileForm({
        name: payload.profile.customer.name,
        email: payload.profile.customer.email,
        phone: payload.profile.customer.phone,
        address: payload.profile.customer.address,
      });

      if (vehiclesRes.ok) {
        setVehicles(await vehiclesRes.json());
      }
    } catch (error) {
      console.error('Failed to load control center:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/buyer/profile/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        await load();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const savePhone = async (phone: string) => {
    if (!customerId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/buyer/profile/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileForm, phone }),
      });
      if (res.ok) {
        setProfileForm((p) => ({ ...p, phone }));
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    localStorage.removeItem('currentBuyerId');
    localStorage.removeItem('currentBuyerEmail');
    localStorage.removeItem('currentBuyerName');
    await supabase.auth.signOut();
    router.push('/auth?role=buyer');
  };

  const savePreferredContact = async (preferredContactMethod: string) => {
    if (!customerId) return;
    await fetch('/api/buyer/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, preferredContactMethod }),
    });
    await load();
  };

  const changePassword = async () => {
    setPasswordMsg(null);
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg('New passwords do not match.');
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordMsg('Password must be at least 8 characters.');
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: passwordForm.next });
    setPasswordMsg(error ? error.message : 'Password updated successfully.');
    if (!error) setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const deactivateAccount = async () => {
    if (!customerId) return;
    const ok = window.confirm('Deactivate your account? You can contact support to reactivate.');
    if (!ok) return;
    await fetch('/api/buyer/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, accountStatus: 'deactivated' }),
    });
    await load();
  };

  const deleteAccount = async () => {
    if (!customerId) return;
    const ok = window.confirm('Permanently delete your account and related data? This cannot be undone.');
    if (!ok) return;
    const res = await fetch(`/api/buyer/profile/${customerId}`, { method: 'DELETE' });
    if (res.ok) {
      localStorage.removeItem('currentBuyerId');
      localStorage.removeItem('currentBuyerEmail');
      localStorage.removeItem('currentBuyerName');
      window.location.href = '/auth?role=buyer';
    }
  };

  const updateNotifPrefs = async (patch: Record<string, boolean>) => {
    if (!customerId || !data) return;
    setSaving(true);
    try {
      await fetch('/api/buyer/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, ...patch }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const markNotificationRead = async (notification: BuyerNotification) => {
    if (!customerId || notification.readAt) return;
    await fetch('/api/buyer/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, notificationId: notification.id }),
    });
    await load();
  };

  const markAllRead = async () => {
    if (!customerId) return;
    await fetch('/api/buyer/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, markAll: true }),
    });
    await load();
  };

  const updateAppPrefs = async (patch: Record<string, unknown>) => {
    if (!customerId) return;
    setSaving(true);
    try {
      await fetch('/api/buyer/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, ...patch }),
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const addDocument = async () => {
    if (!customerId || !docForm.vehicleId || !docForm.name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/buyer/vehicle-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          vehicleId: docForm.vehicleId,
          documentType: docForm.documentType,
          name: docForm.name,
          fileUrl: docForm.fileUrl || null,
          expiresAt: docForm.expiresAt || null,
        }),
      });
      setDocForm({ vehicleId: '', documentType: 'insurance', name: '', fileUrl: '', expiresAt: '' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeDocument = async (doc: BuyerVehicleDocument) => {
    if (!customerId) return;
    const ok = window.confirm(`Remove "${doc.name}"?`);
    if (!ok) return;
    await fetch(`/api/buyer/vehicle-documents/${doc.id}?customerId=${encodeURIComponent(customerId)}`, {
      method: 'DELETE',
    });
    await load();
  };

  const respondRecommendation = async (rec: ServiceProviderRecommendation, status: 'approved' | 'rejected') => {
    if (!customerId) return;
    await fetch(`/api/buyer/service-recommendations/${rec.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, status }),
    });
    await load();
  };

  const loadMessages = async (requestId: string) => {
    if (!customerId) return;
    const res = await fetch(
      `/api/buyer/service-requests/${requestId}/messages?customerId=${encodeURIComponent(customerId)}`,
    );
    if (res.ok) {
      const msgs = await res.json();
      setMessagesByRequest((prev) => ({ ...prev, [requestId]: msgs }));
      setExpandedMessages(requestId);
    }
  };

  const sendMessage = async (requestId: string) => {
    if (!customerId) return;
    const message = messageDrafts[requestId]?.trim();
    if (!message) return;
    await fetch(`/api/buyer/service-requests/${requestId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, message }),
    });
    setMessageDrafts((prev) => ({ ...prev, [requestId]: '' }));
    await loadMessages(requestId);
  };

  const submitRating = async (providerId: string, stars: number) => {
    if (!customerId) return;
    await fetch('/api/buyer/provider-ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, providerId, stars }),
    });
    await load();
  };

  const upcomingServices = useMemo(
    () => data?.serviceRequests.filter((r) => !['completed', 'cancelled'].includes(r.status)) ?? [],
    [data],
  );

  const pastServices = useMemo(
    () => data?.serviceRequests.filter((r) => ['completed', 'cancelled'].includes(r.status)) ?? [],
    [data],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Sign in to access your account control center.</p>
        <Button asChild className="mt-4">
          <Link href="/auth?role=buyer&next=/buyer/profile">Sign in</Link>
        </Button>
      </Card>
    );
  }

  const { profile, account, notificationPreferences, notifications, unreadNotificationCount, preferences, documents, documentAlerts, payments, pendingPaymentTotal, recommendations, analytics, subscription, subscriptionHistory } = data;

  return (
    <div className="space-y-4 pb-8">
      <ProfileHero
        name={profile.customer.name}
        email={profile.customer.email}
        createdAt={profile.customer.createdAt}
        totalOrders={profile.customer.totalOrders}
        totalSpent={formatCurrency(profile.customer.totalSpent)}
        wishlistItems={profile.stats.wishlistItems ?? 0}
        serviceRequests={profile.stats.serviceRequests ?? 0}
      />

      <div className="space-y-4 px-4 md:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={saving}>
            <RefreshCw className={cn('mr-2 h-4 w-4', saving && 'animate-spin')} />
            Refresh
          </Button>
          {unreadNotificationCount > 0 ? (
            <Badge variant="secondary">{unreadNotificationCount} unread</Badge>
          ) : null}
        </div>

        <ProfileContactPanel
          email={profile.customer.email}
          phone={profileForm.phone}
          saving={saving}
          onSavePhone={savePhone}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SectionId)} className="gap-4">
          <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0">
            {SECTIONS.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="shrink-0 gap-1.5 rounded-full border border-border px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <section.icon className="h-4 w-4" />
                {section.label}
                {section.id === 'notifications' && unreadNotificationCount > 0 ? (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Personal details</h2>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                {editing ? (
                  <Input
                    className="mt-2"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  />
                ) : (
                  <p className="mt-2">{profileForm.name || '—'}</p>
                )}
              </div>
              {profile.defaultAddress ? (
                <div>
                  <Label>Default address</Label>
                  <p className="mt-2 font-medium">{profile.defaultAddress.label}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.defaultAddress.fullAddress}</p>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <Label>Address</Label>
                {editing ? (
                  <Textarea className="mt-2" value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} />
                ) : (
                  <p className="mt-2 whitespace-pre-wrap">{profileForm.address || '—'}</p>
                )}
              </div>
            </div>
            {editing ? (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => void saveProfile()} disabled={saving}>Save</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Verification & contact</h2>
            <div className="flex flex-wrap gap-3">
              <Badge className={account.emailVerified ? 'bg-emerald-500/15 text-emerald-700' : ''}>
                {account.emailVerified ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                Email {account.emailVerified ? 'verified' : 'unverified'}
              </Badge>
              <Badge className={account.phoneVerified ? 'bg-emerald-500/15 text-emerald-700' : ''}>
                {account.phoneVerified ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                Phone {account.phoneVerified ? 'verified' : 'unverified'}
              </Badge>
              <Badge variant={account.accountStatus === 'active' ? 'secondary' : 'destructive'}>
                Account {account.accountStatus}
              </Badge>
            </div>
            <div className="mt-4 max-w-xs">
              <Label>Preferred contact method</Label>
              <Select value={account.preferredContactMethod} onValueChange={(v) => void savePreferredContact(v)}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5" /> Security
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Change your password or review your active session on this device.
            </p>
            <div className="grid max-w-md gap-3">
              <Input type="password" placeholder="New password" value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} />
              <Input type="password" placeholder="Confirm new password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} />
              <Button onClick={() => void changePassword()}>Update password</Button>
              {passwordMsg ? <p className="text-sm text-muted-foreground">{passwordMsg}</p> : null}
            </div>
            <div className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Active session: this browser (managed via Supabase Auth). Sign out from all devices using password reset if needed.
            </div>
          </Card>

          <Card className="border-destructive/30 p-6">
            <h2 className="mb-2 text-lg font-semibold text-destructive">Danger zone</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void deactivateAccount()}>Deactivate account</Button>
              <Button variant="destructive" onClick={() => void deleteAccount()}>Delete account permanently</Button>
            </div>
          </Card>

          <Card className="flex flex-col gap-3 border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">My Vehicles</p>
                <p className="text-sm text-muted-foreground">Manage vehicles and service history</p>
              </div>
            </div>
            <Button asChild variant="outline"><Link href="/buyer/garage">Open My Vehicles</Link></Button>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notification center</h2>
              <Button variant="outline" size="sm" onClick={() => void markAllRead()}>Mark all read</Button>
            </div>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void markNotificationRead(n)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40',
                      !n.readAt && 'border-primary/30 bg-primary/5',
                    )}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{n.title}</p>
                        <p className="text-sm text-muted-foreground">{n.body}</p>
                      </div>
                      {!n.readAt ? <Badge>New</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Notification preferences</h2>
            <div className="space-y-4">
              {([
                ['emailEnabled', 'Email notifications'],
                ['smsEnabled', 'SMS notifications'],
                ['inAppEnabled', 'In-app notifications'],
                ['serviceUpdates', 'Service updates'],
                ['maintenanceReminders', 'Maintenance reminders'],
                ['marketing', 'Marketing & promotions'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={notificationPreferences[key]}
                    onCheckedChange={(checked) => void updateNotifPrefs({ [key]: checked })}
                  />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card className="p-6">
            <h2 className="mb-2 text-lg font-semibold">Payment summary</h2>
            {pendingPaymentTotal > 0 ? (
              <p className="text-sm text-amber-600">Outstanding balance: {formatCurrency(pendingPaymentTotal)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No pending payments.</p>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Payment history</h2>
            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.source} · {p.status} · {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(p.amount, p.currency)}</p>
                      {p.paymentMethod ? <p className="text-xs text-muted-foreground">{p.paymentMethod}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="membership" className="space-y-4">
          <SubscriptionPlansGrid
            customerId={customerId}
            customerPhone={profile.customer.phone}
            activeSubscription={subscription}
            onChanged={load}
          />
          {subscriptionHistory && subscriptionHistory.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Subscription history</h2>
              <div className="space-y-2">
                {subscriptionHistory.map((sub) => {
                  const started = sub.startedAt ?? sub.createdAt;
                  const ended = sub.cancelledAt;
                  return (
                  <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium capitalize">{sub.planTier} plan</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.status} · {new Date(started).toLocaleDateString()}
                        {ended ? ` – ${new Date(ended).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {sub.status}
                    </Badge>
                  </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documentAlerts.length > 0 ? (
            <Card className="border-amber-500/40 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">{documentAlerts.length} document alert(s)</p>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {documentAlerts.map((a) => (
                  <li key={a.documentId}>
                    {a.name} — {a.status === 'expired' ? 'expired' : 'expiring'} {a.expiresAt.toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Add document</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Vehicle</Label>
                <Select value={docForm.vehicleId} onValueChange={(v) => setDocForm((p) => ({ ...p, vehicleId: v }))}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nickname || `${v.make} ${v.model}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={docForm.documentType} onValueChange={(v) => setDocForm((p) => ({ ...p, documentType: v as DocumentType }))}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['logbook', 'insurance', 'inspection', 'registration', 'warranty', 'other'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input className="mt-2" value={docForm.name} onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Expiry date</Label>
                <Input className="mt-2" type="date" value={docForm.expiresAt} onChange={(e) => setDocForm((p) => ({ ...p, expiresAt: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>File URL</Label>
                <Input className="mt-2" value={docForm.fileUrl} onChange={(e) => setDocForm((p) => ({ ...p, fileUrl: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <Button className="mt-4" onClick={() => void addDocument()} disabled={saving}>Add document</Button>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Your documents</h2>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{doc.documentType}</p>
                      {doc.expiresAt ? (
                        <p className="text-xs text-muted-foreground">Expires {new Date(doc.expiresAt).toLocaleDateString()}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {doc.fileUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer">View</a>
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => void removeDocument(doc)}>Remove</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Request a new service</p>
              <p className="text-sm text-muted-foreground">Book roadside help, repairs, or maintenance</p>
            </div>
            <Button asChild><Link href="/buyer/services">Request service</Link></Button>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Upcoming & active</h2>
            <ServiceList items={upcomingServices} onMessage={loadMessages} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Past services</h2>
            <ServiceList items={pastServices} onMessage={loadMessages} showRating onRate={submitRating} ratings={data.ratings} />
          </Card>

          {recommendations.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Provider recommendations</h2>
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="rounded-lg border p-4">
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <Badge className="mt-2 capitalize">{rec.status}</Badge>
                    {rec.status === 'pending' ? (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => void respondRecommendation(rec, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => void respondRecommendation(rec, 'rejected')}>Reject</Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {expandedMessages ? (
            <Card className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <MessageSquare className="h-5 w-5" /> Messages
              </h2>
              <div className="mb-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
                {(messagesByRequest[expandedMessages] ?? []).map((m) => (
                  <div key={m.id} className={cn('rounded-md p-2 text-sm', m.senderType === 'buyer' ? 'bg-primary/10' : 'bg-muted')}>
                    <p className="text-xs capitalize text-muted-foreground">{m.senderType}</p>
                    <p>{m.message}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={messageDrafts[expandedMessages] ?? ''}
                  onChange={(e) => setMessageDrafts((p) => ({ ...p, [expandedMessages]: e.target.value }))}
                  placeholder="Type a message to your provider..."
                />
                <Button onClick={() => void sendMessage(expandedMessages)}>Send</Button>
              </div>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total maintenance" value={formatCurrency(analytics.totalMaintenanceCost)} />
            <StatCard label="Total services" value={String(analytics.totalServices)} />
            <StatCard label="Vehicles tracked" value={String(analytics.vehicles.length)} />
          </div>

          {analytics.monthlySpend.length > 0 ? (
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Monthly service spend</h2>
              <ChartContainer config={{ amount: { label: 'Spend', color: 'hsl(var(--primary))' } }} className="h-64 w-full">
                <BarChart data={analytics.monthlySpend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                </BarChart>
              </ChartContainer>
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Vehicle health</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {analytics.vehicles.map((v) => (
                <div key={v.vehicleId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{v.vehicleLabel}</p>
                    <Badge className={healthBadge(v.healthStatus)}>{v.healthStatus}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{v.serviceCount} services · {formatCurrency(v.totalMaintenanceCost)} spent</p>
                  {v.commonIssues.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Common: {v.commonIssues.join(', ')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Service preferences</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Service mode</Label>
                <Select value={preferences.serviceMode} onValueChange={(v) => void updateAppPrefs({ serviceMode: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile service</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Distance unit</Label>
                <Select value={preferences.distanceUnit} onValueChange={(v) => void updateAppPrefs({ distanceUnit: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km">Kilometers</SelectItem>
                    <SelectItem value="miles">Miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={preferences.currency} onValueChange={(v) => void updateAppPrefs({ currency: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGX">UGX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={preferences.language} onValueChange={(v) => void updateAppPrefs({ language: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Region</Label>
                <Input className="mt-2" value={preferences.region} onChange={(e) => void updateAppPrefs({ region: e.target.value })} />
              </div>
              <div>
                <Label>Theme</Label>
                <Select value={preferences.theme} onValueChange={(v) => void updateAppPrefs({ theme: v })}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </Card>
  );
}

function ServiceList({
  items,
  onMessage,
  showRating,
  onRate,
  ratings,
}: {
  items: ControlCenterResponse['serviceRequests'];
  onMessage: (id: string) => void;
  showRating?: boolean;
  onRate?: (providerId: string, stars: number) => void;
  ratings?: Array<{ providerId: string; stars: number }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No service requests in this list.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const existing = ratings?.find((r) => r.providerId === item.providerId);
        return (
          <div key={item.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.service}</p>
                <p className="text-sm text-muted-foreground">{item.location}</p>
                <Badge className="mt-1 capitalize">{item.status.replace('_', ' ')}</Badge>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/buyer/services/track/${item.id}`}>Track</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void onMessage(item.id)}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {showRating && item.providerId && item.status === 'completed' ? (
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onRate?.(item.providerId!, star)}
                    className="text-amber-500">
                    <Star className={cn('h-4 w-4', (existing?.stars ?? 0) >= star && 'fill-current')} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
