'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Vendor } from '@/lib/db';
import { AlertTriangle, Save, Trash2 } from 'lucide-react';

type VendorForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: string;
};

export default function VendorSettingsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchVendor() {
      try {
        const response = await fetch(`/api/vendors/${id}`);
        if (!response.ok) return;

        const data: Vendor = await response.json();
        setVendor(data);
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          rating: String(data.rating),
        });
      } catch (error) {
        console.error('Failed to fetch vendor settings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVendor();
  }, [id]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rating: Number(form.rating),
        }),
      });
      if (!response.ok) throw new Error('Failed to save vendor settings');

      const updatedVendor = await response.json();
      setVendor(updatedVendor);
      alert('Vendor settings updated.');
    } catch (error) {
      console.error('Failed to save vendor settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentVendor() {
    if (deleting) return;
    const confirmed = confirm('Delete this vendor? This will also remove products and vendor-linked order items.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vendor');

      router.push('/admin/vendors');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      alert('Failed to delete vendor. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-2">Loading settings...</div>;
  if (!form || !vendor) return <div className="p-2">Vendor not found.</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Vendor Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update profile details for <span className="font-medium text-foreground">{vendor.name}</span>.
        </p>

        <form onSubmit={saveSettings} className="mt-5 grid gap-3 lg:grid-cols-2">
          <input
            required
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Vendor name"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => current ? { ...current, email: event.target.value } : current)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Email"
          />
          <input
            required
            type="text"
            value={form.phone}
            onChange={(event) => setForm((current) => current ? { ...current, phone: event.target.value } : current)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Phone"
          />
          <input
            required
            min="0"
            max="5"
            step="0.1"
            type="number"
            value={form.rating}
            onChange={(event) => setForm((current) => current ? { ...current, rating: event.target.value } : current)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Rating"
          />
          <input
            required
            type="text"
            value={form.address}
            onChange={(event) => setForm((current) => current ? { ...current, address: event.target.value } : current)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 lg:col-span-2"
            placeholder="Address"
          />

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 lg:w-fit"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Danger Zone
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a vendor removes that vendor and related catalog/order associations from this mock database.
        </p>
        <button
          onClick={deleteCurrentVendor}
          disabled={deleting}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? 'Deleting...' : 'Delete Vendor'}
        </button>
      </section>
    </div>
  );
}
