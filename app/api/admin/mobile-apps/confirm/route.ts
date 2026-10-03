import { NextRequest, NextResponse } from "next/server";

import {
  cleanApkFileName,
  cleanReleaseNotes,
  cleanVersionLabel,
  isMobileAppAudience,
  isOwnedStoragePath,
  validateApkUpload,
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
      storagePath?: string;
      fileName?: string;
      fileSize?: number;
      versionLabel?: string;
      notes?: string;
    } | null;

    const audience = String(body?.audience ?? "");
    if (!isMobileAppAudience(audience)) {
      return NextResponse.json({ error: "Choose a public, supplier, or service provider app." }, { status: 400 });
    }

    const storagePath = String(body?.storagePath ?? "");
    if (!isOwnedStoragePath(audience, storagePath)) {
      return NextResponse.json({ error: "That upload is not valid for this app." }, { status: 400 });
    }

    const fileName = cleanApkFileName(String(body?.fileName ?? ""));
    const fileSize = Number(body?.fileSize);
    const invalid = validateApkUpload(fileName, "application/vnd.android.package-archive", fileSize);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const uploaded = await mobileAppObjectExists(storagePath);
    if (!uploaded) {
      return NextResponse.json({ error: "The APK did not finish uploading. Try again." }, { status: 400 });
    }

    const previous = await getMobileAppRelease(audience);
    const release = await upsertMobileAppRelease({
      audience,
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
        console.error("Could not remove the previous APK", error);
      }
    }

    const downloadUrl = await createMobileAppDownloadUrl(release.storagePath, release.fileName);
    return NextResponse.json({
      release: {
        audience: release.audience,
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
