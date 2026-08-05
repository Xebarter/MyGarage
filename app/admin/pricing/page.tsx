'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Loader2, RotateCcw, Save, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatUgxAmount } from '@/lib/format-service-price';
import { userServiceCategories } from '@/lib/services-catalog';
import { cn } from '@/lib/utils';

type PriceRow = {
  categoryId: string;
  categoryTitle: string;
  serviceName: string;
  priceUgx: number;
  currency: string;
  isCustom: boolean;
  updatedAt: string | null;
};

export default function AdminServicePricingPage() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const rowKey = (categoryId: string, serviceName: string) => `${categoryId}\0${serviceName}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/service-pricing', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load service pricing');
      }
      const prices = Array.isArray(data.prices) ? (data.prices as PriceRow[]) : [];
      setRows(prices);
      const next: Record<string, string> = {};
      for (const p of prices) {
        next[rowKey(p.categoryId, p.serviceName)] = String(Math.round(Number(p.priceUgx) || 0));
      }
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load service pricing');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryFilter !== 'all' && r.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.serviceName.toLowerCase().includes(q) ||
        r.categoryTitle.toLowerCase().includes(q)
      );
    });
  }, [rows, query, categoryFilter]);

  const dirtyKeys = useMemo(() => {
    const dirty = new Set<string>();
    for (const r of rows) {
      const key = rowKey(r.categoryId, r.serviceName);
      const draft = Number(drafts[key]);
      const current = Math.round(Number(r.priceUgx) || 0);
      if (Number.isFinite(draft) && draft !== current) dirty.add(key);
    }
    return dirty;
  }, [rows, drafts]);

  const setDraft = (categoryId: string, serviceName: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [rowKey(categoryId, serviceName)]: value }));
  };

  const save = async () => {
    const payload = rows
      .filter((r) => dirtyKeys.has(rowKey(r.categoryId, r.serviceName)))
      .map((r) => {
        const key = rowKey(r.categoryId, r.serviceName);
        return {
          categoryId: r.categoryId,
          serviceName: r.serviceName,
          priceUgx: Number(drafts[key]),
        };
      })
      .filter((p) => Number.isFinite(p.priceUgx) && p.priceUgx >= 0);

    if (payload.length === 0) {
      toast.message('No price changes to save');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/service-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save prices');
      }
      const prices = Array.isArray(data.prices) ? (data.prices as PriceRow[]) : [];
      setRows(prices);
      const next: Record<string, string> = {};
      for (const p of prices) {
        next[rowKey(p.categoryId, p.serviceName)] = String(Math.round(Number(p.priceUgx) || 0));
      }
      setDrafts(next);
      toast.success(`Updated ${payload.length} service price${payload.length === 1 ? '' : 's'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save prices');
    } finally {
      setSaving(false);
    }
  };

  const resetRow = (r: PriceRow) => {
    setDrafts((prev) => ({
      ...prev,
      [rowKey(r.categoryId, r.serviceName)]: String(Math.round(Number(r.priceUgx) || 0)),
    }));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Banknote className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Jobs</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Service pricing</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Platform job prices are controlled here only. Provider apps show these amounts as read-only —
            service providers cannot set or change prices.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving || dirtyKeys.size === 0}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes{dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ''}
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="pricing-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="pricing-search"
              className="pl-9"
              placeholder="Service or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full space-y-1.5 sm:w-64">
          <Label htmlFor="pricing-category">Category</Label>
          <select
            id="pricing-category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {userServiceCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.title}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading platform prices…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_88px] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Service</span>
            <span>Category</span>
            <span>Price (UGX)</span>
            <span className="text-right">Status</span>
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No services match.</p>
            ) : (
              filtered.map((r) => {
                const key = rowKey(r.categoryId, r.serviceName);
                const dirty = dirtyKeys.has(key);
                return (
                  <div
                    key={key}
                    className={cn(
                      'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px_88px] items-center gap-3 border-b border-border/70 px-4 py-3 last:border-0',
                      dirty && 'bg-primary/5',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{r.serviceName}</p>
                      {dirty ? (
                        <p className="text-xs text-primary">Unsaved · currently {formatUgxAmount(r.priceUgx)}</p>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{r.categoryTitle}</p>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      className="h-9"
                      value={drafts[key] ?? ''}
                      onChange={(e) => setDraft(r.categoryId, r.serviceName, e.target.value)}
                    />
                    <div className="flex items-center justify-end gap-1">
                      {dirty ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Discard change"
                          onClick={() => resetRow(r)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {r.isCustom ? 'Saved' : 'Default'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
