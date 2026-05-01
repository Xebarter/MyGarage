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
    <div className="space-y-5 px-4 pt-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6 md:p-8 md:pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Saved Addresses</h1>
            <Badge variant="outline" className="shrink-0 font-normal">
              {addresses.length} {addresses.length === 1 ? 'address' : 'addresses'}
            </Badge>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Manage your shipping destinations for faster checkout.
          </p>
        </div>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <h3 className="text-base font-semibold sm:text-sm">Add New Address</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (Home, Office...)"
            className="h-11 md:h-9"
            autoComplete="off"
          />
          <Input
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            placeholder="Full address"
            className="md:col-span-2 h-11 md:h-9"
            autoComplete="section-shipping street-address"
          />
        </div>
        <Button onClick={addAddress} className="h-11 w-full gap-2 touch-manipulation sm:h-9 sm:w-auto">
          <Plus className="h-4 w-4" />
          Save Address
        </Button>
      </Card>

      {addresses.length === 0 ? (
        <Card className="p-6 text-center sm:p-8">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 font-medium">No saved addresses yet</p>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {addresses.map((address) => (
            <Card key={address.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <p className="font-semibold">{address.label}</p>
                    {address.isDefault ? <Badge className="shrink-0">Default</Badge> : null}
                  </div>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground wrap-break-word">
                    {address.fullAddress}
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 touch-manipulation sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-full gap-2 sm:h-8 sm:w-auto"
                      onClick={() => markDefault(address.id)}
                    >
                      <Star className="h-4 w-4 shrink-0" />
                      Set default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-2 text-destructive hover:bg-destructive/10 sm:h-8 sm:w-auto"
                    onClick={() => removeAddress(address.id)}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
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
