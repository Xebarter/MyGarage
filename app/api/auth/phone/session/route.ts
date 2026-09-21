import { NextRequest, NextResponse } from "next/server";

import { phoneFromFirebaseIdToken } from "@/lib/auth/firebase-phone-token";
import { mintSupabaseSessionForPhone } from "@/lib/auth/phone-session";

/** Exchange a Firebase phone ID token for a MyGarage (Supabase) session. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const idToken = typeof body?.idToken === "string" ? body.idToken.trim() : "";
    if (!idToken || idToken.length > 16_384) {
      return NextResponse.json({ error: "Missing phone verification." }, { status: 400 });
    }

    const phone = await phoneFromFirebaseIdToken(idToken);
    const session = await mintSupabaseSessionForPhone(phone);
    return NextResponse.json({ phone, ...session });
  } catch (error) {
    console.error("[phone-session]", error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message.trim() : "";
    const safe =
      message && message.length < 180 && !/json|stack|sql/i.test(message)
        ? message
        : "Could not complete phone sign-in.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
