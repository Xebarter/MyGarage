import { NextResponse } from "next/server";

import {
  MOBILE_APP_AUDIENCES,
  type MobileAppAudience,
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
    const byAudience = new Map(releases.map((release) => [release.audience, release]));
    const items = await Promise.all(
      MOBILE_APP_AUDIENCES.map(async (audience: MobileAppAudience) => {
        const release = byAudience.get(audience);
        return release ? withDownloadUrl(release) : null;
      }),
    );

    return NextResponse.json({
      releases: {
        public: items[0],
        vendor: items[1],
        services: items[2],
      },
    });
  } catch (error) {
    return mobileAppErrorResponse(error, "Could not load app uploads.");
  }
}
