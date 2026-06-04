import { NextResponse } from "next/server";

import { readFirebaseConfigFromProcessEnv } from "@/lib/firebase/env";

/** Public Firebase web config from server env (safe to expose; apiKey is not a secret). */
export async function GET() {
  const config = readFirebaseConfigFromProcessEnv();
  if (!config) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({ configured: true, config });
}
