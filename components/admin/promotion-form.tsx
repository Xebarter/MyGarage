'use client';

import { useState } from 'react';
import { Promotion } from '@/lib/db';
import { X } from 'lucide-react';

interface PromotionFormProps {
  promotion?: Promotion | null;
  onClose: () => void;
}

export function PromotionForm({ promotion, onClose }: PromotionFormProps) {
  const [formData, setFormData] = useState({
    code: promotion?.code || '',
    description: promotion?.description || '',
    discountType: (promotion?.discountType as 'percentage' | 'fixed') || 'percentage',
    discountValue: promotion?.discountValue || 0,
    maxUses: promotion?.maxUses || 100,
    validFrom: promotion?.validFrom ? new Date(promotion.validFrom).toISOString().split('T')[0] : '',
    validUntil: promotion?.validUntil ? new Date(promotion.validUntil).toISOString().split('T')[0] : '',
    active: promotion?.active ?? true,
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = promotion ? `/api/promotions/${promotion.id}` : '/api/promotions';
      const method = promotion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discountValue: parseFloat(formData.discountValue as any),
          currentUses: promotion?.currentUses ?? 0,
          validFrom: new Date(formData.validFrom),
          validUntil: new Date(formData.validUntil),
        }),
      });

      if (response.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save promotion:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {promotion ? 'Edit Promotion' : 'Add New Promotion'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Promotion Code</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Discount Type</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Discount Value</label>
              <input
                type="number"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                required
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Max Uses</label>
            <input
              type="number"
              required
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valid From</label>
              <input
                type="date"
                required
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valid Until</label>
              <input
                type="date"
                required
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/70"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-primary/70"
            />
            <label htmlFor="active" className="text-sm font-medium text-foreground">Active</label>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
