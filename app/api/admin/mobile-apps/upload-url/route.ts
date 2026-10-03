import { NextRequest, NextResponse } from "next/server";

import { appContentType, isMobileAppAudience, isMobileAppPlatform, validateAppUpload } from "@/lib/mobile-apps";
import { buildMobileAppStoragePath, createMobileAppUploadTarget } from "@/lib/supabase/mobile-apps-repo";

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
      fileName?: string;
      fileSize?: number;
      contentType?: string;
    } | null;

    const audience = String(body?.audience ?? "");
    const platform = String(body?.platform ?? "android");
    if (!isMobileAppAudience(audience)) {
      return NextResponse.json({ error: "Choose a public, supplier, or service provider app." }, { status: 400 });
    }
    if (!isMobileAppPlatform(platform)) {
      return NextResponse.json({ error: "Choose Android or iOS." }, { status: 400 });
    }

    const fileName = String(body?.fileName ?? "");
    const fileSize = Number(body?.fileSize);
    const contentType = String(body?.contentType ?? "");
    const invalid = validateAppUpload(platform, fileName, contentType, fileSize);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const storagePath = buildMobileAppStoragePath(audience, platform);
    const target = await createMobileAppUploadTarget(storagePath);
    return NextResponse.json({
      path: target.path,
      token: target.token,
      contentType: appContentType(platform, contentType),
    });
  } catch (error) {
    return mobileAppErrorResponse(error, "Could not start the upload.");
  }
}
