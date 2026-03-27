'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Promotion, PromoCarouselItem, Product } from '@/lib/db';
import { Trash2, Edit, Plus, Tag, Megaphone } from 'lucide-react';
import { PromotionForm } from '@/components/admin/promotion-form';
import { uploadPromotionBanner } from '@/lib/upload-promotion-banner';

interface AdApplication {
  id: string;
  vendorId: string;
  scope: 'single' | 'all';
  productId?: string;
  productName?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [adApplications, setAdApplications] = useState<AdApplication[]>([]);
  const [promoItems, setPromoItems] = useState<PromoCarouselItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromoItemId, setEditingPromoItemId] = useState<string | null>(null);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoFromApplication, setPromoFromApplication] = useState<AdApplication | null>(null);
  const [dragPromoId, setDragPromoId] = useState<string | null>(null);
  const [promoDraft, setPromoDraft] = useState<{
    productId: string;
    bannerUrl: string;
    active: boolean;
    sortOrder: number;
    source: "admin" | "vendor_application";
  }>({ productId: "", bannerUrl: "", active: true, sortOrder: 0, source: "admin" });

  const promoItemsSorted = useMemo(() => {
    return [...promoItems].sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.updatedAt.getTime() - b.updatedAt.getTime(),
    );
  }, [promoItems]);

  useEffect(() => {
    fetchPromotions();
  }, []);

  async function fetchPromotions() {
    try {
      setError(null);
      const [promotionsRes, adApplicationsRes, promoRes, productsRes] = await Promise.all([
        fetch('/api/promotions'),
        fetch('/api/ad-applications'),
        fetch('/api/promoted-products'),
        fetch('/api/products'),
      ]);
      if (!promotionsRes.ok || !adApplicationsRes.ok || !promoRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch promotions data');
      }
      const promotionsData = await promotionsRes.json();
      const adApplicationsData = await adApplicationsRes.json();
      const promoData = await promoRes.json();
      const productsData = await productsRes.json();
      setPromotions(Array.isArray(promotionsData) ? promotionsData : []);
      setAdApplications(Array.isArray(adApplicationsData) ? adApplicationsData : []);
      const parsedPromo = Array.isArray(promoData)
        ? (promoData as Array<Partial<PromoCarouselItem>>).map((raw) => {
            const createdAt = raw.createdAt ? new Date(raw.createdAt as any) : new Date(0);
            const updatedAt = raw.updatedAt ? new Date(raw.updatedAt as any) : createdAt;
            const sortOrder = typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0;
            return {
              id: String(raw.id ?? ""),
              productId: String(raw.productId ?? ""),
              bannerUrl: String(raw.bannerUrl ?? ""),
              sortOrder,
              source: (raw.source as any) ?? "admin",
              adApplicationId: raw.adApplicationId ?? undefined,
              active: Boolean(raw.active ?? true),
              createdAt,
              updatedAt,
            } as PromoCarouselItem;
          })
        : [];
      setPromoItems(parsedPromo.filter((p) => p.id && p.productId && p.bannerUrl));
      setAllProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
      setError('Could not load promotions data.');
      setPromotions([]);
      setAdApplications([]);
      setPromoItems([]);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function deletePromotion(id: string) {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const response = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setPromotions(promotions.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete promotion:', error);
      alert('Failed to delete promotion.');
    }
  }

  function handleEdit(promotion: Promotion) {
    setEditingPromotion(promotion);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingPromotion(null);
    fetchPromotions();
  }

  async function updateAdApplicationStatus(id: string, status: 'approved' | 'rejected') {
    try {
      // If approved, force the admin to attach a banner + create a promo carousel item
      // so the home page carousel stays consistent (only promoted products show).
      if (status === "approved") {
        const app = adApplications.find((a) => a.id === id) ?? null;
        if (app) {
          let productId: string | null = app.productId ?? null;
          if (!productId && app.scope === "all") {
            const res = await fetch(`/api/vendor/products?vendorId=${encodeURIComponent(app.vendorId)}`);
            const data = await res.json();
            const vendorProducts = Array.isArray(data) ? (data as Product[]) : [];
            if (vendorProducts.length > 0) {
              productId = vendorProducts[Math.floor(Math.random() * vendorProducts.length)]?.id ?? null;
            }
          }
          if (!productId) {
            setError("This application can't be promoted yet: no product found for the vendor.");
            return;
          }
          setPromoFromApplication(app);
          setPromoDraft({
            productId,
            bannerUrl: "",
            active: true,
            sortOrder: promoItems.length,
            source: "vendor_application",
          });
          setShowPromoModal(true);
          return;
        }
      }

      const response = await fetch(`/api/ad-applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Could not update application');
      }

      fetchPromotions();
    } catch (error) {
      console.error('Failed to update ad application:', error);
    }
  }

  async function savePromoCarouselItem() {
    if (!promoDraft.productId || !promoDraft.bannerUrl) return;
    setPromoSaving(true);
    try {
      const isEdit = Boolean(editingPromoItemId);
      const url = isEdit ? `/api/promoted-products/${editingPromoItemId}` : "/api/promoted-products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: promoDraft.productId,
          bannerUrl: promoDraft.bannerUrl,
          source: promoDraft.source,
          active: promoDraft.active,
          sortOrder: promoDraft.sortOrder,
          adApplicationId: promoFromApplication?.id ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");

      if (promoFromApplication) {
        await fetch(`/api/ad-applications/${promoFromApplication.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
      }

      setShowPromoModal(false);
      setEditingPromoItemId(null);
      setPromoFromApplication(null);
      setPromoDraft({ productId: "", bannerUrl: "", active: true, sortOrder: 0, source: "admin" });
      await fetchPromotions();
    } catch {
      setError("Failed to save promo carousel item.");
    } finally {
      setPromoSaving(false);
    }
  }

  async function deletePromoItem(id: string) {
    if (!confirm("Remove this promoted banner?")) return;
    try {
      const res = await fetch(`/api/promoted-products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setPromoItems((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to delete promoted banner.");
    }
  }

  async function persistPromoOrder(next: PromoCarouselItem[]) {
    setPromoItems(next);
    try {
      await Promise.all(
        next.map((item, idx) =>
          fetch(`/api/promoted-products/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: idx }),
          }),
        ),
      );
      // Refresh to get canonical order from server.
      await fetchPromotions();
    } catch {
      setError("Failed to persist promo ordering.");
      await fetchPromotions();
    }
  }

  if (loading) {
    return <div className="p-8">Loading promotions...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Promotions & Discounts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
          <Plus className="w-5 h-5" />
          Add Promotion
        </button>
      </div>
      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <PromotionForm
          promotion={editingPromotion}
          onClose={handleFormClose}
        />
      )}

      {showPromoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg bg-card max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
              <h2 className="text-xl font-bold text-foreground">
                {promoFromApplication
                  ? "Create promo banner (vendor application)"
                  : editingPromoItemId
                    ? "Edit promo banner"
                    : "Add promo banner"}
              </h2>
              <button
                onClick={() => {
                  if (promoSaving) return;
                  setShowPromoModal(false);
                  setEditingPromoItemId(null);
                  setPromoFromApplication(null);
                  setPromoDraft({ productId: "", bannerUrl: "", active: true, sortOrder: 0, source: "admin" });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Product</label>
                <select
                  disabled={Boolean(promoFromApplication)}
                  value={promoDraft.productId}
                  onChange={(e) => setPromoDraft((p) => ({ ...p, productId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70 disabled:opacity-60"
                >
                  <option value="">Select a product…</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Banner image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPromoDraft((p) => ({ ...p, bannerUrl: "" }));
                    try {
                      const url = await uploadPromotionBanner(file);
                      setPromoDraft((p) => ({ ...p, bannerUrl: url }));
                    } catch {
                      setError("Banner upload failed.");
                    } finally {
                      e.target.value = "";
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground"
                />
                {promoDraft.bannerUrl ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted/30">
                    <img src={promoDraft.bannerUrl} alt="Promo banner preview" className="h-40 w-full object-cover" />
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  This banner image is what shoppers see in the home Promotion carousel (not the product image).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="promoActive"
                  checked={promoDraft.active}
                  onChange={(e) => setPromoDraft((p) => ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="promoActive" className="text-sm font-medium text-foreground">
                  Active
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Priority</label>
                <input
                  type="number"
                  min={0}
                  value={promoDraft.sortOrder}
                  onChange={(e) => setPromoDraft((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Lower numbers appear first. You can also drag banners in the list to reorder.
                </p>
              </div>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t border-border bg-card px-4 sm:px-6 pt-4 pb-4">
                <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={promoSaving || !promoDraft.productId || !promoDraft.bannerUrl}
                  onClick={() => void savePromoCarouselItem()}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {promoSaving ? "Saving..." : editingPromoItemId ? "Save changes" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={promoSaving}
                  onClick={() => {
                    setShowPromoModal(false);
                    setEditingPromoItemId(null);
                    setPromoFromApplication(null);
                    setPromoDraft({ productId: "", bannerUrl: "", active: true, sortOrder: 0, source: "admin" });
                  }}
                  className="text-muted-foreground hover:text-foreground transition disabled:opacity-60"
                >
                  Cancel
                </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Promotion Carousel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only products added here will appear in the home page Promotion carousel, using the uploaded banner image.
            </p>
          </div>
          <button
            onClick={() => {
              setPromoFromApplication(null);
              setEditingPromoItemId(null);
              setPromoDraft({ productId: "", bannerUrl: "", active: true, sortOrder: promoItems.length, source: "admin" });
              setShowPromoModal(true);
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add banner
          </button>
        </div>

        {promoItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No promoted products yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {promoItemsSorted.map((item) => {
              const product = allProducts.find((p) => p.id === item.productId);
              return (
                <div
                  key={item.id}
                  className={`overflow-hidden rounded-lg border border-border bg-background ${
                    dragPromoId === item.id ? "ring-2 ring-primary/60" : ""
                  }`}
                  draggable
                  onDragStart={() => setDragPromoId(item.id)}
                  onDragEnd={() => setDragPromoId(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!dragPromoId || dragPromoId === item.id) return;
                    const current = promoItemsSorted;
                    const fromIdx = current.findIndex((x) => x.id === dragPromoId);
                    const toIdx = current.findIndex((x) => x.id === item.id);
                    if (fromIdx === -1 || toIdx === -1) return;
                    const next = [...current];
                    const [moved] = next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, moved);
                    void persistPromoOrder(next);
                  }}
                  title="Drag to reorder"
                >
                  <div className="h-28 w-full bg-muted/30">
                    <img src={item.bannerUrl} alt={product?.name ?? "Promo banner"} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{product?.name ?? item.productId}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Priority: {item.sortOrder ?? 0}
                        </p>
                      </div>
                      <span className="cursor-grab select-none rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                        Drag
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Source: {item.source.replace("_", " ")} • {item.active ? "Active" : "Inactive"}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPromoItemId(item.id);
                          setPromoFromApplication(null);
                          setPromoDraft({
                            productId: item.productId,
                            bannerUrl: item.bannerUrl,
                            active: item.active,
                            sortOrder: item.sortOrder ?? 0,
                            source: item.source,
                          });
                          setShowPromoModal(true);
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => void deletePromoItem(item.id)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Vendor Ad Applications</h2>
        </div>

        <div className="space-y-3">
          {adApplications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ad applications yet.</p>
          ) : (
            adApplications.map((application) => (
              <div key={application.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      Vendor #{application.vendorId} - {application.scope === 'all' ? 'All products ad request' : `Single product ad request (${application.productName || application.productId})`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Submitted {new Date(application.createdAt).toLocaleString()}
                    </p>
                    {application.message && (
                      <p className="mt-2 text-sm text-muted-foreground">{application.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      application.status === 'approved'
                        ? 'bg-primary/10 text-primary'
                        : application.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {application.status}
                    </span>
                    {application.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateAdApplicationStatus(application.id, 'approved')}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateAdApplicationStatus(application.id, 'rejected')}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {promotions.map((promotion) => (
          <div key={promotion.id} className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Tag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{promotion.code}</h3>
                  <p className="text-sm text-muted-foreground">{promotion.description}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                promotion.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {promotion.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-2 mb-4 pb-4 border-b border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-foreground">
                  {promotion.discountType === 'percentage' ? `${promotion.discountValue}%` : `UGX ${promotion.discountValue}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-medium text-foreground">{promotion.currentUses} / {promotion.maxUses}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valid Until</span>
                <span className="font-medium text-foreground">{new Date(promotion.validUntil).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(promotion)}
                className="flex-1 text-primary hover:text-primary/80 transition flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => deletePromotion(promotion.id)}
                className="flex-1 text-destructive hover:text-destructive/90 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
