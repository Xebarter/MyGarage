import { NextResponse } from "next/server";

import { isMobileAppAudience, isMobileAppPlatform } from "@/lib/mobile-apps";
import { deleteMobileAppRelease, removeMobileAppObject } from "@/lib/supabase/mobile-apps-repo";

import { mobileAppErrorResponse, requireAdmin } from "../shared";

export async function DELETE(_req: Request, { params }: { params: Promise<{ audience: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { audience: rawAudience } = await params;
    const audience = String(rawAudience ?? "");
    const platform = new URL(_req.url).searchParams.get("platform") ?? "android";
    if (!isMobileAppAudience(audience)) {
      return NextResponse.json({ error: "Unknown app." }, { status: 400 });
    }
    if (!isMobileAppPlatform(platform)) {
      return NextResponse.json({ error: "Choose Android or iOS." }, { status: 400 });
    }

    const removed = await deleteMobileAppRelease(audience, platform);
    if (!removed) {
      return NextResponse.json({ ok: true });
    }

    try {
      await removeMobileAppObject(removed.storagePath);
    } catch (error) {
      console.error("Could not remove the app file", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileAppErrorResponse(error, "Could not remove the app.");
  }
}
