'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type BuyerProfileForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type BuyerProfilePayload = {
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
  stats?: {
    wishlistItems: number;
    addresses: number;
    supportTickets: number;
    serviceRequests: number;
  };
  defaultAddress?: { label: string; fullAddress: string } | null;
};

export default function BuyerProfilePage() {
  const [customerId, setCustomerId] = useState('');
  const [profile, setProfile] = useState<BuyerProfileForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [stats, setStats] = useState<BuyerProfilePayload['stats'] | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<BuyerProfilePayload['defaultAddress'] | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
    try {
      setLoading(true);
      let resolvedCustomerId = localId;
      let payload: BuyerProfilePayload | null = null;

      if (resolvedCustomerId) {
        const byId = await fetch(`/api/buyer/profile/${resolvedCustomerId}`);
        if (byId.ok) {
          payload = await byId.json();
        }
      }

      if (!payload && email) {
        const byEmail = await fetch(`/api/buyer/profile?email=${encodeURIComponent(email)}`);
        if (byEmail.ok) {
          const body = (await byEmail.json()) as BuyerProfilePayload;
          payload = body;
          resolvedCustomerId = body.customer.id;
          localStorage.setItem('currentBuyerId', resolvedCustomerId);
        }
      }

      if (!payload) {
        setProfile({
          name: localStorage.getItem('currentBuyerName') || '',
          email: localStorage.getItem('currentBuyerEmail') || '',
          phone: '',
          address: '',
        });
        setStats(null);
        setDefaultAddress(null);
        return;
      }

      setCustomerId(resolvedCustomerId);
      setProfile({
        name: payload.customer.name || '',
        email: payload.customer.email || '',
        phone: payload.customer.phone || '',
        address: payload.customer.address || '',
      });
      setStats(payload.stats ?? null);
      setDefaultAddress(payload.defaultAddress ?? null);
    } catch (error) {
      console.error('Failed to load buyer profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const hasId = Boolean(customerId);
      const url = hasId ? `/api/buyer/profile/${customerId}` : '/api/buyer/profile';
      const method = hasId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) return;
      const updated: BuyerProfilePayload = await response.json();
      const nextId = updated?.customer?.id || customerId;
      if (nextId) {
        setCustomerId(nextId);
        localStorage.setItem('currentBuyerId', nextId);
      }
      setProfile({
        name: updated.customer?.name || '',
        email: updated.customer?.email || '',
        phone: updated.customer?.phone || '',
        address: updated.customer?.address || '',
      });
      setStats(updated.stats ?? null);
      setDefaultAddress(updated.defaultAddress ?? null);
      localStorage.setItem('currentBuyerName', updated.customer?.name || '');
      localStorage.setItem('currentBuyerEmail', updated.customer?.email || '');
      setEditing(false);
    } catch (error) {
      console.error('Failed to save buyer profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!customerId) return;
    const confirmed = window.confirm(
      'Delete your buyer profile? This will remove your saved addresses, wishlist items and support tickets.',
    );
    if (!confirmed) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/buyer/profile/${customerId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setCustomerId('');
      setProfile({ name: '', email: '', phone: '', address: '' });
      setStats(null);
      setDefaultAddress(null);
      setEditing(false);
      localStorage.removeItem('currentBuyerId');
    } catch (error) {
      console.error('Failed to delete buyer profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Buyer Profile</h1>
          <p className="text-muted-foreground">Keep your details up to date for smooth checkout.</p>
        </div>
        <div className="flex gap-3">
          {!editing && (
            <Button onClick={() => setEditing(true)} disabled={loading || saving}>
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={bootstrap} disabled={loading || saving}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            {editing ? (
              <Input className="mt-2" value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} />
            ) : (
              <p className="mt-2 text-lg">{profile.name || '-'}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            {editing ? (
              <Input className="mt-2" type="email" value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
            ) : (
              <p className="mt-2 text-lg">{profile.email || '-'}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            {editing ? (
              <Input className="mt-2" value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
            ) : (
              <p className="mt-2 text-lg">{profile.phone || '-'}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Primary Address</label>
            {editing ? (
              <Textarea
                className="mt-2"
                value={profile.address}
                onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street, city, and any delivery notes"
              />
            ) : (
              <p className="mt-2 text-lg whitespace-pre-wrap">{profile.address || '-'}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Wishlist</p>
            <p className="text-lg font-semibold">{stats?.wishlistItems ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saved Addresses</p>
            <p className="text-lg font-semibold">{stats?.addresses ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Support Tickets</p>
            <p className="text-lg font-semibold">{stats?.supportTickets ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Service Requests</p>
            <p className="text-lg font-semibold">{stats?.serviceRequests ?? 0}</p>
          </div>
        </div>

        {defaultAddress ? (
          <div className="rounded-md border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">Default delivery address</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {defaultAddress.label}: {defaultAddress.fullAddress}
            </p>
          </div>
        ) : null}

        {editing ? (
          <div className="flex gap-3 border-t border-border pt-4">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <div className="flex-1" />
            <Button variant="destructive" onClick={deleteAccount} disabled={saving || !customerId}>
              Delete account
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
