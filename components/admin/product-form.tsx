"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Package,
  Tag,
  Coins,
  Layers2,
  Store,
  Sparkles,
  FileText,
  ChevronRight,
  ImagePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant, ProductVariantOption, Vendor } from "@/lib/db";
import {
  decodeCatalogPick,
  encodeCatalogPick,
  findCatalogPickMatch,
  getCatalogPicksForDepartment,
  getDepartmentTitles,
} from "@/data/sidebar-categories";
import {
  aggregateVariantList,
  cartesianSelections,
  formatVariantLabel,
  newVariantId,
  variantHasCompleteSelections,
} from "@/lib/product-variants";
import { ListingImageField } from "@/components/listing-image-field";
import { uploadListingImage } from "@/lib/upload-listing-image";

const DEFAULT_PRODUCT_IMAGE = "/products/default.jpg";
const MAX_GALLERY_IMAGES = 8;

type GalleryUploadItem = {
  id: string;
  previewUrl: string;
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

const selectTriggerClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none",
  "focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
);

interface ProductFormContentProps {
  product?: Product | null;
  onDismiss: () => void;
  onSaved: () => void;
  vendorId?: string;
}

const navItems = [
  { id: "pf-vendor", label: "Vendor" },
  { id: "pf-details", label: "Product details" },
  { id: "pf-pricing", label: "Pricing" },
  { id: "pf-variants", label: "Variants" },
  { id: "pf-visibility", label: "Visibility" },
] as const;

function ProductFormContent({ product, onDismiss, onSaved, vendorId }: ProductFormContentProps) {
  const isVendorFlow = Boolean(vendorId);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    subcategory: "",
    brand: "",
    featured: false,
    vendorId: "",
    image: DEFAULT_PRODUCT_IMAGE,
    images: [] as string[],
  });
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryUploads, setGalleryUploads] = useState<GalleryUploadItem[]>([]);
  const [catalogDepartment, setCatalogDepartment] = useState("");
  const [catalogPickValue, setCatalogPickValue] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [pickFilter, setPickFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [variantOptions, setVariantOptions] = useState<ProductVariantOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const departmentTitles = useMemo(() => getDepartmentTitles(), []);

  const departmentPicks = useMemo(
    () => (catalogDepartment ? getCatalogPicksForDepartment(catalogDepartment) : []),
    [catalogDepartment],
  );

  const filteredDepartmentPicks = useMemo(() => {
    const q = pickFilter.trim().toLowerCase();
    if (!q) return departmentPicks;
    return departmentPicks.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q),
    );
  }, [departmentPicks, pickFilter]);

  useEffect(() => {
    const matchedPick = product
      ? findCatalogPickMatch(product.category ?? "", product.subcategory ?? "")
      : null;
    const legacyCustom =
      Boolean(product?.category?.trim()) && Boolean(product) && matchedPick === null;

    setUseCustomCategory(legacyCustom);
    setPickFilter("");
    if (matchedPick) {
      setCatalogDepartment(matchedPick.department);
      setCatalogPickValue(encodeCatalogPick(matchedPick));
    } else {
      setCatalogDepartment("");
      setCatalogPickValue("");
    }

    const primary =
      product?.image?.trim() && product.image.trim().length > 0
        ? product.image.trim()
        : DEFAULT_PRODUCT_IMAGE;
    const extra = Array.isArray(product?.images)
      ? product.images.filter((u) => typeof u === "string" && u.trim().length > 0)
      : [];

    setFormData({
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      category: product?.category?.trim() ?? "",
      subcategory: product?.subcategory?.trim() ?? "",
      brand: product?.brand ?? "",
      featured: product?.featured ?? false,
      vendorId: product?.vendorId ?? vendorId ?? "",
      image: primary,
      images: extra.filter((u) => u !== primary),
    });
    setGalleryError(null);
    let nextVariantOptions: ProductVariantOption[] = product?.variantOptions?.length
      ? product.variantOptions.map((o) => ({
          ...o,
          values: o.values.map((v) => ({ ...v })),
        }))
      : [];
    let nextVariants: ProductVariant[] = product?.variants?.length
      ? product.variants.map((v) => ({
          ...v,
          selections: v.selections ? { ...v.selections } : {},
        }))
      : [];

    if (nextVariants.length > 0 && nextVariantOptions.length === 0) {
      const axisId = newVariantId();
      const values = nextVariants.map((v) => ({
        id: newVariantId(),
        label: v.label.trim() || "Option",
      }));
      nextVariantOptions = [{ id: axisId, name: "Option", values }];
      nextVariants = nextVariants.map((v, i) => {
        const valueId = values[i].id;
        const sel = { [axisId]: valueId };
        return {
          ...v,
          selections: sel,
          label: formatVariantLabel(nextVariantOptions, sel),
        };
      });
    }

    if (nextVariantOptions.length > 1) {
      const first = {
        ...nextVariantOptions[0],
        values: nextVariantOptions[0].values.map((val) => ({ ...val })),
      };
      nextVariantOptions = [first];
      const seen = new Set<string>();
      const collapsed: ProductVariant[] = [];
      for (const v of nextVariants) {
        const vid = v.selections[first.id];
        if (typeof vid !== "string" || !first.values.some((val) => val.id === vid)) continue;
        const sel = { [first.id]: vid };
        const key = JSON.stringify(sel);
        if (seen.has(key)) continue;
        seen.add(key);
        collapsed.push({
          ...v,
          selections: sel,
          label: formatVariantLabel([first], sel),
        });
      }
      nextVariants = collapsed;
    }

    setVariantOptions(nextVariantOptions);
    setVariants(nextVariants);
    setFormError(null);
  }, [product, vendorId]);

  const workingOptions = useMemo((): ProductVariantOption[] => {
    return variantOptions
      .map((opt, oi) => ({
        id: (opt.id || "").trim() || `opt-${oi}`,
        name: opt.name.trim(),
        values: opt.values
          .filter((vv) => vv.label.trim())
          .map((vv, vi) => ({
            id: (vv.id || "").trim() || `opt-${oi}-v-${vi}`,
            label: vv.label.trim().slice(0, 120),
          })),
      }))
      .filter((o) => o.name.length > 0 && o.values.length > 0);
  }, [variantOptions]);

  useEffect(() => {
    if (workingOptions.length === 0) {
      setVariants((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    const combos = cartesianSelections(workingOptions);
    const defaultPrice = Math.max(0, Number(formData.price) || 0);

    setVariants((prev) => {
      const byKey = new Map<string, ProductVariant>();
      for (const v of prev) {
        const sel: Record<string, string> = {};
        let complete = true;
        for (const o of workingOptions) {
          const vid = v.selections[o.id];
          if (!vid) {
            complete = false;
            break;
          }
          sel[o.id] = vid;
        }
        if (!complete) continue;
        byKey.set(JSON.stringify(sel), v);
      }

      return combos.map((sel) => {
        const key = JSON.stringify(sel);
        const existing = byKey.get(key);
        if (existing) {
          return {
            ...existing,
            label: formatVariantLabel(workingOptions, sel),
            selections: { ...sel },
          };
        }
        return {
          id: newVariantId(),
          label: formatVariantLabel(workingOptions, sel),
          selections: { ...sel },
          price: defaultPrice,
        };
      });
    });
  }, [workingOptions, formData.price]);

  useEffect(() => {
    if (isVendorFlow) return;

    let active = true;
    async function fetchVendors() {
      setVendorsLoading(true);
      try {
        const response = await fetch("/api/vendors");
        if (!response.ok) throw new Error("Failed to load vendors");
        const data = (await response.json()) as Vendor[];
        if (!active) return;
        setVendors(data);
        if (!product) {
          setFormData((prev) => ({
            ...prev,
            vendorId: prev.vendorId || data[0]?.id || "",
          }));
        }
      } catch (error) {
        console.error("Failed to fetch vendors for product form:", error);
        if (active) setVendors([]);
      } finally {
        if (active) setVendorsLoading(false);
      }
    }

    void fetchVendors();
    return () => {
      active = false;
    };
  }, [isVendorFlow, product]);

  const selectedVendorId = useMemo(
    () => (isVendorFlow ? (vendorId ?? "") : formData.vendorId),
    [formData.vendorId, isVendorFlow, vendorId],
  );
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!isVendorFlow && !selectedVendorId) missing.push("Vendor");
    if (!formData.name.trim()) missing.push("Product name");
    if (!formData.brand.trim()) missing.push("Brand");
    if (!formData.description.trim()) missing.push("Description");
    if (!useCustomCategory) {
      if (!catalogDepartment.trim()) missing.push("Department");
      if (!catalogPickValue.trim()) missing.push("Part type");
    } else if (!formData.category.trim()) {
      missing.push("Category");
    }
    return missing;
  }, [
    formData.brand,
    formData.category,
    formData.description,
    formData.name,
    isVendorFlow,
    selectedVendorId,
    useCustomCategory,
    catalogDepartment,
    catalogPickValue,
  ]);
  const canSubmit = missingFields.length === 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const url = product
        ? isVendorFlow
          ? `/api/vendor/products/${product.id}`
          : `/api/products/${product.id}`
        : isVendorFlow
          ? "/api/vendor/products"
          : "/api/products";
      const method = product ? "PUT" : "POST";
      const normOptions: ProductVariantOption[] = variantOptions
        .map((opt) => ({
          id: (opt.id || "").trim() || newVariantId(),
          name: opt.name.trim().slice(0, 120),
          values: opt.values
            .filter((vv) => vv.label.trim())
            .map((vv) => ({
              id: (vv.id || "").trim() || newVariantId(),
              label: vv.label.trim().slice(0, 120),
            })),
        }))
        .filter((o) => o.name.length > 0 && o.values.length > 0)
        .slice(0, 1);

      let normalizedVariants: ProductVariant[];

      if (normOptions.length > 0) {
        const seenSel = new Set<string>();
        normalizedVariants = [];
        for (const v of variants) {
          if (!variantHasCompleteSelections({ ...v, selections: v.selections || {} }, normOptions)) continue;
          const selections: Record<string, string> = {};
          for (const opt of normOptions) {
            selections[opt.id] = v.selections[opt.id];
          }
          const key = JSON.stringify(selections);
          if (seenSel.has(key)) continue;
          seenSel.add(key);
          normalizedVariants.push({
            id: v.id?.trim() || newVariantId(),
            label: formatVariantLabel(normOptions, selections),
            selections,
            price: Math.max(0, Number(v.price) || 0),
          });
        }
      } else {
        normalizedVariants = variants
          .filter((v) => v.label.trim().length > 0)
          .map((v) => ({
            id: v.id?.trim() || newVariantId(),
            label: v.label.trim(),
            selections: {} as Record<string, string>,
            price: Math.max(0, Number(v.price) || 0),
          }));
      }

      let price = formData.price;
      if (normalizedVariants.length > 0) {
        const agg = aggregateVariantList(normalizedVariants);
        price = agg.price;
      }

      const primaryImage = formData.image?.trim() || DEFAULT_PRODUCT_IMAGE;
      const galleryImages = (formData.images ?? [])
        .map((u) => String(u).trim())
        .filter(
          (u) =>
            u.length > 0 && u !== primaryImage && u !== DEFAULT_PRODUCT_IMAGE,
        );

      const payload = {
        ...formData,
        price,
        variantOptions: normOptions,
        variants: normalizedVariants,
        vendorId: selectedVendorId,
        image: primaryImage,
        images: galleryImages,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Could not save product.";
        try {
          const errBody = (await response.json()) as { error?: string };
          if (errBody.error) message = errBody.error;
        } catch {
          /* ignore */
        }
        setFormError(message);
        return;
      }

      onSaved();
      onDismiss();
    } catch (error) {
      console.error("Failed to save product:", error);
      setFormError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const visibleNav = navItems.filter((item) => {
    if (item.id === "pf-vendor" && isVendorFlow) return false;
    return true;
  });

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[min(92vh,880px)] min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="shrink-0 border-b border-border bg-gradient-to-b from-muted/40 to-background px-6 pb-4 pt-5 sm:px-8 sm:pb-5 sm:pt-6 pr-14">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                {product
                  ? isVendorFlow
                    ? "Edit your product"
                    : "Edit product listing"
                  : isVendorFlow
                    ? "Create a product listing"
                    : "Create new product listing"}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                {variants.length > 0 ? (
                  <Badge variant="secondary" className="font-normal">
                    {variants.length} variant{variants.length === 1 ? "" : "s"}
                  </Badge>
                ) : null}
                <Badge variant={product ? "outline" : "default"} className="font-normal">
                  {isVendorFlow ? "Vendor" : "Admin"}
                </Badge>
              </div>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              {isVendorFlow
                ? "Create a clear, buyer-ready listing with accurate details, pricing, and optional variants for different options."
                : "Manage catalog-ready listings with seller assignment, category alignment, pricing, and optional variants."}
            </DialogDescription>
            <p className="text-xs text-muted-foreground">
              Required fields are marked automatically; complete core product details before publishing.
            </p>
          </DialogHeader>
          <nav
            className="mt-4 flex flex-wrap gap-1 border-t border-border/60 pt-4"
            aria-label="Form sections"
          >
            {visibleNav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
                <ChevronRight className="hidden h-3 w-3 opacity-50 sm:inline" aria-hidden />
              </a>
            ))}
          </nav>
        </div>
        <div className="space-y-5 px-6 py-5 sm:px-8">
        {!isVendorFlow && (
          <section id="pf-vendor" className="scroll-mt-4">
            <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
              <CardHeader className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Store className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base">Vendor</CardTitle>
                    <CardDescription>Storefront listing is attributed to this seller.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-5 py-4 sm:px-6">
                <Label htmlFor="product-vendor">Seller</Label>
                <select
                  id="product-vendor"
                  required
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className={selectTriggerClass}
                  disabled={vendorsLoading}
                >
                  <option value="">{vendorsLoading ? "Loading vendors…" : "Select a vendor"}</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  This controls which vendor owns the listing and receives orders.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        <section id="pf-details" className="scroll-mt-4">
          <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Product details</CardTitle>
                  <CardDescription>
                    Photos, name, brand, catalog placement (shop sidebar and search), and description.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="product-name">Product name</Label>
                <Input
                  id="product-name"
                  required
                  autoFocus
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Bosch oil filter OF-321"
                  className="text-base sm:text-sm"
                />
              </div>

              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/5 p-4 sm:p-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Primary image</Label>
                  <p className="text-xs text-muted-foreground">
                    Shown on the storefront, cart, and search. Files are stored in your listing-images bucket.
                  </p>
                  <ListingImageField
                    value={formData.image}
                    onChange={(url) =>
                      setFormData((prev) => ({
                        ...prev,
                        image: url,
                        images: prev.images.filter((u) => u !== url),
                      }))
                    }
                    disabled={loading}
                    mode="product"
                  />
                </div>

                <div className="space-y-2 border-t border-border/60 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-sm font-medium">More photos (optional)</Label>
                    <span className="text-xs text-muted-foreground">
                      {formData.images.length}/{MAX_GALLERY_IMAGES}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Extra angles or packaging — JPEG, PNG, WebP, or GIF, up to 5&nbsp;MB each.
                  </p>
                  <input
                    ref={galleryFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    disabled={loading || galleryUploading || formData.images.length >= MAX_GALLERY_IMAGES}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      void (async () => {
                        if (files.length === 0 || loading) return;
                        setGalleryError(null);
                        const remaining = Math.max(0, MAX_GALLERY_IMAGES - formData.images.length);
                        if (remaining <= 0) {
                          setGalleryError(`At most ${MAX_GALLERY_IMAGES} extra photos.`);
                          return;
                        }
                        const selected = files
                          .filter((f) => f && f.type.startsWith("image/"))
                          .slice(0, remaining);
                        if (selected.length === 0) {
                          setGalleryError("Choose an image file.");
                          return;
                        }
                        if (selected.length < files.length) {
                          setGalleryError(`Some files were skipped (limit ${MAX_GALLERY_IMAGES} images).`);
                        }
                        setGalleryUploading(true);
                        try {
                          const queue: { file: File; item: GalleryUploadItem }[] = selected.map((file) => {
                            const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                            return {
                              file,
                              item: {
                                id,
                                previewUrl: URL.createObjectURL(file),
                                fileName: file.name,
                                progress: 0,
                                status: "uploading",
                              },
                            };
                          });

                          setGalleryUploads((prev) => [...queue.map((q) => q.item), ...prev]);

                          const concurrency = 3;
                          let idx = 0;
                          const workers = new Array(concurrency).fill(0).map(async () => {
                            while (idx < queue.length) {
                              const current = queue[idx++];
                              try {
                                const url = await uploadListingImage(current.file, {
                                  onProgress: (p) =>
                                    setGalleryUploads((prev) =>
                                      prev.map((u) =>
                                        u.id === current.item.id ? { ...u, progress: p.percent } : u,
                                      ),
                                    ),
                                });

                                setGalleryUploads((prev) =>
                                  prev.map((u) =>
                                    u.id === current.item.id ? { ...u, progress: 100, status: "done" } : u,
                                  ),
                                );

                                const primary = formData.image?.trim() || DEFAULT_PRODUCT_IMAGE;
                                setFormData((prev) => {
                                  if (prev.images.includes(url) || url === primary) return prev;
                                  return {
                                    ...prev,
                                    images: [...prev.images, url].slice(0, MAX_GALLERY_IMAGES),
                                  };
                                });

                                window.setTimeout(() => {
                                  setGalleryUploads((prev) => {
                                    const target = prev.find((u) => u.id === current.item.id);
                                    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
                                    return prev.filter((u) => u.id !== current.item.id);
                                  });
                                }, 1200);
                              } catch (err) {
                                const message = err instanceof Error ? err.message : "Upload failed";
                                setGalleryUploads((prev) =>
                                  prev.map((u) =>
                                    u.id === current.item.id
                                      ? { ...u, status: "error", error: message }
                                      : u,
                                  ),
                                );
                              }
                            }
                          });

                          await Promise.all(workers);
                        } catch (err) {
                          setGalleryError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setGalleryUploading(false);
                        }
                      })();
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      disabled={
                        loading ||
                        galleryUploading ||
                        formData.images.length >= MAX_GALLERY_IMAGES
                      }
                      onClick={() => galleryFileInputRef.current?.click()}
                    >
                      {galleryUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <ImagePlus className="h-4 w-4" aria-hidden />
                      )}
                      Add photo
                    </Button>
                  </div>
                  {formData.images.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {formData.images.map((url) => (
                        <li
                          key={url}
                          className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted/20"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- remote URLs */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            className="absolute right-0.5 top-0.5 rounded-md bg-background/90 p-1 shadow-sm opacity-0 transition group-hover:opacity-100"
                            title="Remove photo"
                            disabled={loading || galleryUploading}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                images: prev.images.filter((u) => u !== url),
                              }))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {galleryUploads.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {galleryUploads.map((u) => (
                        <li
                          key={u.id}
                          className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted/20"
                          title={u.fileName}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                          <img src={u.previewUrl} alt="" className="h-full w-full object-cover opacity-80" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/55">
                            {u.status === "uploading" ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden />
                                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                                  {Math.min(100, Math.max(0, u.progress))}%
                                </span>
                              </>
                            ) : u.status === "done" ? (
                              <div className="rounded-full bg-emerald-600/15 p-1.5">
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-6 w-6 text-emerald-600"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              </div>
                            ) : (
                              <span className="px-2 text-center text-[10px] font-medium text-destructive">
                                Failed
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {galleryError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {galleryError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-brand">Brand</Label>
                  <Input
                    id="product-brand"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Manufacturer"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Label className="flex items-center gap-1.5 text-base font-medium">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    Category & sub-area
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      if (useCustomCategory) {
                        setUseCustomCategory(false);
                        const m = findCatalogPickMatch(formData.category, formData.subcategory);
                        if (m) {
                          setCatalogDepartment(m.department);
                          setCatalogPickValue(encodeCatalogPick(m));
                        } else {
                          setCatalogDepartment("");
                          setCatalogPickValue("");
                        }
                        setPickFilter("");
                      } else {
                        setUseCustomCategory(true);
                        setCatalogPickValue("");
                        setCatalogDepartment("");
                        setPickFilter("");
                      }
                    }}
                  >
                    {useCustomCategory ? "Use catalog picker" : "Custom names instead"}
                  </Button>
                </div>

                {useCustomCategory ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="product-category-custom">Category (storefront)</Label>
                      <Input
                        id="product-category-custom"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g. Oil Filters"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="product-subcategory-custom">Sub-area / group (recommended)</Label>
                      <Input
                        id="product-subcategory-custom"
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        placeholder="e.g. FILTERS & FLUIDS or Oil System"
                      />
                      <p className="text-xs text-muted-foreground">
                        Helps buyers and filters when the exact sidebar label is not in the catalog.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="product-department">1. Department</Label>
                        <select
                          id="product-department"
                          required
                          value={catalogDepartment}
                          onChange={(e) => {
                            const d = e.target.value;
                            setCatalogDepartment(d);
                            setCatalogPickValue("");
                            setFormData((prev) => ({ ...prev, category: "", subcategory: "" }));
                            setPickFilter("");
                          }}
                          className={selectTriggerClass}
                        >
                          <option value="">Choose an area…</option>
                          {departmentTitles.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="part-type-filter">Narrow the list</Label>
                        <Input
                          id="part-type-filter"
                          value={pickFilter}
                          onChange={(e) => setPickFilter(e.target.value)}
                          placeholder="Type to filter…"
                          disabled={!catalogDepartment}
                          aria-describedby="part-type-filter-hint"
                        />
                        <p id="part-type-filter-hint" className="text-xs text-muted-foreground">
                          Optional. Filters part types under the department you picked.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-part-type">2. Part type (sets category &amp; sub-area)</Label>
                      <select
                        id="product-part-type"
                        required
                        value={catalogPickValue}
                        disabled={!catalogDepartment}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setCatalogPickValue(raw);
                          const decoded = decodeCatalogPick(raw);
                          if (!decoded) return;
                          setFormData((prev) => ({
                            ...prev,
                            category: decoded.category,
                            subcategory: decoded.subcategory,
                          }));
                        }}
                        className={selectTriggerClass}
                      >
                        <option value="">
                          {catalogDepartment ? "Choose the closest catalog match…" : "Select a department first"}
                        </option>
                        {filteredDepartmentPicks.map((p) => (
                          <option key={`${p.department}-${encodeCatalogPick(p)}`} value={encodeCatalogPick(p)}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {catalogDepartment && filteredDepartmentPicks.length === 0 ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          No part types match that filter. Clear the filter box or pick another department.
                        </p>
                      ) : null}
                      {formData.category ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Listing category:</span> {formData.category}
                          {formData.subcategory ? (
                            <>
                              {" "}
                              · <span className="font-medium text-foreground">Sub-area:</span> {formData.subcategory}
                            </>
                          ) : null}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Matches the public parts menu so buyers land on your product when they browse or use category
                          links.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-description" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  Description
                </Label>
                <Textarea
                  id="product-description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe compatibility, key specs, warranty, and what is included in the box."
                  className="min-h-[100px] resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="pf-pricing" className="scroll-mt-4">
          <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Coins className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Pricing</CardTitle>
                  <CardDescription>
                    Base price when the product has no options below. With options, each combination uses its own price.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:max-w-xl sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-price">Base price (UGX)</Label>
                  <Input
                    id="product-price"
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    className="input-no-spin"
                    value={Number.isNaN(formData.price) ? "" : formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for simple listings or as the default price for new variant combinations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="pf-variants" className="scroll-mt-4">
          <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <CardTitle className="text-base">Variants & pricing</CardTitle>
                    <CardDescription className="max-w-xl">
                      Optional. Each product allows <strong>one variant type</strong> (e.g. size or volume). Set each
                      value&apos;s label and price together in one place.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {variantOptions.length > 0 ? (
                    <Badge variant="outline" className="font-normal">
                      Variant type
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 px-5 py-5 sm:px-6">
              <div className="rounded-xl border border-dashed border-border bg-muted/15 p-4 sm:p-5">
                <p className="text-sm font-medium text-foreground">Variant type</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One type per product (e.g. &quot;Size&quot;). Each row is one choice buyers see—use the same price on
                  every row or change any row individually.
                </p>
                <div className="mt-4 space-y-3">
                  {variantOptions.length === 0 ? (
                    <p className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 text-xs text-muted-foreground">
                      No variant type yet—add one to sell this product in multiple configurations. Leave empty to use only
                      the base price above.
                    </p>
                  ) : null}
                  {variantOptions.map((opt, optIndex) => {
                    const resolvedOptionId = (opt.id || "").trim() || `opt-${optIndex}`;
                    const typeNamed = Boolean(opt.name.trim());
                    return (
                      <div
                        key={opt.id}
                        className="rounded-lg border border-border bg-background p-4 shadow-xs transition-shadow hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="min-w-[160px] flex-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">Type name</Label>
                            <Input
                              placeholder="e.g. Volume, Size"
                              value={opt.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setVariantOptions((prev) =>
                                  prev.map((o, i) => (i === optIndex ? { ...o, name } : o)),
                                );
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setVariantOptions((prev) => prev.filter((_, i) => i !== optIndex));
                            }}
                          >
                            Remove type
                          </Button>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Label className="text-xs text-muted-foreground">Values shoppers pick</Label>
                            {typeNamed && opt.values.some((v) => v.label.trim()) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 shrink-0 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  const base = Math.max(0, Number(formData.price) || 0);
                                  setVariants((prev) => {
                                    const next: ProductVariant[] = [];
                                    for (const vv of opt.values) {
                                      if (!vv.label.trim()) continue;
                                      const ex = prev.find((r) => r.selections[resolvedOptionId] === vv.id);
                                      next.push(
                                        ex
                                          ? { ...ex, price: base }
                                          : {
                                              id: newVariantId(),
                                              label: vv.label.trim().slice(0, 120),
                                              selections: { [resolvedOptionId]: vv.id },
                                              price: base,
                                            },
                                      );
                                    }
                                    return next;
                                  });
                                }}
                              >
                                Set all prices to base price
                              </Button>
                            ) : null}
                          </div>
                          <div className="mt-1 rounded-lg border border-border/70 bg-muted/10">
                            <div
                              className={cn(
                                "hidden gap-2 border-b border-border/60 bg-muted/25 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid",
                                "sm:grid-cols-[minmax(0,1fr)_6.5rem_2.25rem]",
                              )}
                            >
                              <span>Label</span>
                              <span>UGX</span>
                              <span className="sr-only">Remove</span>
                            </div>
                            <ul className="divide-y divide-border/60">
                              {opt.values.map((val, vi) => {
                                const labeled = Boolean(val.label.trim());
                                const ready = typeNamed && labeled;
                                const variantRow = ready
                                  ? variants.find((r) => r.selections[resolvedOptionId] === val.id)
                                  : undefined;
                                const displayPrice = variantRow
                                  ? variantRow.price
                                  : Math.max(0, Number(formData.price) || 0);
                                const patchVariant = (patch: { price?: number }) => {
                                  if (!ready) return;
                                  const labelText = val.label.trim().slice(0, 120);
                                  setVariants((prev) => {
                                    const idx = prev.findIndex((r) => r.selections[resolvedOptionId] === val.id);
                                    const nextPrice =
                                      patch.price !== undefined ? patch.price : idx >= 0 ? prev[idx].price : displayPrice;
                                    const row: ProductVariant = {
                                      id: idx >= 0 ? prev[idx].id : newVariantId(),
                                      label: labelText,
                                      selections: { [resolvedOptionId]: val.id },
                                      price: Math.max(0, Number(nextPrice) || 0),
                                    };
                                    if (idx >= 0) {
                                      return prev.map((r, j) => (j === idx ? row : r));
                                    }
                                    return [...prev, row];
                                  });
                                };

                                return (
                                  <li key={val.id}>
                                    <div
                                      className={cn(
                                        "flex flex-col gap-2 p-3 sm:grid sm:items-center sm:gap-2 sm:py-2",
                                        "sm:grid-cols-[minmax(0,1fr)_6.5rem_2.25rem]",
                                      )}
                                    >
                                      <div className="space-y-1 sm:space-y-0">
                                        <Label className="text-xs text-muted-foreground sm:sr-only">Label</Label>
                                        <Input
                                          placeholder="e.g. 4L, Large"
                                          value={val.label}
                                          onChange={(e) => {
                                            const label = e.target.value;
                                            setVariantOptions((prev) =>
                                              prev.map((o, i) =>
                                                i === optIndex
                                                  ? {
                                                      ...o,
                                                      values: o.values.map((vv, j) =>
                                                        j === vi ? { ...vv, label } : vv,
                                                      ),
                                                    }
                                                  : o,
                                              ),
                                            );
                                          }}
                                          className="h-9"
                                        />
                                      </div>
                                      <div className="space-y-1 sm:space-y-0">
                                        <Label className="text-xs text-muted-foreground sm:sr-only">Price (UGX)</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          className={cn("input-no-spin h-9", !ready && "opacity-50")}
                                          disabled={!ready}
                                          title={!ready ? "Add a type name and label first" : undefined}
                                          value={ready ? (Number.isNaN(displayPrice) ? "" : displayPrice) : ""}
                                          placeholder={!ready ? "—" : undefined}
                                          onChange={(e) => {
                                            const price = parseFloat(e.target.value) || 0;
                                            patchVariant({ price });
                                          }}
                                        />
                                      </div>
                                      <div className="flex justify-end sm:justify-center">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                          aria-label="Remove value"
                                          onClick={() =>
                                            setVariantOptions((prev) =>
                                              prev.map((o, i) =>
                                                i === optIndex
                                                  ? { ...o, values: o.values.filter((_, j) => j !== vi) }
                                                  : o,
                                              ),
                                            )
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-2 h-8"
                            onClick={() =>
                              setVariantOptions((prev) =>
                                prev.map((o, i) =>
                                  i === optIndex
                                    ? {
                                        ...o,
                                        values: [...o.values, { id: newVariantId(), label: "" }],
                                      }
                                    : o,
                                ),
                              )
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add value
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {variantOptions.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() =>
                      setVariantOptions([
                        { id: newVariantId(), name: "", values: [{ id: newVariantId(), label: "" }] },
                      ])
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add variant type
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="pf-visibility" className="scroll-mt-4 pb-1">
          <Card className="overflow-hidden border-border/80 py-0 shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-base">Visibility</CardTitle>
                  <CardDescription>Homepage placement and featuring.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
                <Checkbox
                  id="product-featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, featured: checked === true })
                  }
                  disabled={(isVendorFlow && product?.featured) || loading}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="product-featured" className="cursor-pointer text-sm font-medium leading-snug">
                    {isVendorFlow ? "Request homepage feature" : "Feature on homepage"}
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isVendorFlow
                      ? "Admins approve featuring; existing featured items stay until changed."
                      : "Highlight this listing in featured zones when appropriate."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        </div>
      </div>

      {formError ? (
        <div
          className="shrink-0 border-t border-destructive/20 bg-destructive/5 px-6 py-3 sm:px-8"
          role="alert"
        >
          <p className="text-sm text-destructive">{formError}</p>
        </div>
      ) : null}
      {missingFields.length > 0 ? (
        <div className="shrink-0 border-t border-amber-300/30 bg-amber-50/80 px-6 py-2.5 text-xs text-amber-900 sm:px-8">
          Complete required fields: {missingFields.join(", ")}.
        </div>
      ) : null}

      <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/25 px-6 py-4 sm:px-8 sm:py-4">
        <Button type="button" variant="outline" onClick={onDismiss} disabled={loading} className="min-w-[5rem]">
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit} className="min-w-[9rem] gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : product ? (
            "Save changes"
          ) : (
            "Save and publish"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
  vendorId?: string;
}

export function ProductFormDialog({ open, onOpenChange, product, onSuccess, vendorId }: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92vh,880px)] w-[calc(100%-1.25rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl p-0 shadow-xl",
          "sm:max-w-4xl sm:w-full",
        )}
        showCloseButton
      >
        <ProductFormContent
          product={product}
          onDismiss={() => onOpenChange(false)}
          onSaved={onSuccess}
          vendorId={vendorId}
        />
      </DialogContent>
    </Dialog>
  );
}
