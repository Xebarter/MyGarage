'use client';

import { useEffect, useState } from 'react';
import { Home, MapPin, Plus, Star, Trash2 } from 'lucide-react';

import {
  BUYER_SURFACE,
  BuyerEmptyState,
  BuyerPageHeader,
  BuyerPageShell,
} from '@/components/buyer/buyer-page-chrome';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/location/address-autocomplete';
import { cn } from '@/lib/utils';

interface BuyerAddress {
  id: string;
  label: string;
  fullAddress: string;
  isDefault: boolean;
}

export default function BuyerAddressesPage() {
  const [customerId, setCustomerId] = useState('');
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [label, setLabel] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    const localId = localStorage.getItem('currentBuyerId') || '';
    const email = (localStorage.getItem('currentBuyerEmail') || '').trim();

    try {
      let resolvedCustomerId = localId;
      if (!resolvedCustomerId && email) {
        const customerRes = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
        if (customerRes.ok) {
          const customer = (await customerRes.json()) as { id?: string } | null;
          if (customer?.id) {
            resolvedCustomerId = customer.id;
            localStorage.setItem('currentBuyerId', resolvedCustomerId);
          }
        }
      }

      if (!resolvedCustomerId) {
        setAddresses([]);
        return;
      }

      setCustomerId(resolvedCustomerId);
      const response = await fetch(`/api/buyer/addresses?customerId=${resolvedCustomerId}`);
      if (!response.ok) {
        setAddresses([]);
        return;
      }

      const data = await response.json();
      const mapped: BuyerAddress[] = (Array.isArray(data) ? data : []).map((item: { id: string; label: string; fullAddress: string; isDefault?: boolean }) => ({
        id: item.id,
        label: item.label,
        fullAddress: item.fullAddress,
        isDefault: Boolean(item.isDefault),
      }));
      setAddresses(mapped);
      if (mapped.length === 0) setShowForm(true);
    } catch (error) {
      console.error('Failed to bootstrap addresses:', error);
      setAddresses([]);
    }
  };

  const addAddressAsync = async () => {
    if (!label.trim() || !fullAddress.trim() || !customerId || saving) return;
    try {
      setSaving(true);
      const response = await fetch('/api/buyer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          label: label.trim(),
          fullAddress: fullAddress.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      if (!response.ok) return;
      setLabel('');
      setFullAddress('');
      setShowForm(false);
      await bootstrap();
    } catch (error) {
      console.error('Failed to add address:', error);
    } finally {
      setSaving(false);
    }
  };

  const removeAddressAsync = async (id: string) => {
    try {
      await fetch(`/api/buyer/addresses/${id}`, { method: 'DELETE' });
      await bootstrap();
    } catch (error) {
      console.error('Failed to remove address:', error);
    }
  };

  const markDefaultAsync = async (id: string) => {
    if (!customerId) return;
    try {
      await fetch(`/api/buyer/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true, customerId }),
      });
      await bootstrap();
    } catch (error) {
      console.error('Failed to mark default address:', error);
    }
  };

  return (
    <BuyerPageShell>
      <BuyerPageHeader
        eyebrow="Checkout"
        title="Addresses"
        description="Save delivery destinations so checkout is faster next time."
        actions={
          <>
            <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
              {addresses.length} saved
            </Badge>
            <Button
              type="button"
              className="h-10 gap-2 rounded-full"
              onClick={() => setShowForm((open) => !open)}
              disabled={!customerId}
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Close' : 'Add address'}
            </Button>
          </>
        }
      />

      {showForm ? (
        <Card className={cn(BUYER_SURFACE, 'p-5 sm:p-6')}>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight">New destination</h2>
              <p className="text-xs text-muted-foreground">Label it so you can pick it quickly at checkout.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="address-label">Label</Label>
              <Input
                id="address-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home, Office…"
                className="h-11 rounded-xl"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address-full">Full address</Label>
              <AddressAutocomplete
                id="address-full"
                value={fullAddress}
                onChange={setFullAddress}
                onPlaceSelect={(place) => setFullAddress(place.label)}
                placeholder="Search e.g. Ntinda, Kololo, Acacia Mall…"
              />
            </div>
          </div>
          <Button
            onClick={() => void addAddressAsync()}
            disabled={saving || !customerId}
            className="mt-4 h-11 w-full gap-2 rounded-xl sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save address'}
          </Button>
        </Card>
      ) : null}

      {addresses.length === 0 ? (
        <Card className={BUYER_SURFACE}>
          <BuyerEmptyState
            icon={MapPin}
            title="No saved addresses yet"
            description="Add a home or office address to speed up delivery at checkout."
          >
            <Button type="button" onClick={() => setShowForm(true)} disabled={!customerId}>
              Add your first address
            </Button>
          </BuyerEmptyState>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={cn(
                BUYER_SURFACE,
                'p-5',
                address.isDefault && 'border-primary/30 ring-primary/15',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    address.isDefault ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                  )}
                >
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold tracking-tight">{address.label}</p>
                    {address.isDefault ? (
                      <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">Default</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{address.fullAddress}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!address.isDefault ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-full"
                    onClick={() => void markDefaultAsync(address.id)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Set default
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void removeAddressAsync(address.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </BuyerPageShell>
  );
}
