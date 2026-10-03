import { NextRequest, NextResponse } from "next/server";

import {
  cleanAppFileName,
  cleanReleaseNotes,
  cleanVersionLabel,
  isMobileAppAudience,
  isMobileAppPlatform,
  isOwnedStoragePath,
  validateAppUpload,
} from "@/lib/mobile-apps";
import {
  createMobileAppDownloadUrl,
  getMobileAppRelease,
  mobileAppObjectExists,
  removeMobileAppObject,
  upsertMobileAppRelease,
} from "@/lib/supabase/mobile-apps-repo";

import { mobileAppErrorResponse, requireAdmin } from "../shared";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as {
      audience?: string;
      platform?: string;
      storagePath?: string;
      fileName?: string;
      fileSize?: number;
      versionLabel?: string;
      notes?: string;
    } | null;

    const audience = String(body?.audience ?? "");
    const platform = String(body?.platform ?? "android");
    if (!isMobileAppAudience(audience)) {
      return NextResponse.json({ error: "Choose a public, supplier, or service provider app." }, { status: 400 });
    }
    if (!isMobileAppPlatform(platform)) {
      return NextResponse.json({ error: "Choose Android or iOS." }, { status: 400 });
    }

    const storagePath = String(body?.storagePath ?? "");
    if (!isOwnedStoragePath(audience, platform, storagePath)) {
      return NextResponse.json({ error: "That upload is not valid for this app." }, { status: 400 });
    }

    const fileName = cleanAppFileName(String(body?.fileName ?? ""), platform);
    const fileSize = Number(body?.fileSize);
    const invalid = validateAppUpload(platform, fileName, "", fileSize);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const uploaded = await mobileAppObjectExists(storagePath);
    if (!uploaded) {
      return NextResponse.json({ error: "The file did not finish uploading. Try again." }, { status: 400 });
    }

    const previous = await getMobileAppRelease(audience, platform);
    const release = await upsertMobileAppRelease({
      audience,
      platform,
      storagePath,
      fileName,
      fileSize,
      versionLabel: cleanVersionLabel(body?.versionLabel),
      notes: cleanReleaseNotes(body?.notes),
      updatedBy: admin.id,
    });

    if (previous && previous.storagePath !== release.storagePath) {
      try {
        await removeMobileAppObject(previous.storagePath);
      } catch (error) {
        console.error("Could not remove the previous app file", error);
      }
    }

    const downloadUrl = await createMobileAppDownloadUrl(release.storagePath, release.fileName);
    return NextResponse.json({
      release: {
        audience: release.audience,
        platform: release.platform,
        fileName: release.fileName,
        fileSize: release.fileSize,
        versionLabel: release.versionLabel,
        notes: release.notes,
        updatedAt: release.updatedAt,
        downloadUrl,
      },
    });
  } catch (error) {
    return mobileAppErrorResponse(error, "Could not save the app upload.");
  }
}
