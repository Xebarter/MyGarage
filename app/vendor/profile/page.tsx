'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  totalProducts: number;
  createdAt: string;
}

export default function VendorProfilePage() {
  const [vendorId, setVendorId] = useState<string>('');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Vendor>>({});

  useEffect(() => {
    const currentVendorId = localStorage.getItem('currentVendorId');
    if (currentVendorId) {
      setVendorId(currentVendorId);
      fetchVendor(currentVendorId);
    }
  }, []);

  const fetchVendor = async (vendorId: string) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`);
      const data = await response.json();
      setVendor(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setVendor(data);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update vendor:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading profile...</div>;
  }

  if (!vendor) {
    return <div className="flex items-center justify-center p-8">Failed to load profile</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Profile</h1>
          <p className="text-muted-foreground">Manage your vendor information</p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>Edit Profile</Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Vendor Name</label>
            {editing ? (
              <Input
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-lg">{vendor.name}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            {editing ? (
              <Input
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-lg">{vendor.email}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            {editing ? (
              <Input
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-lg">{vendor.phone}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            {editing ? (
              <Input
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                className="mt-2"
              />
            ) : (
              <p className="mt-2 text-lg">{vendor.address}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-border pt-6">
          <h3 className="mb-4 font-semibold">Vendor Statistics</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="text-2xl font-bold">{vendor.rating.toFixed(1)} ⭐</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">{vendor.totalProducts}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium">{new Date(vendor.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {editing && (
          <div className="border-t border-border pt-6 flex gap-3">
            <Button onClick={handleSave}>Save Changes</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
