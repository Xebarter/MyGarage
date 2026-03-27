import { createAdminClient } from "@/lib/supabase/admin";

export const LISTING_IMAGES_BUCKET = "listing-images";

/** Public object URL path segment used by Supabase Storage. */
const PUBLIC_OBJECT_MARKER = `/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/`;

/**
 * Returns the storage object path inside `listing-images` for a public URL, or null if not ours.
 */
export function pathFromListingImagePublicUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const t = url.trim();
  if (!t || t === "/products/default.jpg") return null;

  const idx = t.indexOf(PUBLIC_OBJECT_MARKER);
  if (idx === -1) return null;

  const rest = t.slice(idx + PUBLIC_OBJECT_MARKER.length);
  const path = rest.split("?")[0]?.split("#")[0];
  if (!path || path.includes("..")) return null;

  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

function collectListingPaths(image: string | undefined, images: string[] | undefined): string[] {
  const paths: string[] = [];
  for (const url of [image, ...(images ?? [])]) {
    const p = pathFromListingImagePublicUrl(url);
    if (p) paths.push(p);
  }
  return [...new Set(paths)];
}

/** Removes uploaded listing images for this product (best-effort; logs errors). */
export async function removeListingImagesForProductFields(image: string | undefined, images: string[] | undefined): Promise<void> {
  const paths = collectListingPaths(image, images);
  if (paths.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);
  if (error) {
    console.error("[listing-images] remove failed:", error.message, paths);
  }
}
