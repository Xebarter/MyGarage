'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';

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
          const customer = await customerRes.json();
          resolvedCustomerId = customer.id;
          localStorage.setItem('currentBuyerId', resolvedCustomerId);
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
      const mapped: BuyerAddress[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        label: item.label,
        fullAddress: item.fullAddress,
        isDefault: Boolean(item.isDefault),
      }));
      setAddresses(mapped);
    } catch (error) {
      console.error('Failed to bootstrap addresses:', error);
      setAddresses([]);
    }
  };

  const addAddress = () => {
    void addAddressAsync();
  };

  const addAddressAsync = async () => {
    if (!label.trim() || !fullAddress.trim() || !customerId) return;
    try {
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
      await bootstrap();
    } catch (error) {
      console.error('Failed to add address:', error);
    }
  };

  const removeAddress = (id: string) => {
    void removeAddressAsync(id);
  };

  const removeAddressAsync = async (id: string) => {
    try {
      await fetch(`/api/buyer/addresses/${id}`, { method: 'DELETE' });
      await bootstrap();
    } catch (error) {
      console.error('Failed to remove address:', error);
    }
  };

  const markDefault = (id: string) => {
    void markDefaultAsync(id);
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
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Saved Addresses</h1>
          <p className="text-muted-foreground">Manage your shipping destinations for faster checkout.</p>
        </div>
        <Badge variant="outline">{addresses.length} address(es)</Badge>
      </div>

      <Card className="space-y-4 p-5">
        <h3 className="font-semibold">Add New Address</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (Home, Office...)" />
          <Input value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Full address" className="md:col-span-2" />
        </div>
        <Button onClick={addAddress} className="gap-2">
          <Plus className="h-4 w-4" />
          Save Address
        </Button>
      </Card>

      {addresses.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 font-medium">No saved addresses yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id} className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{address.label}</p>
                    {address.isDefault ? <Badge>Default</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{address.fullAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!address.isDefault && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => markDefault(address.id)}>
                      <Star className="h-4 w-4" />
                      Set Default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10" onClick={() => removeAddress(address.id)}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
