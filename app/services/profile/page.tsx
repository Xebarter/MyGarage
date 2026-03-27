'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProviderProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  totalProducts: number;
  createdAt: string;
}

export default function ServiceProviderProfilePage() {
  const [providerId, setProviderId] = useState<string>('');
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProviderProfile>>({});

  useEffect(() => {
    const currentProviderId = localStorage.getItem('currentVendorId');
    if (currentProviderId) {
      setProviderId(currentProviderId);
      fetchProfile(currentProviderId);
    }
  }, []);

  const fetchProfile = async (id: string) => {
    try {
      const response = await fetch(`/api/vendors/${id}`);
      const data = await response.json();
      setProfile(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to fetch service provider profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/vendors/${providerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setProfile(data);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update service provider profile:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading profile...</div>;
  if (!profile) return <div className="flex items-center justify-center p-8">Failed to load profile</div>;

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Provider Profile</h1>
          <p className="text-muted-foreground">Manage your service provider information</p>
        </div>
        {!editing && <Button onClick={() => setEditing(true)}>Edit Profile</Button>}
      </div>

      <Card className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Provider Name</label>
            {editing ? <Input name="name" value={formData.name || ''} onChange={handleInputChange} className="mt-2" /> : <p className="mt-2 text-lg">{profile.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            {editing ? <Input name="email" value={formData.email || ''} onChange={handleInputChange} className="mt-2" /> : <p className="mt-2 text-lg">{profile.email}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            {editing ? <Input name="phone" value={formData.phone || ''} onChange={handleInputChange} className="mt-2" /> : <p className="mt-2 text-lg">{profile.phone}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            {editing ? <Input name="address" value={formData.address || ''} onChange={handleInputChange} className="mt-2" /> : <p className="mt-2 text-lg">{profile.address}</p>}
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="mb-4 font-semibold">Provider Statistics</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <p className="text-2xl font-bold">{profile.rating.toFixed(1)} ⭐</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Services</p>
              <p className="text-2xl font-bold">{profile.totalProducts}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex gap-3 border-t border-border pt-6">
            <Button onClick={handleSave}>Save Changes</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
