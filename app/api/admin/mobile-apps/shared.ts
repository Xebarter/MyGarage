import { NextResponse } from "next/server";

import { userHasAdminAccess } from "@/lib/auth-admin";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !userHasAdminAccess(user)) return null;
  return user;
}

export function mobileAppErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  const missingTable = /mobile_app_releases|schema cache|does not exist/i.test(message);
  const missingBucket = /bucket not found/i.test(message);
  if (missingTable || missingBucket) {
    return NextResponse.json(
      { error: "Apply migration 056_mobile_app_releases.sql in Supabase, then try again." },
      { status: 503 },
    );
  }
  console.error(fallback, message);
  if (/capping uploads below 75 MB|global file size limit|maximum allowed size/i.test(message)) {
    return NextResponse.json(
      {
        error:
          "Supabase is capping uploads below 75 MB. In the Supabase dashboard, open Storage → Settings and set the global file size limit to 75 MB, then try again.",
      },
      { status: 413 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
