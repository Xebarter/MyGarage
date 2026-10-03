import { NextResponse } from "next/server";

import { isMobileAppAudience, type MobileAppAudience } from "@/lib/mobile-apps";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMobileAppDownloadUrl, getMobileAppRelease } from "@/lib/supabase/mobile-apps-repo";
import { createClient } from "@/lib/supabase/server";

async function requireVerifiedAudience(audience: Exclude<MobileAppAudience, "public">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .select("vendor_verified, services_verified")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;

  const allowed = audience === "vendor" ? data?.vendor_verified === true : data?.services_verified === true;
  if (!allowed) {
    return NextResponse.json({ error: "Verification required" }, { status: 403 });
  }
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ audience: string }> }) {
  try {
    const { audience: rawAudience } = await params;
    const audience = String(rawAudience ?? "");
    if (!isMobileAppAudience(audience)) {
      return NextResponse.json({ error: "Unknown app." }, { status: 404 });
    }

    if (audience !== "public") {
      const denied = await requireVerifiedAudience(audience);
      if (denied) return denied;
    }

    const release = await getMobileAppRelease(audience);
    if (!release) {
      return NextResponse.json({ error: "No app uploaded" }, { status: 404 });
    }

    const downloadUrl = await createMobileAppDownloadUrl(release.storagePath, release.fileName);
    return NextResponse.json({
      audience: release.audience,
      fileName: release.fileName,
      fileSize: release.fileSize,
      versionLabel: release.versionLabel,
      notes: release.notes,
      updatedAt: release.updatedAt,
      downloadUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Could not prepare the download.";
    if (/schema cache|does not exist|mobile_app_releases/i.test(message)) {
      return NextResponse.json({ error: "No app uploaded" }, { status: 404 });
    }
    console.error("App download failed:", message);
    return NextResponse.json({ error: "Could not prepare the download." }, { status: 500 });
  }
}
