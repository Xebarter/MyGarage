import { randomUUID } from "crypto";

import {
  MOBILE_APP_BUCKET,
  MOBILE_APP_MAX_BYTES,
  MOBILE_APP_MIME_TYPES,
  MOBILE_APP_SIGNED_URL_SECONDS,
  appFileExtension,
  type MobileAppAudience,
  type MobileAppPlatform,
  type MobileAppRelease,
} from "@/lib/mobile-apps";
import { createAdminClient } from "@/lib/supabase/admin";

type MobileAppReleaseRow = {
  audience: MobileAppAudience;
  platform: MobileAppPlatform | null;
  storage_path: string;
  file_name: string;
  file_size: number | string;
  version_label: string | null;
  notes: string | null;
  updated_at: string;
};

function mapRow(row: MobileAppReleaseRow): MobileAppRelease {
  return {
    audience: row.audience,
    platform: row.platform === "ios" ? "ios" : "android",
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileSize: Number(row.file_size) || 0,
    versionLabel: row.version_label ?? "",
    notes: row.notes ?? "",
    updatedAt: row.updated_at,
  };
}

export function buildMobileAppStoragePath(audience: MobileAppAudience, platform: MobileAppPlatform): string {
  return `${audience}/${platform}/${Date.now()}-${randomUUID()}.${appFileExtension(platform)}`;
}

export async function listMobileAppReleases(): Promise<MobileAppRelease[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("mobile_app_releases").select("*");
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as MobileAppReleaseRow));
}

export async function getMobileAppRelease(
  audience: MobileAppAudience,
  platform: MobileAppPlatform,
): Promise<MobileAppRelease | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mobile_app_releases")
    .select("*")
    .eq("audience", audience)
    .eq("platform", platform)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as MobileAppReleaseRow) : null;
}

export async function listAudienceMobileAppReleases(audience: MobileAppAudience): Promise<MobileAppRelease[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("mobile_app_releases").select("*").eq("audience", audience);
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as MobileAppReleaseRow));
}

export async function ensureMobileAppBucketLimit(): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.updateBucket(MOBILE_APP_BUCKET, {
    public: false,
    fileSizeLimit: MOBILE_APP_MAX_BYTES,
    allowedMimeTypes: [...MOBILE_APP_MIME_TYPES],
  });
  if (!error) return;

  const message = error.message || "Could not update the upload limit.";
  if (/global|maximum allowed size|payload too large|entity too large/i.test(message)) {
    throw new Error(
      "Supabase is still capping uploads below 75 MB. Open Storage settings in the Supabase dashboard and set the global file size limit to 75 MB, then try again.",
    );
  }
  throw error;
}

export async function createMobileAppUploadTarget(storagePath: string): Promise<{ path: string; token: string }> {
  const supabase = createAdminClient();
  await ensureMobileAppBucketLimit();
  const { data, error } = await supabase.storage.from(MOBILE_APP_BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data?.token) {
    throw error ?? new Error("Could not prepare the upload.");
  }
  return { path: storagePath, token: data.token };
}

export async function createMobileAppDownloadUrl(storagePath: string, fileName: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MOBILE_APP_BUCKET)
    .createSignedUrl(storagePath, MOBILE_APP_SIGNED_URL_SECONDS, { download: fileName });
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Could not create a download link.");
  }
  return data.signedUrl;
}

export async function mobileAppObjectExists(storagePath: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(MOBILE_APP_BUCKET)
    .createSignedUrl(storagePath, 60);
  return !error && Boolean(data?.signedUrl);
}

export async function removeMobileAppObject(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(MOBILE_APP_BUCKET).remove([storagePath]);
  if (error) throw error;
}

export async function upsertMobileAppRelease(input: {
  audience: MobileAppAudience;
  platform: MobileAppPlatform;
  storagePath: string;
  fileName: string;
  fileSize: number;
  versionLabel: string;
  notes: string;
  updatedBy: string | null;
}): Promise<MobileAppRelease> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mobile_app_releases")
    .upsert(
      {
        audience: input.audience,
        platform: input.platform,
        storage_path: input.storagePath,
        file_name: input.fileName,
        file_size: input.fileSize,
        version_label: input.versionLabel,
        notes: input.notes,
        updated_by: input.updatedBy,
      },
      { onConflict: "audience,platform" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as MobileAppReleaseRow);
}

export async function deleteMobileAppRelease(
  audience: MobileAppAudience,
  platform: MobileAppPlatform,
): Promise<MobileAppRelease | null> {
  const existing = await getMobileAppRelease(audience, platform);
  if (!existing) return null;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("mobile_app_releases")
    .delete()
    .eq("audience", audience)
    .eq("platform", platform);
  if (error) throw error;
  return existing;
}
