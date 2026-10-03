import { NextResponse } from "next/server";

import {
  MOBILE_APP_AUDIENCES,
  MOBILE_APP_PLATFORMS,
  type MobileAppAudience,
  type MobileAppPlatform,
  type MobileAppRelease,
} from "@/lib/mobile-apps";
import { createMobileAppDownloadUrl, listMobileAppReleases } from "@/lib/supabase/mobile-apps-repo";

import { mobileAppErrorResponse, requireAdmin } from "./shared";

async function withDownloadUrl(release: MobileAppRelease) {
  let downloadUrl: string | null = null;
  try {
    downloadUrl = await createMobileAppDownloadUrl(release.storagePath, release.fileName);
  } catch (error) {
    console.error("Admin app download link failed", error);
  }
  return {
    audience: release.audience,
    platform: release.platform,
    fileName: release.fileName,
    fileSize: release.fileSize,
    versionLabel: release.versionLabel,
    notes: release.notes,
    updatedAt: release.updatedAt,
    downloadUrl,
  };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const releases = await listMobileAppReleases();
    const byKey = new Map(releases.map((release) => [`${release.audience}:${release.platform}`, release]));
    const payload = {} as Record<MobileAppAudience, Record<MobileAppPlatform, Awaited<ReturnType<typeof withDownloadUrl>> | null>>;

    await Promise.all(
      MOBILE_APP_AUDIENCES.map(async (audience: MobileAppAudience) => {
        const slots = {} as Record<MobileAppPlatform, Awaited<ReturnType<typeof withDownloadUrl>> | null>;
        await Promise.all(
          MOBILE_APP_PLATFORMS.map(async (platform) => {
            const release = byKey.get(`${audience}:${platform}`);
            slots[platform] = release ? await withDownloadUrl(release) : null;
          }),
        );
        payload[audience] = slots;
      }),
    );

    return NextResponse.json({ releases: payload });
  } catch (error) {
    return mobileAppErrorResponse(error, "Could not load app uploads.");
  }
}
