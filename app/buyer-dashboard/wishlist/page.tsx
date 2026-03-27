'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Search, Trash2 } from 'lucide-react';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export default function BuyerWishlistPage() {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [query, setQuery] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftCategory, setDraftCategory] = useState('');

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
        setItems([]);
        return;
      }

      setCustomerId(resolvedCustomerId);
      const response = await fetch(`/api/buyer/wishlist?customerId=${resolvedCustomerId}`);
      if (!response.ok) {
        setItems([]);
        return;
      }
      const data = await response.json();
      const mapped: WishlistItem[] = (Array.isArray(data) ? data : []).map((item: any) => ({
        id: item.id,
        name: item.productName,
        price: Number(item.priceSnapshot) || 0,
        category: item.categorySnapshot || 'General',
      }));
      setItems(mapped);
    } catch (error) {
      console.error('Failed to bootstrap wishlist:', error);
      setItems([]);
    }
  };

  const addItem = () => {
    void addItemAsync();
  };

  const addItemAsync = async () => {
    const name = draftName.trim();
    const price = Number(draftPrice);
    if (!name || Number.isNaN(price) || price <= 0 || !customerId) return;

    try {
      const response = await fetch('/api/buyer/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          productName: name,
          priceSnapshot: price,
          categorySnapshot: draftCategory.trim() || 'General',
        }),
      });
      if (!response.ok) return;
      setDraftName('');
      setDraftPrice('');
      setDraftCategory('');
      await bootstrap();
    } catch (error) {
      console.error('Failed to add wishlist item:', error);
    }
  };

  const removeItem = (id: string) => {
    void removeItemAsync(id);
  };

  const removeItemAsync = async (id: string) => {
    try {
      await fetch(`/api/buyer/wishlist/${id}`, { method: 'DELETE' });
      await bootstrap();
    } catch (error) {
      console.error('Failed to remove wishlist item:', error);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground">Save products you want to buy later.</p>
        </div>
        <Badge variant="outline" className="w-fit">{items.length} saved item(s)</Badge>
      </div>

      <Card className="space-y-4 p-5">
        <h3 className="font-semibold">Add to Wishlist</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input placeholder="Product name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          <Input placeholder="Price" type="number" min="0" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value)} />
          <Input placeholder="Category (optional)" value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)} />
          <Button onClick={addItem} className="gap-2"><Heart className="h-4 w-4" /> Save Item</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: You can also continue shopping and keep your wishlist in this dashboard.
        </p>
      </Card>

      <Card className="p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search wishlist by name or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Start adding products you want to revisit.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Browse products</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.category || 'General'}</p>
                  <p className="mt-2 text-lg font-bold">UGX {item.price.toFixed(0)}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
