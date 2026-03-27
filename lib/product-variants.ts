import type {
  Product,
  ProductVariant,
  ProductVariantOption,
  ProductVariantOptionValue,
} from "@/lib/db";

export function newVariantId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatVariantLabel(
  options: ProductVariantOption[],
  selections: Record<string, string>,
): string {
  const parts: string[] = [];
  for (const opt of options) {
    const vid = selections[opt.id];
    if (!vid) continue;
    const val = opt.values.find((v) => v.id === vid);
    if (val?.label) parts.push(val.label);
  }
  return parts.join(" · ");
}

export function parseVariantOptions(value: unknown): ProductVariantOption[] {
  if (!Array.isArray(value)) return [];
  const out: ProductVariantOption[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newVariantId();
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const valuesRaw = o.values;
    const values: ProductVariantOptionValue[] = [];
    if (Array.isArray(valuesRaw)) {
      for (const vr of valuesRaw) {
        if (!vr || typeof vr !== "object") continue;
        const vo = vr as Record<string, unknown>;
        const vid = typeof vo.id === "string" && vo.id.trim() ? vo.id.trim() : newVariantId();
        const label = typeof vo.label === "string" ? vo.label.trim() : "";
        if (!label) continue;
        values.push({ id: vid, label: label.slice(0, 120) });
      }
    }
    if (!name || values.length === 0) continue;
    out.push({ id, name: name.slice(0, 120), values });
  }
  return out;
}

function parseSelectionsObject(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k.trim()) continue;
    if (typeof v === "string" && v.trim()) out[k.trim()] = v.trim();
  }
  return out;
}

/** Parse variants row; behaviour depends on whether the product uses variant option axes. */
export function parseProductVariantsRow(
  value: unknown,
  variantOptions: ProductVariantOption[],
): ProductVariant[] {
  if (!Array.isArray(value)) return [];
  const out: ProductVariant[] = [];
  const multi = variantOptions.length > 0;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newVariantId();
    const price = Math.max(0, Number(o.price));
    if (!Number.isFinite(price)) continue;

    const selections = parseSelectionsObject(o.selections);

    if (multi) {
      let valid = true;
      for (const opt of variantOptions) {
        const vid = selections[opt.id];
        if (!vid || !opt.values.some((v) => v.id === vid)) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      const label = formatVariantLabel(variantOptions, selections);
      out.push({ id, label, selections, price });
    } else {
      const label = typeof o.label === "string" ? o.label.trim() : "";
      if (!label) continue;
      out.push({ id, label, selections: {}, price });
    }
  }
  return out;
}

/** @deprecated Use parseProductVariantsRow with options from the row. */
export function parseProductVariants(value: unknown): ProductVariant[] {
  return parseProductVariantsRow(value, []);
}

export function aggregateVariantList(variants: ProductVariant[]): { price: number } {
  if (variants.length === 0) return { price: 0 };
  const price = Math.min(...variants.map((v) => v.price));
  return { price };
}

/** Min/max variant prices; falls back to product.price when there are no variants. */
export function getVariantPriceBounds(product: Pick<Product, "price" | "variants">): {
  min: number;
  max: number;
} {
  const list = product.variants ?? [];
  if (list.length === 0) {
    const p = Number(product.price) || 0;
    return { min: p, max: p };
  }
  const prices = list.map((v) => Math.max(0, Number(v.price) || 0));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Single-line label for grids (e.g. “UGX 10.00 – 25.00” when variants differ). */
export function formatProductPriceLabel(product: Pick<Product, "price" | "variants">): string {
  const { min, max } = getVariantPriceBounds(product);
  if (!(product.variants?.length ?? 0)) {
    return `UGX ${min.toFixed(0)}`;
  }
  if (min === max) {
    return `UGX ${min.toFixed(0)}`;
  }
  return `UGX ${min.toFixed(0)} – ${max.toFixed(0)}`;
}

/** Cartesian product of option value ids (only options that have ≥1 value). */
export function cartesianSelections(options: ProductVariantOption[]): Record<string, string>[] {
  const valid = options.filter((o) => o.values.length > 0);
  if (valid.length === 0) return [];
  let acc: Record<string, string>[] = [{}];
  for (const opt of valid) {
    const next: Record<string, string>[] = [];
    for (const row of acc) {
      for (const v of opt.values) {
        next.push({ ...row, [opt.id]: v.id });
      }
    }
    acc = next;
  }
  return acc;
}

export function variantHasCompleteSelections(
  v: ProductVariant,
  variantOptions: ProductVariantOption[],
): boolean {
  if (variantOptions.length === 0) return v.label.trim().length > 0;
  for (const opt of variantOptions) {
    const vid = v.selections[opt.id];
    if (!vid || !opt.values.some((val) => val.id === vid)) return false;
  }
  return true;
}

export function findVariantForSelections(
  variants: ProductVariant[],
  options: ProductVariantOption[],
  sel: Record<string, string>,
): ProductVariant | null {
  if (options.length === 0 || variants.length === 0) return null;
  for (const opt of options) {
    if (!sel[opt.id]) return null;
  }
  return (
    variants.find((v) => options.every((opt) => v.selections[opt.id] === sel[opt.id])) ?? null
  );
}
