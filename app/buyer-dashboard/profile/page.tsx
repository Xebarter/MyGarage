'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BuyerProfile {
  name: string;
  email: string;
  phone: string;
}

export default function BuyerProfilePage() {
  const [customerId, setCustomerId] = useState('');
  const [profile, setProfile] = useState<BuyerProfile>({
    name: '',
    email: '',
    phone: '',
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();
    try {
      let resolvedCustomerId = localId;
      let customer: any = null;

      if (resolvedCustomerId) {
        const byId = await fetch(`/api/customers/${resolvedCustomerId}`);
        if (byId.ok) {
          customer = await byId.json();
        }
      }

      if (!customer && email) {
        const byEmail = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
        if (byEmail.ok) {
          customer = await byEmail.json();
          resolvedCustomerId = customer.id;
          localStorage.setItem('currentBuyerId', resolvedCustomerId);
        }
      }

      if (!customer) {
        setProfile({
          name: localStorage.getItem('currentBuyerName') || '',
          email: localStorage.getItem('currentBuyerEmail') || '',
          phone: '',
        });
        return;
      }

      setCustomerId(resolvedCustomerId);
      setProfile({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      });
    } catch (error) {
      console.error('Failed to load buyer profile:', error);
    }
  };

  const save = async () => {
    if (!customerId) return;
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) return;
      const updated = await response.json();
      setProfile({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
      });
      localStorage.setItem('currentBuyerName', updated.name || '');
      localStorage.setItem('currentBuyerEmail', updated.email || '');
      setEditing(false);
    } catch (error) {
      console.error('Failed to save buyer profile:', error);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Buyer Profile</h1>
          <p className="text-muted-foreground">Keep your details up to date for smooth checkout.</p>
        </div>
        {!editing && <Button onClick={() => setEditing(true)}>Edit</Button>}
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
        </div>

        {editing ? (
          <div className="flex gap-3 border-t border-border pt-4">
            <Button onClick={save}>Save Changes</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
